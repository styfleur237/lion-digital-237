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
   HELPERS
   ============================================================ */
function one(db, sql, params = []) {
  const r = db.exec(sql, params);
  return r.length > 0 && r[0].values.length > 0 ? r[0].values[0][0] : 0;
}

// Renvoie UNIQUEMENT les utilisateurs ayant des demandes en attente
// (dépôts pending_admin OU retraits en attente)
function fetchPendingUsers(db) {
  const usrRes = db.exec(`
    SELECT DISTINCT u.id, u.username, u.phone, u.balance, u.role, u.createdAt
    FROM users u
    LEFT JOIN deposits d ON d.user_id = u.id AND d.status = 'pending_admin'
    LEFT JOIN withdrawals w ON w.userId = u.id AND w.status = 'en attente'
    WHERE d.id IS NOT NULL OR w.id IS NOT NULL
    ORDER BY u.id ASC
  `);

  const users = [];
  if (usrRes.length > 0 && usrRes[0].values.length > 0) {
    const c = usrRes[0].columns;
    for (const row of usrRes[0].values) {
      const u = {
        id: row[c.indexOf("id")],
        username: row[c.indexOf("username")],
        phone: row[c.indexOf("phone")],
        balance: row[c.indexOf("balance")],
        role: row[c.indexOf("role")],
        createdAt: row[c.indexOf("createdAt")],
        pendingDeposits: [],
        pendingWithdrawals: [],
      };

      // Dépôts en attente de validation
      try {
        const pd = db.exec(
          `SELECT id, amount, method, phone, transaction_code, created_at
           FROM deposits WHERE user_id = ? AND status = 'pending_admin'
           ORDER BY id ASC`,
          [u.id],
        );
        if (pd.length > 0 && pd[0].values.length > 0) {
          const pc = pd[0].columns;
          u.pendingDeposits = pd[0].values.map((r) => ({
            id: r[pc.indexOf("id")],
            amount: r[pc.indexOf("amount")],
            method: r[pc.indexOf("method")],
            phone: r[pc.indexOf("phone")],
            transaction_code: r[pc.indexOf("transaction_code")],
            created_at: r[pc.indexOf("created_at")],
          }));
        }
      } catch (e) {
        u.pendingDeposits = [];
      }

      // Retraits en attente
      try {
        const pw = db.exec(
          `SELECT id, amount, method FROM withdrawals
           WHERE userId = ? AND status = 'en attente' ORDER BY id ASC`,
          [u.id],
        );
        if (pw.length > 0 && pw[0].values.length > 0) {
          const wc = pw[0].columns;
          u.pendingWithdrawals = pw[0].values.map((r) => ({
            id: r[wc.indexOf("id")],
            amount: r[wc.indexOf("amount")],
            method: r[wc.indexOf("method")],
          }));
        }
      } catch (e) {
        u.pendingWithdrawals = [];
      }

      users.push(u);
    }
  }
  return users;
}

function buildSummary(db) {
  const stats = {
    totalUsers: one(db, "SELECT COUNT(*) FROM users"),
    // Utilisateurs ayant effectué AU MOINS UN dépôt validé par l'admin
    usersWithValidDeposits: one(
      db,
      "SELECT COUNT(DISTINCT user_id) FROM deposits WHERE status = 'approved'",
    ),
    // Total des dépôts VALIDÉS uniquement
    totalDeposits: one(
      db,
      "SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'approved'",
    ),
    // Total des retraits (tous)
    totalWithdrawals: one(
      db,
      "SELECT COALESCE(SUM(amount), 0) FROM withdrawals",
    ),
    activeProductCount: one(db, "SELECT COUNT(*) FROM active_products"),
  };
  const users = fetchPendingUsers(db);
  return { stats, users };
}

/* ============================================================
   GET /stats — vue d'ensemble de la plateforme
   ============================================================ */
