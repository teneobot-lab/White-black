import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Menggunakan 127.0.0.1 untuk menghindari error ECONNREFUSED ::1
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
};

async function setup() {
  console.log('🚀 Memulai Inisialisasi Database Jupiter WMS...');
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Terhubung ke MySQL Server.');

    const dbName = process.env.DB_NAME || 'jupiter_wms';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);
    console.log(`✅ Database "${dbName}" siap.`);

    console.log('📡 Membuat tabel items...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100) UNIQUE, name VARCHAR(255),
        category VARCHAR(100), price DECIMAL(15,2), location VARCHAR(100),
        min_level INT, current_stock DECIMAL(15,2), unit VARCHAR(50),
        status VARCHAR(50), conversion_rate DECIMAL(15,2), secondary_unit VARCHAR(50)
      )
    `);

    console.log('📡 Membuat tabel transactions...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY, transactionId VARCHAR(100), type VARCHAR(50),
        date DATETIME, items JSON, supplierName VARCHAR(255), poNumber VARCHAR(100),
        riNumber VARCHAR(100), sjNumber VARCHAR(100), totalItems DECIMAL(15,2), photos JSON
      )
    `);

    console.log('📡 Membuat tabel reject_master...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reject_master (
        id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255),
        baseUnit VARCHAR(50), unit2 VARCHAR(50), ratio2 DECIMAL(15,2),
        unit3 VARCHAR(50), ratio3 DECIMAL(15,2), lastUpdated DATETIME
      )
    `);

    console.log('📡 Membuat tabel reject_logs...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reject_logs (
        id VARCHAR(50) PRIMARY KEY, date DATE, items JSON, notes TEXT, timestamp DATETIME
      )
    `);

    console.log('\n✨ Database setup berhasil diselesaikan!');
  } catch (err) {
    console.error('\n❌ Setup Gagal:', err.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Koneksi ditutup.');
    }
  }
}

setup();