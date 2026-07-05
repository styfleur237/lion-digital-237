const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/balance", auth, (req, res) => {
  const db = req.db;
  const user = db
    .prepare("SELECT balance FROM users WHERE id = ?")
    .get(req.userId);
  res.json({ balance: user.balance });
});

router.post("/deposit", auth, (req, res) => {
  try {
    const { amount, method } = req.body;
    const db = req.db;
    const amt = Number(amount);

    if (!amt || amt < 500)
      return res.status(400).json({ error: "Montant minimum : 500 FCFA." });

    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(
      amt,
      req.userId,
    );
    const result = db
      .prepare("INSERT INTO deposits (userId, amount, method) VALUES (?, ?, ?)")
      .run(req.userId, amt, method || "MTN Mobile Money");

    const user = db
      .prepare("SELECT balance FROM users WHERE id = ?")
      .get(req.userId);
    const deposit = db
      .prepare("SELECT * FROM deposits WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({ success: true, balance: user.balance, deposit });
  } catch (err) {
    console.error("[Wallet] Deposit error:", err);
    res.status(500).json({ error: "Erreur lors du dépôt." });
  }
});

router.post("/withdraw", auth, (req, res) => {
  try {
    const { amount, method, phone } = req.body;
    const db = req.db;
    const amt = Number(amount);

    if (!amt || amt < 1000)
      return res.status(400).json({ error: "Montant minimum : 1 000 FCFA." });

    const user = db
      .prepare("SELECT balance FROM users WHERE id = ?")
      .get(req.userId);
    if (amt > user.balance)
      return res.status(400).json({ error: "Solde insuffisant." });

    db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(
      amt,
      req.userId,
    );
    const result = db
      .prepare(
        "INSERT INTO withdrawals (userId, amount, method, status) VALUES (?, ?, ?, ?)",
      )
      .run(req.userId, amt, method || "MTN Mobile Money", "En cours");

    const updatedUser = db
      .prepare("SELECT balance FROM users WHERE id = ?")
      .get(req.userId);
    const withdrawal = db
      .prepare("SELECT * FROM withdrawals WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({ success: true, balance: updatedUser.balance, withdrawal });
  } catch (err) {
    console.error("[Wallet] Withdraw error:", err);
    res.status(500).json({ error: "Erreur lors du retrait." });
  }
});

router.get("/history", auth, (req, res) => {
  const db = req.db;
  const userId = req.userId;
  res.json({
    deposits: db
      .prepare("SELECT * FROM deposits WHERE userId = ? ORDER BY id DESC")
      .all(userId),
    withdrawals: db
      .prepare("SELECT * FROM withdrawals WHERE userId = ? ORDER BY id DESC")
      .all(userId),
    purchases: db
      .prepare("SELECT * FROM purchases WHERE userId = ? ORDER BY id DESC")
      .all(userId),
    activeProducts: db
      .prepare("SELECT * FROM active_products WHERE userId = ?")
      .all(userId),
  });
});

module.exports = router;
