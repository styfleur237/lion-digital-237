const bcrypt = require("bcryptjs");
const db = require("./database");

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LD237-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function seed() {
  const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (existing) {
    console.log("[Seed] Données déjà présentes.");
    return;
  }

  const salt = bcrypt.genSaltSync(12);
  const hashAdmin = bcrypt.hashSync("Admin123!", salt);
  const hashUser = bcrypt.hashSync("test123", salt);

  db.prepare(
    `
    INSERT INTO users (username, phone, password, referralCode, role, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "admin",
    "+237600000001",
    hashAdmin,
    generateReferralCode(),
    "admin",
    1000000,
  );

  db.prepare(
    `
    INSERT INTO users (username, phone, password, referralCode, role, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "demo",
    "+237600000002",
    hashUser,
    generateReferralCode(),
    "user",
    50000,
  );

  // Ajouter un produit actif pour demo
  const user = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("demo");
  db.prepare(
    `
    INSERT INTO active_products (userId, productId, productName, daily, daysLeft)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(user.id, "starter", "Starter", 250, 28);

  // Ajouter un dépôt pour demo
  db.prepare(
    `
    INSERT INTO deposits (userId, amount, method, status)
    VALUES (?, ?, ?, ?)
  `,
  ).run(user.id, 25000, "MTN Mobile Money", "Validé");

  console.log("[Seed] Données de test insérées.");
  console.log("  Admin: admin / Admin123!");
  console.log("  Demo:  demo / test123");
}

module.exports = seed;
