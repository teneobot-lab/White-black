import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
};

async function setup() {
  console.log('📡 Menghubungkan ke MySQL di ' + config.host);
  let conn;
  try {
    conn = await mysql.createConnection(config);
    const dbName = process.env.DB_NAME || 'jupiter_wms';
    
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await conn.query(`USE ${dbName}`);
    console.log(`✅ Database ${dbName} siap.`);

    console.log('🛠 Membuat tabel items...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100) UNIQUE, name VARCHAR(255),
        category VARCHAR(100), price DECIMAL(15,2), location VARCHAR(100),
        min_level INT, current_stock DECIMAL(15,2), unit VARCHAR(50),
        status VARCHAR(50), conversion_rate DECIMAL(15,2), secondary_unit VARCHAR(50)
      )
    `);

    console.log('🛠 Membuat tabel transactions...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY, transactionId VARCHAR(100), type VARCHAR(50),
        date DATETIME, items JSON, supplierName VARCHAR(255), poNumber VARCHAR(100),
        riNumber VARCHAR(100), sjNumber VARCHAR(100), totalItems DECIMAL(15,2), photos JSON
      )
    `);

    console.log('🛠 Membuat tabel reject_master...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reject_master (
        id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255),
        baseUnit VARCHAR(50), unit2 VARCHAR(50), ratio2 DECIMAL(15,2),
        unit3 VARCHAR(50), ratio3 DECIMAL(15,2), lastUpdated DATETIME
      )
    `);

    console.log('🛠 Membuat tabel reject_logs...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reject_logs (
        id VARCHAR(50) PRIMARY KEY, date DATE, items JSON, notes TEXT, timestamp DATETIME
      )
    `);

    console.log('✨ Setup Database Selesai!');
  } catch (err) {
    console.error('❌ Error Setup:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}
setup();