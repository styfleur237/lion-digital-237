const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const router = express.Router();

router.get("/stats", auth, admin, (req, res) => {
  const db = req.db;
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const totalBalance = db
    .prepare("SELECT COALESCE(SUM(balance), 0) as total FROM users")
    .get();
  const totalDeposits = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits")
    .get();
  const totalWithdrawals = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals")
    .get();
  const activeProducts = db
    .prepare("SELECT COUNT(*) as count FROM active_products")
    .get();

  res.json({
    totalUsers: totalUsers.count,
    totalBalance: totalBalance.total,
    totalDeposits: totalDeposits.total,
    totalWithdrawals: totalWithdrawals.total,
    activeProductCount: activeProducts.count,
  });
});

router.get("/users", auth, admin, (req, res) => {
  const db = req.db;
  const users = db
    .prepare(
      "SELECT id, username, phone, balance, role, referralRewards, createdAt FROM users ORDER BY id DESC LIMIT 100",
    )
    .all();
  res.json({ total: users.length, users });
});

router.post("/withdraw/:id/process", auth, admin, (req, res) => {
  const db = req.db;
  const { status } = req.body;
  const withdrawal = db
    .prepare("SELECT * FROM withdrawals WHERE id = ?")
    .get(req.params.id);
  if (!withdrawal)
    return res.status(404).json({ error: "Retrait introuvable." });

  if (status === "Refusé" && withdrawal.status === "En cours") {
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(
      withdrawal.amount,
      withdrawal.userId,
    );
  }

  db.prepare("UPDATE withdrawals SET status = ? WHERE id = ?").run(
    status || "Traité",
    req.params.id,
  );
  res.json({ success: true, message: `Retrait ${status || "traité"}.` });
});

module.exports = router;
