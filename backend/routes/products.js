const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

const PRODUCTS = [
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    daily: 250,
    days: 30,
    tier: 1,
    desc: "Le point d'entrée idéal pour découvrir la plateforme.",
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
    desc: "Un palier équilibré pour accélérer vos gains.",
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
    desc: "Le palier premium pour maximiser vos revenus.",
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

router.post("/buy", auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const db = req.db;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product)
      return res.status(400).json({ error: "Produit introuvable." });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    if (user.balance < product.price) {
      return res.status(400).json({ error: "Solde insuffisant." });
    }

    db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(
      product.price,
      req.userId,
    );
    db.prepare(
      "INSERT INTO active_products (userId, productId, daysLeft) VALUES (?, ?, ?)",
    ).run(req.userId, product.id, product.days);
    db.prepare(
      "INSERT INTO purchases (userId, product, amount) VALUES (?, ?, ?)",
    ).run(req.userId, product.name, product.price);

    // Bonus parrainage
    if (user.referredBy) {
      const referrer = db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get(user.referredBy);
      if (referrer) {
        const bonus = Math.round(product.price * 0.05);
        db.prepare(
          "UPDATE users SET balance = balance + ?, referralRewards = referralRewards + ? WHERE id = ?",
        ).run(bonus, bonus, referrer.id);
        db.prepare(
          "UPDATE referrals SET validated = 1, reward = ? WHERE referrerId = ? AND username = ?",
        ).run(bonus, referrer.id, user.username);
      }
    }

    const updatedUser = db
      .prepare(
        "SELECT id, username, phone, balance, role, referralCode FROM users WHERE id = ?",
      )
      .get(req.userId);
    const activeProducts = db
      .prepare("SELECT * FROM active_products WHERE userId = ?")
      .all(req.userId);

    res.json({
      success: true,
      balance: updatedUser.balance,
      activeProducts,
      message: `Produit ${product.name} acheté !`,
    });
  } catch (err) {
    console.error("[Products] Buy error:", err);
    res.status(500).json({ error: "Erreur lors de l'achat." });
  }
});

router.get("/active", auth, (req, res) => {
  const db = req.db;
  const active = db
    .prepare("SELECT * FROM active_products WHERE userId = ?")
    .all(req.userId);
  res.json(
    active.map((ap) => {
      const product = PRODUCTS.find((p) => p.id === ap.productId);
      return {
        ...ap,
        name: product ? product.name : "Inconnu",
        daily: product ? product.daily : 0,
      };
    }),
  );
});

module.exports = router;
