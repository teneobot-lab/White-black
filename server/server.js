
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Konfigurasi Pool Koneksi
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'jupiter_wms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

const generateId = () => Math.random().toString(36).substr(2, 9);

const safeParse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch (e) { return []; }
  }
  if (typeof data === 'object') return [data];
  return [];
};

const router = express.Router();

router.get('/sync', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SET SESSION sort_buffer_size = 1048576'); // 1MB

    const [itemsRows] = await conn.query('SELECT * FROM items');
    const [transactionsRows] = await conn.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 150');
    const [rejectMasterRows] = await conn.query('SELECT * FROM reject_master');
    const [rejectLogsRows] = await conn.query('SELECT * FROM reject_logs ORDER BY timestamp DESC LIMIT 100');
    
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
    console.error('API Sync Error:', err.message);
    res.status(500).json({ error: "Gagal memuat data dari database: " + err.message });
  } finally {
    if (conn) conn.release();
  }
});

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

router.post('/transactions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { trx, items_update } = req.body;
    const trxId = generateId();
    const trxDate = trx.date ? new Date(trx.date) : new Date();
    
    await conn.query(
      'INSERT INTO transactions (id, transactionId, type, date, items, supplierName, poNumber, riNumber, sjNumber, totalItems, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trxId, trx.transactionId || `TRX-${Date.now()}`, trx.type, trxDate, JSON.stringify(trx.items), trx.supplierName, trx.poNumber, trx.riNumber, trx.sjNumber, trx.items.reduce((a, b) => a + (Number(b.quantity) || 0), 0), JSON.stringify(trx.photos || [])]
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
    
    for (const item of oldItems) {
      const revertAdj = oldTrx.type === 'Inbound' ? -(item.quantity || 0) : (item.quantity || 0);
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [revertAdj, item.itemId]);
    }

    const newTrx = req.body;
    const totalItems = (newTrx.items || []).reduce((a, b) => a + (Number(b.quantity) || 0), 0);
    
    await conn.query(
      'UPDATE transactions SET date=?, items=?, supplierName=?, poNumber=?, riNumber=?, sjNumber=?, totalItems=?, photos=? WHERE id=?',
      [new Date(newTrx.date), JSON.stringify(newTrx.items), newTrx.supplierName, newTrx.poNumber, newTrx.riNumber, newTrx.sjNumber, totalItems, JSON.stringify(newTrx.photos || []), req.params.id]
    );

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

app.use('/api', router);

// Health Check
app.get('/', (req, res) => res.json({ status: "Jupiter Backend Online", version: "1.2.3" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Jupiter Server Aktif di Port ${PORT}`));
