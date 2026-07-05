const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const router = express.Router();

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LD237-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Inscription
router.post("/register", async (req, res) => {
  try {
    const { username, phone, password, referralCode } = req.body;
    const db = req.db;

    if (!username || !phone || !password) {
      return res
        .status(400)
        .json({ error: "Tous les champs obligatoires doivent être remplis." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({
          error: "Le mot de passe doit contenir au moins 6 caractères.",
        });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE username = ? OR phone = ?")
      .get(username, phone);
    if (existing) {
      return res
        .status(400)
        .json({ error: "Nom d'utilisateur ou téléphone déjà utilisé." });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const code = generateReferralCode();

    const result = db
      .prepare(
        `
      INSERT INTO users (username, phone, password, referralCode, referredBy)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(username, phone, hash, code, referralCode || null);

    // Gérer le parrainage
    if (referralCode) {
      const referrer = db
        .prepare("SELECT id FROM users WHERE referralCode = ?")
        .get(referralCode);
      if (referrer) {
        db.prepare(
          "INSERT INTO referrals (referrerId, username) VALUES (?, ?)",
        ).run(referrer.id, username);
      }
    }

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        phone,
        balance: 0,
        referralCode: code,
        role: "user",
      },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

// Connexion
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Nom d'utilisateur et mot de passe requis." });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
});

// Profil
router.get("/profile", auth, (req, res) => {
  const db = req.db;
  const user = db
    .prepare(
      "SELECT id, username, phone, balance, role, referralCode, referralRewards, createdAt FROM users WHERE id = ?",
    )
    .get(req.userId);
  const activeProducts = db
    .prepare("SELECT * FROM active_products WHERE userId = ?")
    .all(req.userId);
  res.json({ ...user, activeProducts });
});

module.exports = router;
