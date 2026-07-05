const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "liondigital237.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Créer les tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    referralCode TEXT UNIQUE,
    referredBy TEXT,
    role TEXT DEFAULT 'user',
    balance REAL DEFAULT 0,
    referralRewards REAL DEFAULT 0,
    lastReset TEXT,
    createdAt TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS active_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    productId TEXT NOT NULL,
    purchasedAt TEXT DEFAULT (datetime('now', 'localtime')),
    daysLeft INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT DEFAULT (datetime('now', 'localtime')),
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'Validé',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT DEFAULT (datetime('now', 'localtime')),
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'En cours',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT DEFAULT (datetime('now', 'localtime')),
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrerId INTEGER NOT NULL,
    username TEXT NOT NULL,
    validated INTEGER DEFAULT 0,
    reward REAL DEFAULT 0,
    FOREIGN KEY (referrerId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Créer l'admin par défaut
const adminExists = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get("admin");
if (!adminExists) {
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync("Admin123!", salt);
  db.prepare(
    `
    INSERT INTO users (username, phone, password, referralCode, role, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run("admin", "+237 600 000 000", hash, "LD237-ADMIN", "admin", 1000000);
  console.log("[DB] Admin créé (admin / Admin123!)");
}

// Créer un utilisateur de test
const testExists = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get("test");
if (!testExists) {
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync("test123", salt);
  db.prepare(
    `
    INSERT INTO users (username, phone, password, referralCode, role, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run("test", "+237 600 000 001", hash, "LD237-TEST", "user", 50000);
  console.log("[DB] Utilisateur test créé (test / test123)");
}

console.log("[DB] Base de données initialisée:", dbPath);
module.exports = db;
