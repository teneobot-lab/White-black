
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

// --- API ROUTES WITH /api PREFIX ---
const router = express.Router();

router.get('/sync', async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items');
    const [transactions] = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 200');
    const [rejectMaster] = await pool.query('SELECT * FROM reject_master');
    const [rejectLogs] = await pool.query('SELECT * FROM reject_logs ORDER BY timestamp DESC');
    res.json({ items, transactions, rejectMaster, rejectLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || generateId();
    await pool.query(
      'INSERT INTO items (id, sku, name, category, price, location, min_level, current_stock, unit, status, conversion_rate, secondary_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, d.sku, d.name, d.category, d.price, d.location, d.minLevel || 0, d.currentStock || 0, d.unit, d.status, d.conversionRate || 1, d.secondaryUnit || '']
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'UPDATE items SET sku=?, name=?, category=?, price=?, location=?, min_level=?, current_stock=?, unit=?, status=?, conversion_rate=?, secondary_unit=? WHERE id=?',
      [d.sku, d.name, d.category, d.price, d.location, d.min_level, d.current_stock, d.unit, d.status, d.conversionRate, d.secondaryUnit, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, message: 'No IDs provided' });
    }
    await pool.query('DELETE FROM items WHERE id IN (?)', [ids]);
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { trx, items_update } = req.body;
    const trxId = generateId();
    // Gunakan tanggal dari client jika ada, jika tidak gunakan waktu sekarang
    const trxDate = trx.date ? new Date(trx.date) : new Date();
    
    await connection.query(
      'INSERT INTO transactions (id, transactionId, type, date, items, supplierName, poNumber, riNumber, sjNumber, totalItems, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trxId, trx.transactionId || `TRX-${Date.now()}`, trx.type, trxDate, JSON.stringify(trx.items), trx.supplierName, trx.poNumber, trx.riNumber, trx.sjNumber, trx.items.reduce((a, b) => a + b.quantity, 0), JSON.stringify(trx.photos || [])]
    );
    for (const item of items_update) {
      const adjustment = item.type === 'Inbound' ? item.quantity : -item.quantity;
      await connection.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adjustment, item.id]);
    }
    await connection.commit();
    res.json({ success: true, id: trxId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/transactions/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) throw new Error('Transaction not found');
    const trx = rows[0];
    const items = typeof trx.items === 'string' ? JSON.parse(trx.items) : trx.items;
    for (const item of items) {
      const adjustment = trx.type === 'Inbound' ? -item.quantity : item.quantity;
      await connection.query('UPDATE items SET current_stock = current_stock + ? WHERE id = ?', [adjustment, item.itemId]);
    }
    await connection.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.post('/reject-logs', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      'INSERT INTO reject_logs (id, date, items, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
      [d.id || generateId(), d.date, JSON.stringify(d.items), d.notes, new Date()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reject-master/sync', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { items } = req.body;
    await connection.query('DELETE FROM reject_master');
    if (items.length > 0) {
      const values = items.map(i => [i.id || generateId(), i.sku, i.name, i.baseUnit, i.unit2, i.ratio2, i.unit3, i.ratio3, new Date()]);
      await connection.query('INSERT INTO reject_master (id, sku, name, baseUnit, unit2, ratio2, unit3, ratio3, lastUpdated) VALUES ?', [values]);
    }
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/reset-database', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('TRUNCATE TABLE transactions');
    await connection.query('TRUNCATE TABLE items');
    await connection.query('TRUNCATE TABLE reject_logs');
    await connection.query('TRUNCATE TABLE reject_master');
    await connection.commit();
    res.json({ success: true, message: 'Database has been reset successfully.' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Pasang router ke prefix /api
app.use('/api', router);

// Health check untuk root (opsional)
app.get('/', (req, res) => res.send('Jupiter API is running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Jupiter Server Aktif di port ${PORT} dengan prefix /api`));
