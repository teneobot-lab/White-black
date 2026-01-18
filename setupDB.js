import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables dari file .env
dotenv.config();

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

async function setup() {
  console.log('🚀 Memulai Inisialisasi Database Jupiter WMS...');

  if (!DB_USER || !DB_PASS || !DB_NAME) {
    console.error('❌ Error: Variabel lingkungan di file .env belum lengkap.');
    console.log('Pastikan DB_USER, DB_PASS, dan DB_NAME sudah diisi di file .env');
    process.exit(1);
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host: DB_HOST || 'localhost',
      user: DB_USER,
      password: DB_PASS,
    });

    console.log('✅ Terhubung ke server MySQL.');

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    console.log(`✅ Database "${DB_NAME}" siap.`);

    await connection.query(`USE ${DB_NAME}`);

    console.log('📡 Membuat tabel-tabel...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(100) UNIQUE,
        name VARCHAR(255),
        category VARCHAR(100),
        price DECIMAL(15,2),
        location VARCHAR(100),
        min_level INT,
        current_stock DECIMAL(15,2),
        unit VARCHAR(50),
        status VARCHAR(50),
        conversion_rate DECIMAL(15,2),
        secondary_unit VARCHAR(50)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        transactionId VARCHAR(100),
        type VARCHAR(50),
        date DATETIME,
        items JSON,
        supplierName VARCHAR(255),
        poNumber VARCHAR(100),
        riNumber VARCHAR(100),
        sjNumber VARCHAR(100),
        totalItems DECIMAL(15,2),
        photos JSON
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reject_master (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(100),
        name VARCHAR(255),
        baseUnit VARCHAR(50),
        unit2 VARCHAR(50),
        ratio2 DECIMAL(15,2),
        unit3 VARCHAR(50),
        ratio3 DECIMAL(15,2),
        lastUpdated DATETIME
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reject_logs (
        id VARCHAR(50) PRIMARY KEY,
        date DATE,
        items JSON,
        notes TEXT,
        timestamp DATETIME
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