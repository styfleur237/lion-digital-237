const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { saveDb } = require("../database/init");
const router = express.Router();

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LD237-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
      `SELECT id FROM users WHERE username = '${username.replace(/'/g, "''")}' OR phone = '${phone.replace(/'/g, "''")}'`,
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res
        .status(400)
        .json({ error: "Nom d'utilisateur ou téléphone déjà utilisé." });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const code = generateReferralCode();

    const escUsername = username.replace(/'/g, "''");
    const escPhone = phone.replace(/'/g, "''");
    const escReferral = referralCode
      ? `'${referralCode.replace(/'/g, "''")}'`
      : "NULL";

    db.run(`INSERT INTO users (username, phone, password, referralCode, referredBy)
            VALUES ('${escUsername}', '${escPhone}', '${hash}', '${code}', ${escReferral})`);

    // Gérer parrainage
    if (referralCode) {
      const refResult = db.exec(
        `SELECT id FROM users WHERE referralCode = '${referralCode.replace(/'/g, "''")}'`,
      );
      if (refResult.length > 0 && refResult[0].values.length > 0) {
        const referrerId = refResult[0].values[0][0];
        db.run(
          `INSERT INTO referrals (referrerId, username) VALUES (${referrerId}, '${escUsername}')`,
        );
      }
    }

    saveDb();

    // Récupérer l'utilisateur créé
    const userResult = db.exec(
      `SELECT id, username, phone, balance, referralCode, role FROM users WHERE username = '${escUsername}'`,
    );
    const user = userResult[0].values[0];

    const token = jwt.sign(
      { id: user[0], username: user[1], role: user[5] },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: {
        id: user[0],
        username: user[1],
        phone: user[2],
        balance: user[3],
        referralCode: user[4],
        role: user[5],
      },
    });
  } catch (err) {
    console.error("[Auth] Register:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res.status(400).json({ error: "Identifiants requis." });
    }

    const escUsername = username.replace(/'/g, "''");
    const result = db.exec(
      `SELECT * FROM users WHERE username = '${escUsername}'`,
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const row = result[0].values[0];
    const cols = result[0].columns;

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

router.get("/profile", (req, res) => {
  // L'auth middleware doit être adapté aussi — je le donne après
  res.status(401).json({ error: "Token requis" });
});

module.exports = router;
