const express = require("express");
const router = express.Router();
const db = require("../database/init");

/* ============================================================
   MIDDLEWARE : vérifie que l'utilisateur est connecté
   ============================================================ */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Non connecté" });
  }
  next();
}

/* ============================================================
   POST /wallet/deposit  — l'utilisateur initie un dépôt
   ============================================================ */
router.post("/wallet/deposit", requireAuth, (req, res) => {
  const { amount, method, phone } = req.body;
  const userId = req.user.id;

  // Validation
  if (!amount || amount < 500) {
    return res.status(400).json({ error: "Montant minimum : 500 FCFA" });
  }
  if (!method) {
    return res.status(400).json({ error: "Méthode de paiement requise" });
  }
  if (!phone || phone.length < 9) {
    return res.status(400).json({ error: "Numéro de téléphone requis" });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO deposits (user_id, amount, method, phone, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, amount, method, phone, "pending");

    res.status(201).json({
      success: true,
      deposit: {
        id: result.lastInsertRowid,
        amount,
        method,
        phone,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("Erreur dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   POST /wallet/confirm-deposit
   — l'utilisateur saisit le code de transaction reçu par SMS
   ============================================================ */
router.post("/wallet/confirm-deposit", requireAuth, (req, res) => {
  const { depositId, transactionCode } = req.body;
  const userId = req.user.id;

  if (!depositId || !transactionCode) {
    return res
      .status(400)
      .json({ error: "ID dépôt et code transaction requis" });
  }

  try {
    const deposit = db
      .prepare("SELECT * FROM deposits WHERE id = ? AND user_id = ?")
      .get(depositId, userId);

    if (!deposit) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({ error: "Ce dépôt a déjà été traité" });
    }

    // Enregistrer le code de transaction et marquer en attente admin
    db.prepare(
      `
      UPDATE deposits
      SET transaction_code = ?, status = 'pending_admin', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(transactionCode, depositId);

    res.json({
      success: true,
      message:
        "Code enregistré. En attente de validation par l'administrateur.",
      deposit: {
        id: depositId,
        status: "pending_admin",
      },
    });
  } catch (err) {
    console.error("Erreur confirmation dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   GET /wallet/deposits  — historique des dépôts de l'utilisateur
   ============================================================ */
router.get("/wallet/deposits", requireAuth, (req, res) => {
  const userId = req.user.id;

  try {
    const deposits = db
      .prepare(
        `
      SELECT id, amount, method, phone, transaction_code, status, created_at
      FROM deposits
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `,
      )
      .all(userId);

    res.json({ deposits });
  } catch (err) {
    console.error("Erreur récupération dépôts :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   ADMIN : GET /admin/deposits/pending
   — l'admin voit toutes les demandes en attente
   ============================================================ */
router.get("/admin/deposits/pending", requireAuth, (req, res) => {
  // Vérifier que l'utilisateur est admin (tu peux adapter selon ton système)
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }

  try {
    const deposits = db
      .prepare(
        `
      SELECT d.id, d.amount, d.method, d.phone, d.transaction_code,
             d.created_at, u.username, u.phone AS user_phone
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'pending_admin'
      ORDER BY d.created_at ASC
    `,
      )
      .all();

    res.json({ deposits });
  } catch (err) {
    console.error("Erreur admin dépôts :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   ADMIN : POST /admin/deposits/approve
   — l'admin valide un dépôt → crédite le solde
   ============================================================ */
router.post("/admin/deposits/approve", requireAuth, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }

  const { depositId } = req.body;
  const adminId = req.user.id;

  if (!depositId) {
    return res.status(400).json({ error: "ID dépôt requis" });
  }

  try {
    const deposit = db
      .prepare("SELECT * FROM deposits WHERE id = ?")
      .get(depositId);

    if (!deposit) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    if (deposit.status !== "pending_admin") {
      return res.status(400).json({ error: "Ce dépôt n'est pas en attente" });
    }

    // Créditer le solde de l'utilisateur
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(deposit.user_id);
    const newBalance = (user.balance || 0) + deposit.amount;
    db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(
      newBalance,
      deposit.user_id,
    );

    // Marquer le dépôt comme approuvé
    db.prepare(
      `
      UPDATE deposits
      SET status = 'approved', validated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(adminId, depositId);

    // Optionnel : ajouter une notification pour l'utilisateur
    // (à implémenter selon ton système de notifications)

    res.json({
      success: true,
      message: `Dépôt de ${deposit.amount} FCFA approuvé et crédité.`,
    });
  } catch (err) {
    console.error("Erreur approbation dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ============================================================
   ADMIN : POST /admin/deposits/reject
   — l'admin refuse un dépôt
   ============================================================ */
router.post("/admin/deposits/reject", requireAuth, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  }

  const { depositId } = req.body;
  const adminId = req.user.id;

  if (!depositId) {
    return res.status(400).json({ error: "ID dépôt requis" });
  }

  try {
    const deposit = db
      .prepare("SELECT * FROM deposits WHERE id = ?")
      .get(depositId);

    if (!deposit) {
      return res.status(404).json({ error: "Dépôt introuvable" });
    }

    if (deposit.status !== "pending_admin") {
      return res.status(400).json({ error: "Ce dépôt n'est pas en attente" });
    }

    db.prepare(
      `
      UPDATE deposits
      SET status = 'rejected', validated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(adminId, depositId);

    res.json({
      success: true,
      message: `Dépôt de ${deposit.amount} FCFA refusé.`,
    });
  } catch (err) {
    console.error("Erreur rejet dépôt :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
