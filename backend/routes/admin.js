const express = require("express");
const jwt = require("jsonwebtoken");
const { saveDb } = require("../database/init");
const router = express.Router();

/* ============================================================
   AUTH + ADMIN intégrés
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

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.isAdmin !== true)) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }
  next();
}

router.use(authenticate, requireAdmin);

/* ============================================================
   GET /stats — aperçu de la plateforme
   ============================================================ */
router.get("/stats", (req, res) => {
  try {
    const db = req.db;
    const q = (sql) => {
      const r = db.exec(sql);
      return r.length > 0 ? r[0].values[0][0] : 0;
    };

    const totalUsers = q("SELECT COUNT(*) FROM users");
    const totalBalance = q("SELECT COALESCE(SUM(balance), 0) FROM users");
    const totalDeposits = q("SELECT COALESCE(SUM(amount), 0) FROM deposits");
    const totalWithdrawals = q(
      "SELECT COALESCE(SUM(amount), 0) FROM withdrawals",
    );
    const activeProductCount = q("SELECT COUNT(*) FROM active_products");
    const totalPurchases = q("SELECT COUNT(*) FROM purchases");

    res.json({
      totalUsers,
      totalBalance,
      totalDeposits,
      totalWithdrawals,
      activeProductCount,
      totalPurchases,
    });
  } catch (err) {
    console.error("[Admin] Stats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   GET /users — liste des utilisateurs + leurs retraits en attente
   ============================================================ */
router.get("/users", (req, res) => {
  try {
    const db = req.db;
    const result = db.exec(
      "SELECT id, username, phone, balance, role, referralRewards, createdAt FROM users ORDER BY id DESC LIMIT 100",
    );
    const users = [];
    if (result.length > 0) {
      const cols = result[0].columns;
      for (const row of result[0].values) {
        const u = {
          id: row[cols.indexOf("id")],
          username: row[cols.indexOf("username")],
          phone: row[cols.indexOf("phone")],
          balance: row[cols.indexOf("balance")],
          role: row[cols.indexOf("role")],
          referralRewards: row[cols.indexOf("referralRewards")],
          createdAt: row[cols.indexOf("createdAt")],
          withdrawals: [],
        };

        // Retraits en attente de ce user
        try {
          const wRes = db.exec(
            "SELECT id, amount, method, status FROM withdrawals WHERE userId = ? AND status = 'en attente'",
            [u.id],
          );
          if (wRes.length > 0 && wRes[0].values.length > 0) {
            const wc = wRes[0].columns;
            u.withdrawals = wRes[0].values.map((w) => ({
              id: w[wc.indexOf("id")],
              amount: w[wc.indexOf("amount")],
              method: w[wc.indexOf("method")],
              status: w[wc.indexOf("status")],
            }));
          }
        } catch (e) {
          u.withdrawals = [];
        }

        users.push(u);
      }
    }
    res.json({ total: users.length, users });
  } catch (err) {
    console.error("[Admin] Users:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /withdraw/:id/process — traiter un retrait (ancienne route)
   ============================================================ */
router.post("/withdraw/:id/process", (req, res) => {
  try {
    const db = req.db;
    const { status } = req.body;
    const wid = parseInt(req.params.id);

    const wResult = db.exec("SELECT * FROM withdrawals WHERE id = ?", [wid]);
    if (wResult.length === 0 || wResult[0].values.length === 0) {
      return res.status(404).json({ error: "Retrait introuvable." });
    }

    const cols = wResult[0].columns;
    const row = wResult[0].values[0];
    const withdrawalStatus = row[cols.indexOf("status")];
    const withdrawalAmount = row[cols.indexOf("amount")];
    const withdrawalUserId = row[cols.indexOf("userId")];

    // Si refus et encore en attente → rembourser
    if (status === "Refusé" && withdrawalStatus === "en attente") {
      db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
        withdrawalAmount,
        withdrawalUserId,
      ]);
    }

    db.exec("UPDATE withdrawals SET status = ? WHERE id = ?", [status, wid]);
    saveDb();

    res.json({ success: true, message: `Retrait ${status.toLowerCase()}.` });
  } catch (err) {
    console.error("[Admin] Process:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /action — compatible AdminScreen (App.jsx)
   body : { userId, action: "approve-<id>" | "refuse-<id>" }
   ============================================================ */
router.post("/action", (req, res) => {
  try {
    const db = req.db;
    const { userId, action } = req.body;

    if (typeof action === "string" && /^(approve|refuse)-/.test(action)) {
      const [verb, idStr] = action.split("-");
      const wid = parseInt(idStr);

      const wResult = db.exec(
        "SELECT * FROM withdrawals WHERE id = ? AND userId = ?",
        [wid, userId],
      );
      if (wResult.length === 0 || wResult[0].values.length === 0) {
        return res.status(404).json({ error: "Retrait introuvable." });
      }

      const cols = wResult[0].columns;
      const row = wResult[0].values[0];
      const wStatus = row[cols.indexOf("status")];
      const wAmount = row[cols.indexOf("amount")];
      const wUserId = row[cols.indexOf("userId")];

      if (wStatus === "en attente") {
        if (verb === "approve") {
          db.exec("UPDATE withdrawals SET status = 'approuvé' WHERE id = ?", [
            wid,
          ]);
        } else {
          db.exec("UPDATE withdrawals SET status = 'refusé' WHERE id = ?", [
            wid,
          ]);
          db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
            wAmount,
            wUserId,
          ]);
        }
        saveDb();
      }
    }

    // Renvoyer la liste à jour (ce que AdminScreen attend)
    const usersRes = db.exec(
      "SELECT id, username, phone, balance, role, referralRewards, createdAt FROM users ORDER BY id DESC LIMIT 100",
    );
    const users = [];
    if (usersRes.length > 0) {
      const uc = usersRes[0].columns;
      for (const row of usersRes[0].values) {
        const u = {
          id: row[uc.indexOf("id")],
          username: row[uc.indexOf("username")],
          phone: row[uc.indexOf("phone")],
          balance: row[uc.indexOf("balance")],
          role: row[uc.indexOf("role")],
          referralRewards: row[uc.indexOf("referralRewards")],
          createdAt: row[uc.indexOf("createdAt")],
          withdrawals: [],
        };
        try {
          const wRes = db.exec(
            "SELECT id, amount, method, status FROM withdrawals WHERE userId = ? AND status = 'en attente'",
            [u.id],
          );
          if (wRes.length > 0 && wRes[0].values.length > 0) {
            const wc = wRes[0].columns;
            u.withdrawals = wRes[0].values.map((w) => ({
              id: w[wc.indexOf("id")],
              amount: w[wc.indexOf("amount")],
              method: w[wc.indexOf("method")],
              status: w[wc.indexOf("status")],
            }));
          }
        } catch (e) {
          u.withdrawals = [];
        }
        users.push(u);
      }
    }

    const q = (sql) => {
      const r = db.exec(sql);
      return r.length > 0 ? r[0].values[0][0] : 0;
    };
    const stats = {
      totalUsers: q("SELECT COUNT(*) FROM users"),
      totalBalance: q("SELECT COALESCE(SUM(balance), 0) FROM users"),
      totalDeposits: q("SELECT COALESCE(SUM(amount), 0) FROM deposits"),
      totalWithdrawals: q("SELECT COALESCE(SUM(amount), 0) FROM withdrawals"),
      activeProductCount: q("SELECT COUNT(*) FROM active_products"),
      totalPurchases: q("SELECT COUNT(*) FROM purchases"),
    };

    res.json({ success: true, users, stats });
  } catch (err) {
    console.error("[Admin] Action:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
