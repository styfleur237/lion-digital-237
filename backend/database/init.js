const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "liondigital237.db");

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");

  // Créer les tables
  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS active_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId TEXT NOT NULL,
      purchasedAt TEXT DEFAULT (datetime('now', 'localtime')),
      daysLeft INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT DEFAULT (datetime('now', 'localtime')),
      amount REAL NOT NULL,
      method TEXT,
      status TEXT DEFAULT 'Validé',
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT DEFAULT (datetime('now', 'localtime')),
      amount REAL NOT NULL,
      method TEXT,
      status TEXT DEFAULT 'En cours',
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT DEFAULT (datetime('now', 'localtime')),
      product TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrerId INTEGER NOT NULL,
      username TEXT NOT NULL,
      validated INTEGER DEFAULT 0,
      reward REAL DEFAULT 0,
      FOREIGN KEY (referrerId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
      CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        method TEXT NOT NULL CHECK(method IN ('MTN','ORANGE')),
        phone TEXT NOT NULL,
        transaction_code TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','awaiting_admin','approved','rejected')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

  db.run(`
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    phone TEXT NOT NULL,
    transaction_code TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_by INTEGER DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

  // Créer l'admin par défaut
  const adminExists = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (adminExists.length === 0 || adminExists[0].values.length === 0) {
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync("Admin123!", salt);
    db.run(
      `INSERT INTO users (username, phone, password, referralCode, role, balance)
            VALUES ('admin', '+237 600 000 000', ?, 'LD237-ADMIN', 'admin', 1000000)`,
      [hash],
    );
    console.log("[DB] Admin créé (admin / Admin123!)");
  }

  // Sauvegarder
  saveDb();

  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

console.log("[DB] Base de données SQL.js initialisée");
module.exports = { getDb, saveDb };
