import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db;

export function initDb() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'store.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Performance optimization
  
  // Initialize Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      barcode TEXT,
      category TEXT,
      costPrice REAL,
      sellPrice REAL,
      stock REAL DEFAULT 0,
      minStock REAL DEFAULT 0,
      unit TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      debtAmount REAL DEFAULT 0,
      bonusBalance REAL DEFAULT 0,
      bonusPercent REAL DEFAULT 0,
      totalPurchases REAL DEFAULT 0,
      visits INTEGER DEFAULT 0,
      currentDebt REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      saleNumber TEXT,
      customerId TEXT,
      cashierId TEXT,
      subtotal REAL,
      discountType TEXT,
      discountValue REAL,
      finalTotal REAL,
      paymentType TEXT,
      cashReceived REAL,
      cardAmount REAL,
      bonusEarned REAL,
      status TEXT DEFAULT 'completed',
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId TEXT,
      productId TEXT,
      name TEXT,
      qty REAL,
      price REAL,
      costPrice REAL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      itemCount INTEGER DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      contactPerson TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT,
      supplierId TEXT,
      managerId TEXT,
      expectedDate TEXT,
      status TEXT,
      totalAmount REAL,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL,
      category TEXT,
      note TEXT,
      date TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      resource TEXT,
      details TEXT,
      userId TEXT,
      userName TEXT,
      userRole TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      storeName TEXT,
      phone TEXT,
      address TEXT,
      logo TEXT,
      taxRate REAL,
      currency TEXT,
      language TEXT,
      theme TEXT,
      receiptHeader TEXT,
      receiptFooter TEXT,
      bonusPercent REAL,
      minPurchaseAmount REAL,
      maxBonusPayment REAL,
      enabled INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      manager TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      value REAL,
      startDate TEXT,
      endDate TEXT,
      conditions TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      phone TEXT,
      role TEXT,
      salary REAL,
      password TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS partnerDebts (
      id TEXT PRIMARY KEY,
      partnerId TEXT,
      amount REAL,
      type TEXT,
      date TEXT,
      note TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS customerDebts (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      amount REAL,
      type TEXT,
      date TEXT,
      note TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  console.log('SQLite Database initialized at:', dbPath);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Backup Utility
export function createBackup() {
  if (!db) return false;
  
  const documentsPath = app.getPath('documents');
  const backupDir = path.join(documentsPath, 'DoconPOS-Backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const backupPath = path.join(backupDir, `backup-${date}.db`);
  
  try {
    // Perform backup using SQLite online backup API
    db.backup(backupPath)
      .then(() => {
        console.log('Backup created successfully:', backupPath);
      })
      .catch((err) => {
        console.error('Backup failed:', err);
      });
    return true;
  } catch (error) {
    console.error('Backup error:', error);
    return false;
  }
}