router.get("/stats", (req, res) => {
  try {
    const { stats, users } = buildSummary(req.db);
    res.json({
      ...stats,
      users: users.map((u) => ({ id: u.id, username: u.username })),
    });
  } catch (err) {
    console.error("[Admin] Stats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   GET /users — UNIQUEMENT les utilisateurs avec demandes en attente
   ============================================================ */
router.get("/users", (req, res) => {
  try {
    const users = fetchPendingUsers(req.db);
    res.json({ total: users.length, users });
  } catch (err) {
    console.error("[Admin] Users:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /deposits/approve — valider un dépôt → crédite le solde
   ============================================================ */
router.post("/deposits/approve", (req, res) => {
  const { depositId } = req.body;
  if (!depositId) {
    return res.status(400).json({ error: "ID dépôt requis" });
  }

  try {
    const result = req.db.exec("SELECT * FROM deposits WHERE id = ?", [
      depositId,
    ]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const status = row[cols.indexOf("status")];
    const amount = row[cols.indexOf("amount")];
    const depositUserId = row[cols.indexOf("user_id")];

    if (status !== "pending_admin") {
      return res.status(400).json({ error: "Ce dépôt n'est pas en attente" });
    }

    // CRÉDITER le solde de l'utilisateur
    req.db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
      amount,
      depositUserId,
    ]);
    req.db.exec(
      "UPDATE deposits SET status = 'approved', validated_by = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [req.user.id, depositId],
    );
    saveDb();

    const { stats, users } = buildSummary(req.db);
    res.json({
      success: true,
      message: `Dépôt de ${amount} FCFA approuvé et crédité.`,
      stats,
      users,
    });
  } catch (err) {
    console.error("[Admin] Approve dépôt:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /deposits/reject — refuser un dépôt
   ============================================================ */
router.post("/deposits/reject", (req, res) => {
  const { depositId } = req.body;
  if (!depositId) {
    return res.status(400).json({ error: "ID dépôt requis" });
  }

  try {
    const result = req.db.exec("SELECT * FROM deposits WHERE id = ?", [
      depositId,
    ]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const status = row[cols.indexOf("status")];
    const amount = row[cols.indexOf("amount")];

    if (status !== "pending_admin") {
      return res.status(400).json({ error: "Ce dépôt n'est pas en attente" });
    }

    req.db.exec(
      "UPDATE deposits SET status = 'rejected', validated_by = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [req.user.id, depositId],
    );
    saveDb();

    const { stats, users } = buildSummary(req.db);
    res.json({
      success: true,
      message: `Dépôt de ${amount} FCFA refusé.`,
      stats,
      users,
    });
  } catch (err) {
    console.error("[Admin] Reject dépôt:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /withdraw/:id/process — traiter un retrait (garde l'ancienne)
   ============================================================ */
router.post("/withdraw/:id/process", (req, res) => {
  try {
    const { status } = req.body;
    const wid = parseInt(req.params.id);

    const wResult = req.db.exec("SELECT * FROM withdrawals WHERE id = ?", [
      wid,
    ]);
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
      req.db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
        withdrawalAmount,
        withdrawalUserId,
      ]);
    }

    req.db.exec("UPDATE withdrawals SET status = ? WHERE id = ?", [
      status,
      wid,
    ]);
    saveDb();

    const { stats, users } = buildSummary(req.db);
    res.json({
      success: true,
      message: `Retrait ${status.toLowerCase()}.`,
      stats,
      users,
    });
  } catch (err) {
    console.error("[Admin] Process:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /action — compatible Ancien AdminScreen (approve-<id> pour retraits)
   ============================================================ */
router.post("/action", (req, res) => {
  try {
    const { userId, action } = req.body;

    if (typeof action === "string" && /^(approve|refuse)-/.test(action)) {
      const [verb, idStr] = action.split("-");
      const wid = parseInt(idStr);

      const wResult = req.db.exec(
        "SELECT * FROM withdrawals WHERE id = ? AND userId = ?",
        [wid, userId],
      );
      if (wResult.length > 0 && wResult[0].values.length > 0) {
        const cols = wResult[0].columns;
        const row = wResult[0].values[0];
        const wStatus = row[cols.indexOf("status")];
        const wAmount = row[cols.indexOf("amount")];

        if (wStatus === "en attente") {
          if (verb === "approve") {
            req.db.exec(
              "UPDATE withdrawals SET status = 'approuvé' WHERE id = ?",
              [wid],
            );
          } else {
            req.db.exec(
              "UPDATE withdrawals SET status = 'refusé' WHERE id = ?",
              [wid],
            );
            req.db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
              wAmount,
              userId,
            ]);
          }
          saveDb();
        }
      }
    }

    const { stats, users } = buildSummary(req.db);
    res.json({ success: true, stats, users });
  } catch (err) {
    console.error("[Admin] Action:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
