import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Pool koneksi menggunakan 127.0.0.1
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'jupiter_wms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Sync Endpoint
app.get('/api/sync', async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items');
    const [transactions] = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 100');
    const [rejectMaster] = await pool.query('SELECT * FROM reject_master');
    const [rejectLogs] = await pool.query('SELECT * FROM reject_logs ORDER BY timestamp DESC');
    res.json({ items, transactions, rejectMaster, rejectLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Items
app.post('/api/items', async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || Math.random().toString(36).substr(2, 9);
    await pool.query(
      'INSERT INTO items (id, sku, name, category, price, location, min_level, current_stock, unit, status, conversion_rate, secondary_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.sku, data.name, data.category, data.price, data.location, data.min_level, data.current_stock, data.unit, data.status, data.conversion_rate, data.secondary_unit]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions
app.post('/api/transactions', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { trx, items_update } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    
    await connection.query(
      'INSERT INTO transactions (id, transactionId, type, date, items, supplierName, poNumber, riNumber, sjNumber, totalItems, photos) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)',
      [id, trx.transactionId || `TRX-${Date.now()}`, trx.type, JSON.stringify(trx.items), trx.supplierName, trx.poNumber, trx.riNumber, trx.sjNumber, trx.totalItems || 0, JSON.stringify(trx.photos || [])]
    );

    for (const item of items_update) {
      const op = item.type === 'Inbound' ? '+' : '-';
      await connection.query(
        `UPDATE items SET current_stock = current_stock ${op} ? WHERE id = ?`,
        [item.quantity, item.id]
      );
    }

    await connection.commit();
    res.json({ success: true, id });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Jupiter WMS aktif di port ${PORT}`));