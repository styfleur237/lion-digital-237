const express = require("express");
const jwt = require("jsonwebtoken");
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

/* ============================================================
   AUTH intégré (même style que wallet.js)
   ============================================================ */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Non connecté" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expirée. Reconnecte-toi." });
  }
}

/* ============================================================
   GET /catalog — liste des produits (public)
   ============================================================ */
router.get("/catalog", (req, res) => {
  res.json(PRODUCTS);
});

/* ============================================================
   POST /buy — acheter un produit
   ============================================================ */
router.post("/buy", authenticate, (req, res) => {
  try {
    const { productId } = req.body;
    const db = req.db;
    const userId = req.user.id;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product)
      return res.status(400).json({ error: "Produit introuvable." });

    // Lire l'utilisateur en base (solde + parrain)
    const userRes = db.exec(
      "SELECT id, username, balance, referredBy FROM users WHERE id = ?",
      [userId],
    );
    if (userRes.length === 0 || userRes[0].values.length === 0) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }
    const uc = userRes[0].columns;
    const urow = userRes[0].values[0];
    const user = {
      id: urow[uc.indexOf("id")],
      username: urow[uc.indexOf("username")],
      balance: urow[uc.indexOf("balance")] || 0,
      referredBy: urow[uc.indexOf("referredBy")] || null,
    };

    if (user.balance < product.price) {
      return res.status(400).json({ error: "Solde insuffisant." });
    }

    // Débiter le solde
    db.exec("UPDATE users SET balance = balance - ? WHERE id = ?", [
      product.price,
      userId,
    ]);

    // Produit actif
    db.exec(
      "INSERT INTO active_products (userId, productId, daysLeft, purchasedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [userId, product.id, product.days],
    );

    // Historique d'achat
    db.exec(
      "INSERT INTO purchases (userId, product, amount) VALUES (?, ?, ?)",
      [userId, product.name, product.price],
    );

    // Bonus parrainage : 5 % au parrain
    if (user.referredBy) {
      try {
        const refRes = db.exec("SELECT id FROM users WHERE username = ?", [
          user.referredBy,
        ]);
        if (refRes.length > 0 && refRes[0].values.length > 0) {
          const referrerId = refRes[0].values[0][0];
          const bonus = Math.round(product.price * 0.05);
          db.exec(
            "UPDATE users SET balance = balance + ?, referralRewards = referralRewards + ? WHERE id = ?",
            [bonus, bonus, referrerId],
          );
          try {
            db.exec(
              "UPDATE referrals SET validated = 1, reward = ? WHERE referrerId = ? AND username = ?",
              [bonus, referrerId, user.username],
            );
          } catch (e) {
            /* colonne reward peut manquer selon ta table */
          }
        }
      } catch (e) {
        console.error("[Products] Bonus parrainage:", e);
      }
    }

    saveDb();

    // Nouveau solde
    const balRes = db.exec("SELECT balance FROM users WHERE id = ?", [userId]);
    const balance = balRes[0].values[0][0];

    // Produits actifs
    const actRes = db.exec(
      "SELECT * FROM active_products WHERE userId = ? ORDER BY id DESC",
      [userId],
    );
    const activeProducts = [];
    if (actRes.length > 0) {
      const ac = actRes[0].columns;
      for (const row of actRes[0].values) {
        const prod = PRODUCTS.find(
          (p) => p.id === row[ac.indexOf("productId")],
        );
        activeProducts.push({
          id: row[ac.indexOf("id")],
          productId: row[ac.indexOf("productId")],
          purchasedAt:
            row[ac.indexOf("purchasedAt")] || new Date().toISOString(),
          daysLeft: row[ac.indexOf("daysLeft")] || product.days,
          name: prod ? prod.name : product.name,
          daily: prod ? prod.daily : product.daily,
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

/* ============================================================
   GET /active — produits actifs de l'utilisateur
   ============================================================ */
router.get("/active", authenticate, (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const result = db.exec("SELECT * FROM active_products WHERE userId = ?", [
      userId,
    ]);
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
  } catch (err) {
    console.error("[Products] Active:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
