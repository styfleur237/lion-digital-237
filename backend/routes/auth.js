const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { saveDb } = require("../database/init");
const router = express.Router();

/* ============================================================
   MIDDLEWARE AUTH — vérifie le token JWT
   ============================================================ */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Non connecté" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expirée. Reconnecte-toi." });
  }
}

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LD237-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* ============================================================
   POST /register
   ============================================================ */
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

    // Vérifier si existe
    const existing = db.exec(
      "SELECT id FROM users WHERE username = ? OR phone = ?",
      [username, phone],
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res
        .status(400)
        .json({ error: "Nom d'utilisateur ou téléphone déjà utilisé." });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const code = generateReferralCode();

    db.exec(
      "INSERT INTO users (username, phone, password, referralCode, referredBy) VALUES (?, ?, ?, ?, ?)",
      [username, phone, hash, code, referralCode || null],
    );

    // Gérer le parrainage — SANS bloquer l'inscription si ça échoue
    if (referralCode) {
      try {
        const refResult = db.exec(
          "SELECT id FROM users WHERE referralCode = ?",
          [referralCode],
        );
        if (refResult.length > 0 && refResult[0].values.length > 0) {
          const referrerId = refResult[0].values[0][0];
          db.exec(
            "INSERT INTO referrals (referrerId, username) VALUES (?, ?)",
            [referrerId, username],
          );
        }
      } catch (err) {
        console.error("[Auth] Parrainage:", err);
      }
    }

    saveDb();

    // Récupérer l'utilisateur créé
    const userResult = db.exec(
      "SELECT id, username, phone, balance, referralCode, role FROM users WHERE username = ?",
      [username],
    );
    const cols = userResult[0].columns;
    const row = userResult[0].values[0];

    const user = {
      id: row[cols.indexOf("id")],
      username: row[cols.indexOf("username")],
      phone: row[cols.indexOf("phone")],
      balance: row[cols.indexOf("balance")],
      referralCode: row[cols.indexOf("referralCode")],
      role: row[cols.indexOf("role")],
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("[Auth] Register:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

/* ============================================================
   POST /login
   ============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res.status(400).json({ error: "Identifiants requis." });
    }

    const result = db.exec("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];

    const user = {
      id: row[cols.indexOf("id")],
      username: row[cols.indexOf("username")],
      phone: row[cols.indexOf("phone")],
      password: row[cols.indexOf("password")],
      balance: row[cols.indexOf("balance")],
      referralCode: row[cols.indexOf("referralCode")],
      role: row[cols.indexOf("role")],
    };

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
    console.error("[Auth] Login:", err);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
});

/* ============================================================
   GET /profile — avec token (CORRIGÉ)
   ============================================================ */
router.get("/profile", authenticate, (req, res) => {
  try {
    const result = req.db.exec(
      "SELECT id, username, phone, balance, referralCode, role FROM users WHERE id = ?",
      [req.user.id],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];

    const user = {
      id: row[cols.indexOf("id")],
      username: row[cols.indexOf("username")],
      phone: row[cols.indexOf("phone")],
      balance: row[cols.indexOf("balance")],
      referralCode: row[cols.indexOf("referralCode")],
      role: row[cols.indexOf("role")],
    };

    // Produits actifs — adapter les noms de colonnes à ta table "purchases"
    let activeProducts = [];
    try {
      const ap = req.db.exec(
        "SELECT id, productId, product_name, amount, purchasedAt, daysLeft, status FROM purchases WHERE user_id = ? AND status = 'active' ORDER BY purchasedAt DESC",
        [req.user.id],
      );
      if (ap.length > 0 && ap[0].values.length > 0) {
        const ac = ap[0].columns;
        activeProducts = ap[0].values.map((r) => ({
          id: r[ac.indexOf("id")],
          productId:
            r[ac.indexOf("productId")] !== undefined &&
            r[ac.indexOf("productId")] !== null
              ? r[ac.indexOf("productId")]
              : r[ac.indexOf("product_name")],
          purchasedAt: r[ac.indexOf("purchasedAt")] || new Date().toISOString(),
          daysLeft: r[ac.indexOf("daysLeft")] || 30,
        }));
      }
    } catch (err) {
      console.error("[Auth] Produits actifs:", err);
      activeProducts = [];
    }

    res.json({
      ...user,
      activeProducts,
      user, // pour le ProfileScreen
    });
  } catch (err) {
    console.error("[Auth] Profile:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
