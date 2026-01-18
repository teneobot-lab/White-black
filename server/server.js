
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Konfigurasi Pool Koneksi
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'jupiter_wms',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * HELPER: Memastikan data JSON selalu berupa ARRAY.
 * Sangat penting karena mysql2 mengembalikan data berbeda-beda tergantung tipe kolom.
 */
const safeParse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch (e) {
      console.error("Gagal parsing string ke JSON:", e.message);
      return [];
    }
  }
  if (typeof data === 'object') return [data];
  return [];
};

const router = express.Router();

// --- 1. SYNC ENDPOINT (Jantung dari aplikasi) ---
router.get('/sync', async (req, res) => {
  try {
    const [itemsRows] = await pool.query('SELECT * FROM items');
    // Ambil limit lebih banyak untuk history agar terlihat semua
    const [transactionsRows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 500');
    const [rejectMasterRows] = await pool.query('SELECT * FROM reject_master');
    const [rejectLogsRows] = await pool.query('SELECT * FROM reject_logs ORDER BY timestamp DESC');
    
    // Normalisasi data sebelum dikirim agar Frontend tidak perlu menebak-nebak
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
    console.error('API Sync Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- 2. ITEMS MANAGEMENT ---
router.post('/items', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || generateId();
    await pool.query(
      'INSERT INTO items (id, sku, name, category, price, location, min_level, current_stock, unit, status, conversion_rate, secondary_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, d.sku, d.name, d.category, d.price || 0, d.location || '-', d.minLevel || 0, d.currentStock || 0, d.unit || 'pcs', d.status || 'Active', d.conversionRate || 1, d.secondaryUnit || '']
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
    if (!ids || ids.length === 0) return res.json({ success: true });
    await pool.query('DELETE FROM items WHERE id IN (?)', [ids]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. TRANSACTIONS MANAGEMENT (Logic Inbound/Outbound) ---
router.post('/transactions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { trx, items_update } = req.body;
    const trxId = generateId();
    const trxDate = trx.date ? new Date(trx.date) : new Date();
    
    // Simpan Transaksi (Items dikonversi ke String JSON)
    await conn.query(
      'INSERT INTO transactions (id, transactionId, type, date, items, supplierName, poNumber, riNumber, sjNumber, totalItems, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trxId, trx.transactionId || `TRX-${Date.now()}`, trx.type, trxDate, JSON.stringify(trx.items), trx.supplierName, trx.poNumber, trx.riNumber, trx.sjNumber, trx.items.reduce((a, b) => a + (Number(b.quantity) || 0), 0), JSON.stringify(trx.photos || [])]
    );
    
    // Update Stok di Tabel Items
    for (const item of items_update) {
      const adjustment = item.type === 'Inbound' ? item.quantity : -item.quantity;
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adjustment, item.id]);
    }
    
    await conn.commit();
    res.json({ success: true, id: trxId });
  } catch (err) {
    await conn.rollback();
    console.error("Proses Transaksi Gagal:", err);
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
    
    // 1. Revert Stok Lama
    for (const item of oldItems) {
      const revertAdj = oldTrx.type === 'Inbound' ? -(item.quantity || 0) : (item.quantity || 0);
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [revertAdj, item.itemId]);
    }

    const newTrx = req.body;
    const totalItems = (newTrx.items || []).reduce((a, b) => a + (Number(b.quantity) || 0), 0);
    
    // 2. Update Data Transaksi
    await conn.query(
      'UPDATE transactions SET date=?, items=?, supplierName=?, poNumber=?, riNumber=?, sjNumber=?, totalItems=?, photos=? WHERE id=?',
      [new Date(newTrx.date), JSON.stringify(newTrx.items), newTrx.supplierName, newTrx.poNumber, newTrx.riNumber, newTrx.sjNumber, totalItems, JSON.stringify(newTrx.photos || []), req.params.id]
    );

    // 3. Apply Stok Baru
    for (const item of (newTrx.items || [])) {
      const applyAdj = oldTrx.type === 'Inbound' ? (item.quantity || 0) : -(item.quantity || 0);
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [applyAdj, item.itemId]);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
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

// --- 4. REJECT MODULE LOGS ---
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

// --- 5. SYSTEM ADMIN ---
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

// Root Health Check
app.get('/', (req, res) => {
  res.json({ status: "Jupiter Backend is Online", time: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Jupiter Server Berjalan di Port ${PORT}`);
});
