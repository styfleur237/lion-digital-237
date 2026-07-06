const express = require("express");
const auth = require("../middleware/auth");
const { saveDb } = require("../database/init");
const router = express.Router();

router.get("/balance", auth, (req, res) => {
  res.json({ balance: req.user.balance, username: req.user.username });
});

router.post("/deposit", auth, (req, res) => {
  try {
    const { amount, method } = req.body;
    const db = req.db;
    const amt = Number(amount);
    if (!amt || amt < 500)
      return res.status(400).json({ error: "Montant minimum : 500 FCFA." });

    db.run(
      `UPDATE users SET balance = balance + ${amt} WHERE id = ${req.userId}`,
    );
    const escMethod = (method || "MTN Mobile Money").replace(/'/g, "''");
    db.run(
      `INSERT INTO deposits (userId, amount, method) VALUES (${req.userId}, ${amt}, '${escMethod}')`,
    );
    saveDb();

    const result = db.exec(
      `SELECT balance FROM users WHERE id = ${req.userId}`,
    );
    const balance = result[0].values[0][0];
    const lastDeposit = db.exec(
      `SELECT * FROM deposits WHERE id = (SELECT MAX(id) FROM deposits WHERE userId = ${req.userId})`,
    );

    let deposit = {
      id: Date.now(),
      amount: amt,
      method: escMethod,
      status: "Validé",
      date: new Date().toISOString(),
    };
    if (lastDeposit.length > 0 && lastDeposit[0].values.length > 0) {
      const row = lastDeposit[0].values[0];
      const cols = lastDeposit[0].columns;
      deposit = {
        id: row[cols.indexOf("id")],
        amount: row[cols.indexOf("amount")],
        method: row[cols.indexOf("method")],
        status: row[cols.indexOf("status")],
        date: row[cols.indexOf("date")],
      };
    }

    res.json({
      success: true,
      balance,
      deposit,
      message: `Dépôt de ${amt.toLocaleString("fr-FR")} FCFA effectué.`,
    });
  } catch (err) {
    console.error("[Wallet] Deposit:", err);
    res.status(500).json({ error: "Erreur lors du dépôt." });
  }
});

router.post("/withdraw", auth, (req, res) => {
  try {
    const { amount, method } = req.body;
    const db = req.db;
    const amt = Number(amount);
    if (!amt || amt < 1000)
      return res.status(400).json({ error: "Montant minimum : 1 000 FCFA." });
    if (amt > req.user.balance)
      return res.status(400).json({ error: "Solde insuffisant." });

    db.run(
      `UPDATE users SET balance = balance - ${amt} WHERE id = ${req.userId}`,
    );
    const escMethod = (method || "MTN Mobile Money").replace(/'/g, "''");
    db.run(
      `INSERT INTO withdrawals (userId, amount, method, status) VALUES (${req.userId}, ${amt}, '${escMethod}', 'En cours')`,
    );
    saveDb();

    const result = db.exec(
      `SELECT balance FROM users WHERE id = ${req.userId}`,
    );
    const balance = result[0].values[0][0];

    res.json({
      success: true,
      balance,
      withdrawal: {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: amt,
        method: escMethod,
        status: "En cours",
      },
      message: `Demande de retrait de ${amt.toLocaleString("fr-FR")} FCFA envoyée.`,
    });
  } catch (err) {
    console.error("[Wallet] Withdraw:", err);
    res.status(500).json({ error: "Erreur lors du retrait." });
  }
});

router.get("/history", auth, (req, res) => {
  const db = req.db;

  const depositsResult = db.exec(
    `SELECT * FROM deposits WHERE userId = ${req.userId} ORDER BY id DESC LIMIT 50`,
  );
  const deposits = [];
  if (depositsResult.length > 0) {
    const cols = depositsResult[0].columns;
    for (const row of depositsResult[0].values) {
      deposits.push({
        id: row[cols.indexOf("id")],
        userId: row[cols.indexOf("userId")],
        date: row[cols.indexOf("date")],
        amount: row[cols.indexOf("amount")],
        method: row[cols.indexOf("method")],
        status: row[cols.indexOf("status")],
      });
    }
  }

  const withdrawalsResult = db.exec(
    `SELECT * FROM withdrawals WHERE userId = ${req.userId} ORDER BY id DESC LIMIT 50`,
  );
  const withdrawals = [];
  if (withdrawalsResult.length > 0) {
    const cols = withdrawalsResult[0].columns;
    for (const row of withdrawalsResult[0].values) {
      withdrawals.push({
        id: row[cols.indexOf("id")],
        userId: row[cols.indexOf("userId")],
        date: row[cols.indexOf("date")],
        amount: row[cols.indexOf("amount")],
        method: row[cols.indexOf("method")],
        status: row[cols.indexOf("status")],
      });
    }
  }

  const purchasesResult = db.exec(
    `SELECT * FROM purchases WHERE userId = ${req.userId} ORDER BY id DESC LIMIT 50`,
  );
  const purchases = [];
  if (purchasesResult.length > 0) {
    const cols = purchasesResult[0].columns;
    for (const row of purchasesResult[0].values) {
      purchases.push({
        id: row[cols.indexOf("id")],
        userId: row[cols.indexOf("userId")],
        date: row[cols.indexOf("date")],
        product: row[cols.indexOf("product")],
        amount: row[cols.indexOf("amount")],
      });
    }
  }

  const activeResult = db.exec(
    `SELECT * FROM active_products WHERE userId = ${req.userId}`,
  );
  const activeProducts = [];
  if (activeResult.length > 0) {
    const cols = activeResult[0].columns;
    for (const row of activeResult[0].values) {
      activeProducts.push({
        id: row[cols.indexOf("id")],
        userId: row[cols.indexOf("userId")],
        productId: row[cols.indexOf("productId")],
        purchasedAt: row[cols.indexOf("purchasedAt")],
        daysLeft: row[cols.indexOf("daysLeft")],
      });
    }
  }

  res.json({ deposits, withdrawals, purchases, activeProducts });
});

module.exports = router;
