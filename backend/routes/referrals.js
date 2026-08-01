const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

/* ============================================================
   AUTH — vérifie le token JWT et remplit req.user
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

router.use(authenticate);

/* ============================================================
   GET /stats — stats de parrainage de l'utilisateur connecté
   ============================================================ */
router.get("/stats", (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;

    // 1. Code de parrainage de l'utilisateur
    const userRes = db.exec("SELECT id, referralCode FROM users WHERE id = ?", [
      userId,
    ]);
    if (userRes.length === 0 || userRes[0].values.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    const cols = userRes[0].columns;
    const referralCode =
      userRes[0].values[0][cols.indexOf("referralCode")] || "";

    // 2. Nombre de filleuls directs
    let direct = 0;
    try {
      const refRes = db.exec(
        "SELECT COUNT(*) FROM referrals WHERE referrerId = ?",
        [userId],
      );
      if (refRes.length > 0 && refRes[0].values.length > 0) {
        direct = refRes[0].values[0][0] || 0;
      }
    } catch (e) {
      direct = 0;
    }

    // 3. Filleuls "validés" (ceux qui ont un solde > 0)
    let validated = 0;
    try {
      const vRes = db.exec(
        "SELECT COUNT(*) FROM referrals r JOIN users u ON u.username = r.username WHERE r.referrerId = ? AND u.balance > 0",
        [userId],
      );
      if (vRes.length > 0 && vRes[0].values.length > 0) {
        validated = vRes[0].values[0][0] || 0;
      }
    } catch (e) {
      validated = 0;
    }

    // 4. Récompenses = 10% des soldes des filleuls
    let rewards = 0;
    try {
      const rRes = db.exec(
        "SELECT COALESCE(SUM(u.balance), 0) FROM referrals r JOIN users u ON u.username = r.username WHERE r.referrerId = ?",
        [userId],
      );
      if (rRes.length > 0 && rRes[0].values.length > 0) {
        rewards = Math.round((rRes[0].values[0][0] || 0) * 0.1);
      }
    } catch (e) {
      rewards = 0;
    }

    // 5. Liste des filleuls
    let referrals = [];
    try {
      const listRes = db.exec(
        "SELECT username, created_at AS joinedAt FROM referrals WHERE referrerId = ? ORDER BY rowid DESC",
        [userId],
      );
      if (listRes.length > 0 && listRes[0].values.length > 0) {
        const c = listRes[0].columns;
        referrals = listRes[0].values.map((r) => ({
          username: r[c.indexOf("username")],
          joinedAt: r[c.indexOf("joinedAt")] || new Date().toISOString(),
        }));
      }
    } catch (e) {
      // La table n'a peut-être pas de colonne created_at → version simple
      try {
        const listRes = db.exec(
          "SELECT username FROM referrals WHERE referrerId = ?",
          [userId],
        );
        if (listRes.length > 0 && listRes[0].values.length > 0) {
          referrals = listRes[0].values.map((r) => ({
            username: r[0],
            joinedAt: new Date().toISOString(),
          }));
        }
      } catch (e2) {
        referrals = [];
      }
    }

    res.json({
      direct,
      validated,
      rewards,
      referralCode,
      referrals,
    });
  } catch (err) {
    console.error("Erreur stats parrainage :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   GET /list — liste des filleuls
   ============================================================ */
router.get("/list", (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;

    let referrals = [];
    try {
      const listRes = db.exec(
        "SELECT username, created_at AS joinedAt FROM referrals WHERE referrerId = ? ORDER BY rowid DESC",
        [userId],
      );
      if (listRes.length > 0 && listRes[0].values.length > 0) {
        const c = listRes[0].columns;
        referrals = listRes[0].values.map((r) => ({
          username: r[c.indexOf("username")],
          joinedAt: r[c.indexOf("joinedAt")] || new Date().toISOString(),
        }));
      }
    } catch (e) {
      try {
        const listRes = db.exec(
          "SELECT username FROM referrals WHERE referrerId = ?",
          [userId],
        );
        if (listRes.length > 0 && listRes[0].values.length > 0) {
          referrals = listRes[0].values.map((r) => ({
            username: r[0],
            joinedAt: new Date().toISOString(),
          }));
        }
      } catch (e2) {
        referrals = [];
      }
    }

    res.json({ referrals });
  } catch (err) {
    console.error("Erreur liste filleuls :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
