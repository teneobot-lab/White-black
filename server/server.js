
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
    await conn.query('SET SESSION sort_buffer_size = 1048576'); 

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

// ITEMS ENDPOINTS
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

router.post('/items/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    for (const d of items) {
      await pool.query(
        'INSERT INTO items (id, sku, name, category, price, location, min_level, current_stock, unit, status, conversion_rate, secondary_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), price=VALUES(price)',
        [d.id || generateId(), d.sku, d.name, d.category, d.price || 0, d.location || '-', d.min_level || 0, d.current_stock || 0, d.unit || 'pcs', d.status || 'Active', d.conversion_rate || 1, d.secondary_unit || '']
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// REJECT ENDPOINTS
router.post('/reject/master', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'INSERT INTO reject_master (id, sku, name, baseUnit, unit2, ratio2, unit3, ratio3, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [d.id || generateId(), d.sku, d.name, d.baseUnit, d.unit2 || null, d.ratio2 || null, d.unit3 || null, d.ratio3 || null, new Date()]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reject/master/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    for (const d of items) {
      await pool.query(
        'INSERT INTO reject_master (id, sku, name, baseUnit, unit2, ratio2, unit3, ratio3, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.id || generateId(), d.sku, d.name, d.baseUnit, d.unit2 || null, d.ratio2 || null, d.unit3 || null, d.ratio3 || null, new Date()]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reject/logs', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'INSERT INTO reject_logs (id, date, items, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
      [d.id || generateId(), d.date, JSON.stringify(d.items), d.notes, new Date()]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/reject/logs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reject_logs WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// TRANSACTIONS ENDPOINT
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
      const adjustment = item.type === 'Inbound' ? Number(item.quantity) : -Number(item.quantity);
      await conn.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adjustment, item.id]);
    }
    
    await conn.commit();
    res.json({ success: true, id: trxId });
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
