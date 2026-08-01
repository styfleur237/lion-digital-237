const express = require("express");
const jwt = require("jsonwebtoken");
const { saveDb } = require("../database/init");
const router = express.Router();

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

// Vérifier que la base est prête
router.use((req, res, next) => {
  if (!req.db) {
    return res.status(503).json({
      error:
        "Base de données en cours d'initialisation. Réessaie dans quelques secondes.",
    });
  }
  next();
});

function isAdmin(req) {
  return req.user && (req.user.role === "admin" || req.user.isAdmin === true);
}

/* ============================================================
   GET /balance — solde de l'utilisateur
   ============================================================ */
router.get("/balance", (req, res) => {
  try {
    const result = req.db.exec("SELECT balance FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    res.json({ balance: result[0].values[0][0] || 0 });
  } catch (err) {
    console.error("Erreur solde :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /deposit — l'utilisateur initie un dépôt
   ============================================================ */
router.post("/deposit", (req, res) => {
  const { amount, method, phone } = req.body;
  const userId = req.user.id;
  const amt = Number(amount);

  if (!Number.isFinite(amt) || amt < 500) {
    return res.status(400).json({ error: "Montant minimum : 500 FCFA" });
  }
  if (!method) {
    return res.status(400).json({ error: "Méthode de paiement requise" });
  }
  if (!phone || String(phone).length < 9) {
    return res.status(400).json({ error: "Numéro de téléphone requis" });
  }

  try {
    req.db.exec(
      "INSERT INTO deposits (user_id, amount, method, phone, status) VALUES (?, ?, ?, ?, 'pending')",
      [userId, amt, method, String(phone)],
    );
    saveDb();

    const idRes = req.db.exec("SELECT last_insert_rowid() AS id");
    const depositId = idRes[0].values[0][0];

    res.status(201).json({
      success: true,
      deposit: { id: depositId, amount: amt, method, phone, status: "pending" },
    });
  } catch (err) {
    console.error("Erreur dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /confirm-deposit — l'utilisateur saisit le code SMS
   ============================================================ */
router.post("/confirm-deposit", (req, res) => {
  const { depositId, transactionCode } = req.body;
  const userId = req.user.id;

  if (!depositId || !transactionCode) {
    return res
      .status(400)
      .json({ error: "ID dépôt et code transaction requis" });
  }

  try {
    const result = req.db.exec(
      "SELECT * FROM deposits WHERE id = ? AND user_id = ?",
      [depositId, userId],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const status = row[cols.indexOf("status")];

    if (status !== "pending") {
      return res.status(400).json({ error: "Ce dépôt a déjà été traité" });
    }

    req.db.exec(
      "UPDATE deposits SET transaction_code = ?, status = 'pending_admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [String(transactionCode), depositId],
    );
    saveDb();

    res.json({
      success: true,
      message:
        "Code enregistré. En attente de validation par l'administrateur.",
      deposit: { id: depositId, status: "pending_admin" },
    });
  } catch (err) {
    console.error("Erreur confirmation dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /withdraw — demande de retrait
   ============================================================ */
router.post("/withdraw", (req, res) => {
  const { amount, method, phone } = req.body;
  const userId = req.user.id;
  const amt = Number(amount);

  if (!Number.isFinite(amt) || amt < 1000) {
    return res.status(400).json({ error: "Montant minimum : 1 000 FCFA" });
  }
  if (!method) {
    return res.status(400).json({ error: "Méthode de retrait requise" });
  }
  if (!phone || String(phone).length < 9) {
    return res.status(400).json({ error: "Numéro de réception requis" });
  }

  try {
    const userResult = req.db.exec("SELECT balance FROM users WHERE id = ?", [
      userId,
    ]);
    const balance =
      userResult.length > 0 && userResult[0].values.length > 0
        ? userResult[0].values[0][0] || 0
        : 0;

    if (balance < amt) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    // Débiter immédiatement (remboursé si refusé par l'admin)
    req.db.exec("UPDATE users SET balance = balance - ? WHERE id = ?", [
      amt,
      userId,
    ]);
    req.db.exec(
      "INSERT INTO withdrawals (userId, amount, method, phone, status, date) VALUES (?, ?, ?, ?, 'en attente', datetime('now', 'localtime'))",
      [userId, amt, method, String(phone)],
    );
    saveDb();

    const idRes = req.db.exec("SELECT last_insert_rowid() AS id");

    res.status(201).json({
      success: true,
      balance: balance - amt,
      withdrawal: {
        id: idRes[0].values[0][0],
        amount: amt,
        method,
        phone,
        status: "en attente",
        date: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Erreur retrait :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   GET /history — historique complet (dépôts + retraits + achats)
   ============================================================ */
router.get("/history", (req, res) => {
  const userId = req.user.id;

  try {
    // Dépôts (table deposits : user_id, phone, created_at)
    let deposits = [];
    try {
      const d = req.db.exec(
        `SELECT id, amount, method, phone,
                CASE status
                  WHEN 'approved' THEN 'approuvé'
                  WHEN 'rejected' THEN 'refusé'
                  ELSE 'en attente'
                END AS status,
                created_at AS date
         FROM deposits WHERE user_id = ?
         ORDER BY id DESC LIMIT 50`,
        [userId],
      );
      if (d.length > 0 && d[0].values.length > 0) {
        const c = d[0].columns;
        deposits = d[0].values.map((r) => ({
          id: r[c.indexOf("id")],
          amount: r[c.indexOf("amount")],
          method: r[c.indexOf("method")],
          status: r[c.indexOf("status")],
          date: r[c.indexOf("date")],
        }));
      }
    } catch (e) {
      console.error("Historique dépôts:", e);
    }

    // Retraits (table withdrawals : userId, date)
    let withdrawals = [];
    try {
      const w = req.db.exec(
        "SELECT id, amount, method, status, date FROM withdrawals WHERE userId = ? ORDER BY id DESC LIMIT 50",
        [userId],
      );
      if (w.length > 0 && w[0].values.length > 0) {
        const c = w[0].columns;
        withdrawals = w[0].values.map((r) => ({
          id: r[c.indexOf("id")],
          amount: r[c.indexOf("amount")],
          method: r[c.indexOf("method")],
          status: r[c.indexOf("status")],
          date: r[c.indexOf("date")],
        }));
      }
    } catch (e) {
      console.error("Historique retraits:", e);
    }

    // Achats (table purchases : userId, product, date)
    let purchases = [];
    try {
      const p = req.db.exec(
        "SELECT id, product, amount, date FROM purchases WHERE userId = ? ORDER BY id DESC LIMIT 50",
        [userId],
      );
      if (p.length > 0 && p[0].values.length > 0) {
        const c = p[0].columns;
        purchases = p[0].values.map((r) => ({
          id: r[c.indexOf("id")],
          product: r[c.indexOf("product")],
          amount: r[c.indexOf("amount")],
          date: r[c.indexOf("date")],
        }));
      }
    } catch (e) {
      console.error("Historique achats:", e);
    }

    res.json({ deposits, withdrawals, purchases });
  } catch (err) {
    console.error("Erreur historique :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   ADMIN — dépôts en attente de validation
   ============================================================ */

// Liste des dépôts en attente (pending_admin)
router.get("/admin/deposits/pending", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }
  try {
    const result = req.db.exec(
      `SELECT d.id, d.amount, d.method, d.phone, d.transaction_code,
              d.created_at, u.username, u.phone AS user_phone
       FROM deposits d JOIN users u ON d.user_id = u.id
       WHERE d.status = 'pending_admin'
       ORDER BY d.id ASC`,
    );
    let deposits = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const c = result[0].columns;
      deposits = result[0].values.map((r) => ({
        id: r[c.indexOf("id")],
        amount: r[c.indexOf("amount")],
        method: r[c.indexOf("method")],
        phone: r[c.indexOf("phone")],
        transaction_code: r[c.indexOf("transaction_code")],
        created_at: r[c.indexOf("created_at")],
        username: r[c.indexOf("username")],
        user_phone: r[c.indexOf("user_phone")],
      }));
    }
    res.json({ deposits });
  } catch (err) {
    console.error("Erreur admin dépôts :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Approuver un dépôt → crédite le solde
router.post("/admin/deposits/approve", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }
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

    // Créditer le solde
    req.db.exec("UPDATE users SET balance = balance + ? WHERE id = ?", [
      amount,
      depositUserId,
    ]);
    req.db.exec(
      "UPDATE deposits SET status = 'approved', validated_by = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [req.user.id, depositId],
    );
    saveDb();

    res.json({
      success: true,
      message: `Dépôt de ${amount} FCFA approuvé et crédité.`,
    });
  } catch (err) {
    console.error("Erreur approbation dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Refuser un dépôt
router.post("/admin/deposits/reject", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }
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

    res.json({
      success: true,
      message: `Dépôt de ${amount} FCFA refusé.`,
    });
  } catch (err) {
    console.error("Erreur rejet dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
