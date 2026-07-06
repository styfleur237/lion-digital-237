const express = require("express");
const auth = require("../middleware/auth");
const { saveDb } = require("../database/init");
const router = express.Router();

const PRODUCTS = [
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    daily: 250,
    days: 30,
    tier: 1,
    desc: "Le point d'entrée idéal.",
    features: [
      "Rendement journalier : 250 FCFA",
      "Durée : 30 jours",
      "Retour total : 7 500 FCFA",
    ],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 10000,
    daily: 550,
    days: 30,
    tier: 2,
    desc: "Un palier équilibré.",
    features: [
      "Rendement journalier : 550 FCFA",
      "Durée : 30 jours",
      "Retour total : 16 500 FCFA",
    ],
  },
  {
    id: "argent",
    name: "Argent",
    price: 25000,
    daily: 1450,
    days: 30,
    tier: 3,
    desc: "Pour les investisseurs réguliers.",
    features: [
      "Rendement journalier : 1 450 FCFA",
      "Durée : 30 jours",
      "Retour total : 43 500 FCFA",
    ],
  },
  {
    id: "or",
    name: "Or",
    price: 50000,
    daily: 3100,
    days: 30,
    tier: 4,
    desc: "Le palier premium.",
    features: [
      "Rendement journalier : 3 100 FCFA",
      "Durée : 30 jours",
      "Retour total : 93 000 FCFA",
    ],
  },
  {
    id: "platine",
    name: "Platine",
    price: 100000,
    daily: 6800,
    days: 30,
    tier: 5,
    desc: "Notre offre la plus exclusive.",
    features: [
      "Rendement journalier : 6 800 FCFA",
      "Durée : 30 jours",
      "Retour total : 204 000 FCFA",
    ],
  },
];

router.get("/catalog", (req, res) => {
  res.json(PRODUCTS);
});

router.post("/buy", auth, (req, res) => {
  try {
    const { productId } = req.body;
    const db = req.db;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product)
      return res.status(400).json({ error: "Produit introuvable." });

    if (req.user.balance < product.price) {
      return res.status(400).json({ error: "Solde insuffisant." });
    }

    db.run(
      `UPDATE users SET balance = balance - ${product.price} WHERE id = ${req.userId}`,
    );
    db.run(
      `INSERT INTO active_products (userId, productId, daysLeft) VALUES (${req.userId}, '${product.id}', ${product.days})`,
    );
    const escName = product.name.replace(/'/g, "''");
    db.run(
      `INSERT INTO purchases (userId, product, amount) VALUES (${req.userId}, '${escName}', ${product.price})`,
    );

    // Bonus parrainage
    if (req.user.referredBy) {
      const refResult = db.exec(
        `SELECT id FROM users WHERE username = '${req.user.referredBy.replace(/'/g, "''")}'`,
      );
      if (refResult.length > 0 && refResult[0].values.length > 0) {
        const referrerId = refResult[0].values[0][0];
        const bonus = Math.round(product.price * 0.05);
        db.run(
          `UPDATE users SET balance = balance + ${bonus}, referralRewards = referralRewards + ${bonus} WHERE id = ${referrerId}`,
        );
        db.run(
          `UPDATE referrals SET validated = 1, reward = ${bonus} WHERE referrerId = ${referrerId} AND username = '${req.user.username.replace(/'/g, "''")}'`,
        );
      }
    }

    saveDb();

    const userResult = db.exec(
      `SELECT balance FROM users WHERE id = ${req.userId}`,
    );
    const balance = userResult[0].values[0][0];
    const activeResult = db.exec(
      `SELECT * FROM active_products WHERE userId = ${req.userId}`,
    );
    const activeProducts = [];
    if (activeResult.length > 0) {
      const cols = activeResult[0].columns;
      for (const row of activeResult[0].values) {
        activeProducts.push({
          id: row[cols.indexOf("id")],
          userId: row[cols.indexOf("userId")],
          productId: row[cols.indexOf("productId")],
          purchasedAt: row[cols.indexOf("purchasedAt")],
          daysLeft: row[cols.indexOf("daysLeft")],
          name: product.name,
          daily: product.daily,
        });
      }
    }

    res.json({
      success: true,
      balance,
      activeProducts,
      message: `Produit ${product.name} acheté !`,
    });
  } catch (err) {
    console.error("[Products] Buy:", err);
    res.status(500).json({ error: "Erreur lors de l'achat." });
  }
});

router.get("/active", auth, (req, res) => {
  const db = req.db;
  const result = db.exec(
    `SELECT * FROM active_products WHERE userId = ${req.userId}`,
  );
  const products = [];
  if (result.length > 0) {
    const cols = result[0].columns;
    for (const row of result[0].values) {
      const prod = PRODUCTS.find(
        (p) => p.id === row[cols.indexOf("productId")],
      );
      products.push({
        id: row[cols.indexOf("id")],
        productId: row[cols.indexOf("productId")],
        purchasedAt: row[cols.indexOf("purchasedAt")],
        daysLeft: row[cols.indexOf("daysLeft")],
        name: prod ? prod.name : "Inconnu",
        daily: prod ? prod.daily : 0,
        price: prod ? prod.price : 0,
      });
    }
  }
  res.json(products);
});

module.exports = router;
