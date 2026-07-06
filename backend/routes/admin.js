const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { saveDb } = require("../database/init");
const router = express.Router();

router.get("/stats", auth, admin, (req, res) => {
  const db = req.db;

  const usersCount = db.exec("SELECT COUNT(*) as count FROM users");
  const totalUsers = usersCount[0].values[0][0];

  const balanceSum = db.exec(
    "SELECT COALESCE(SUM(balance), 0) as total FROM users",
  );
  const totalBalance = balanceSum[0].values[0][0];

  const depositsSum = db.exec(
    "SELECT COALESCE(SUM(amount), 0) as total FROM deposits",
  );
  const totalDeposits = depositsSum[0].values[0][0];

  const withdrawalsSum = db.exec(
    "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals",
  );
  const totalWithdrawals = withdrawalsSum[0].values[0][0];

  const activeCount = db.exec("SELECT COUNT(*) as count FROM active_products");
  const activeProductCount = activeCount[0].values[0][0];

  res.json({
    totalUsers,
    totalBalance,
    totalDeposits,
    totalWithdrawals,
    activeProductCount,
  });
});

router.get("/users", auth, admin, (req, res) => {
  const db = req.db;
  const result = db.exec(
    "SELECT id, username, phone, balance, role, referralRewards, createdAt FROM users ORDER BY id DESC LIMIT 100",
  );
  const users = [];
  if (result.length > 0) {
    const cols = result[0].columns;
    for (const row of result[0].values) {
      users.push({
        id: row[cols.indexOf("id")],
        username: row[cols.indexOf("username")],
        phone: row[cols.indexOf("phone")],
        balance: row[cols.indexOf("balance")],
        role: row[cols.indexOf("role")],
        referralRewards: row[cols.indexOf("referralRewards")],
        createdAt: row[cols.indexOf("createdAt")],
      });
    }
  }
  res.json({ total: users.length, users });
});

router.post("/withdraw/:id/process", auth, admin, (req, res) => {
  const db = req.db;
  const { status } = req.body;
  const wid = parseInt(req.params.id);

  const wResult = db.exec(`SELECT * FROM withdrawals WHERE id = ${wid}`);
  if (wResult.length === 0 || wResult[0].values.length === 0) {
    return res.status(404).json({ error: "Retrait introuvable." });
  }

  const cols = wResult[0].columns;
  const row = wResult[0].values[0];
  const withdrawalStatus = row[cols.indexOf("status")];
  const withdrawalAmount = row[cols.indexOf("amount")];
  const withdrawalUserId = row[cols.indexOf("userId")];

  if (status === "Refusé" && withdrawalStatus === "En cours") {
    db.run(
      `UPDATE users SET balance = balance + ${withdrawalAmount} WHERE id = ${withdrawalUserId}`,
    );
  }

  const escStatus = (status || "Traité").replace(/'/g, "''");
  db.run(`UPDATE withdrawals SET status = '${escStatus}' WHERE id = ${wid}`);
  saveDb();

  res.json({ success: true, message: `Retrait ${escStatus.toLowerCase()}.` });
});

module.exports = router;
