-- Inisialisasi Database
CREATE DATABASE IF NOT EXISTS jupiter_wms;
USE jupiter_wms;

-- Tabel Inventory
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(15,2) DEFAULT 0,
    location VARCHAR(100),
    min_level INT DEFAULT 0,
    current_stock DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pcs',
    status VARCHAR(50) DEFAULT 'Active',
    conversion_rate DECIMAL(15,2) DEFAULT 1,
    secondary_unit VARCHAR(50)
);

-- Tabel Transaksi (Inbound/Outbound)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    transactionId VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    items JSON,
    supplierName VARCHAR(255),
    poNumber VARCHAR(100),
    riNumber VARCHAR(100),
    sjNumber VARCHAR(100),
    totalItems DECIMAL(15,2) DEFAULT 0,
    photos JSON
);

-- Tabel Master Reject
CREATE TABLE IF NOT EXISTS reject_master (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100),
    name VARCHAR(255),
    baseUnit VARCHAR(50),
    unit2 VARCHAR(50),
    ratio2 DECIMAL(15,2),
    unit3 VARCHAR(50),
    ratio3 DECIMAL(15,2),
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Log Reject
CREATE TABLE IF NOT EXISTS reject_logs (
    id VARCHAR(50) PRIMARY KEY,
    date DATE,
    items JSON,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);