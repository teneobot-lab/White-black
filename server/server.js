
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'jupiter_wms',
  waitForConnections: true,
  connectionLimit: 10
});

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Helper: Memastikan data JSON selalu berupa Array sebelum dikirim ke frontend.
 * Berguna karena mysql2 terkadang mengembalikan JSON sebagai string tergantung versi driver/database.
 */
const safeParse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch (e) {
      return [];
    }
  }
  return typeof data === 'object' && data !== null ? [data] : [];
};

const router = express.Router();

// 1. HEALTH & SYNC (Crucial for History)
router.get('/sync', async (req, res) => {
  try {
    const [itemsRows] = await pool.query('SELECT * FROM items').catch(() => [[]]);
    const [transactionsRows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 300').catch(() => [[]]);
    const [rejectMasterRows] = await pool.query('SELECT * FROM reject_master').catch(() => [[]]);
    const [rejectLogsRows] = await pool.query('SELECT * FROM reject_logs ORDER BY timestamp DESC').catch(() => [[]]);
    
    // Normalisasi data transaksi agar frontend tidak crash saat memproses .items
    const normalizedTransactions = (transactionsRows || []).map(trx => ({
      ...trx,
      items: safeParse(trx.items),
      photos: safeParse(trx.photos)
    }));

    res.json({ 
      items: itemsRows || [], 
      transactions: normalizedTransactions, 
      rejectMaster: rejectMasterRows || [], 
      rejectLogs: (rejectLogsRows || []).map(l => ({ ...l, items: safeParse(l.items) }))
    });
  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. ITEMS CRUD
router.post('/items', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || generateId();
    await pool.query(
      'INSERT INTO items (id, sku, name, category, price, location, min_level, current_stock, unit, status, conversion_rate, secondary_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, d.sku, d.name, d.category, d.price, d.location, d.minLevel || 0, d.currentStock || 0, d.unit, d.status, d.conversionRate || 1, d.secondaryUnit || '']
    );
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/items/:id', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'UPDATE items SET sku=?, name=?, category=?, price=?, location=?, min_level=?, current_stock=?, unit=?, status=?, conversion_rate=?, secondary_unit=? WHERE id=?',
      [d.sku, d.name, d.category, d.price, d.location, d.min_level, d.current_stock, d.unit, d.status, d.conversionRate, d.secondaryUnit, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/items/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json({ success: true });
    await pool.query('DELETE FROM items WHERE id IN (?)', [ids]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. TRANSACTIONS MANAGEMENT
router.post('/transactions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { trx, items_update } = req.body;
    const trxId = generateId();
    const trxDate = trx.date ? new Date(trx.date) : new Date();
    
    await conn.query(
      'INSERT INTO transactions (id, transactionId, type, date, items, supplierName, poNumber, riNumber, sjNumber, totalItems, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trxId, trx.transactionId || `TRX-${Date.now()}`, trx.type, trxDate, JSON.stringify(trx.items), trx.supplierName, trx.poNumber, trx.riNumber, trx.sjNumber, trx.items.reduce((a, b) => a + b.quantity, 0), JSON.stringify(trx.photos || [])]
    );
    
    for (const item of items_update) {
      const adjustment = item.type === 'Inbound' ? item.quantity : -item.quantity;
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adjustment, item.id]);
    }
    
    await conn.commit();
    res.json({ success: true, id: trxId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

router.put('/transactions/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) throw new Error('Transaction not found');
    
    const oldTrx = rows[0];
    const oldItems = safeParse(oldTrx.items);
    
    // 1. REVERT STOK LAMA (Kembalikan ke kondisi sebelum transaksi ini terjadi)
    for (const item of oldItems) {
      const revertAdj = oldTrx.type === 'Inbound' ? -item.quantity : item.quantity;
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [revertAdj, item.itemId]);
    }

    const newTrxData = req.body;
    const totalItems = (newTrxData.items || []).reduce((a, b) => a + (Number(b.quantity) || 0), 0);
    
    // 2. UPDATE DATA TRANSAKSI
    await conn.query(
      'UPDATE transactions SET date=?, items=?, supplierName=?, poNumber=?, riNumber=?, sjNumber=?, totalItems=?, photos=? WHERE id=?',
      [new Date(newTrxData.date), JSON.stringify(newTrxData.items), newTrxData.supplierName, newTrxData.poNumber, newTrxData.riNumber, newTrxData.sjNumber, totalItems, JSON.stringify(newTrxData.photos || []), req.params.id]
    );

    // 3. APPLY STOK BARU
    for (const item of (newTrxData.items || [])) {
      const applyAdj = oldTrx.type === 'Inbound' ? item.quantity : -item.quantity;
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [applyAdj, item.itemId]);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Update Transaction Error:", err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

router.delete('/transactions/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) throw new Error('Transaction not found');
    
    const trx = rows[0];
    const items = safeParse(trx.items);
    
    // Kembalikan stok saat transaksi dihapus
    for (const item of items) {
      const adj = trx.type === 'Inbound' ? -item.quantity : item.quantity;
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adj, item.itemId]);
    }
    
    await conn.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// 4. REJECT MODULE
router.post('/reject-logs', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'INSERT INTO reject_logs (id, date, items, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
      [d.id || generateId(), d.date, JSON.stringify(d.items), d.notes, new Date()]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reject-master/sync', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { items } = req.body;
    await conn.query('DELETE FROM reject_master');
    if (items && items.length > 0) {
      const vals = items.map(i => [i.id || generateId(), i.sku, i.name, i.baseUnit, i.unit2, i.ratio2, i.unit3, i.ratio3, new Date()]);
      await conn.query('INSERT INTO reject_master (id, sku, name, baseUnit, unit2, ratio2, unit3, ratio3, lastUpdated) VALUES ?', [vals]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// 5. SYSTEM ADMIN
router.delete('/reset-database', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE transactions');
    await pool.query('TRUNCATE TABLE items');
    await pool.query('TRUNCATE TABLE reject_logs');
    await pool.query('TRUNCATE TABLE reject_master');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use('/api', router);

app.get('/', (req, res) => {
  res.send('Jupiter Warehouse Backend is Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Jupiter Server aktif di port ${PORT}`);
});
