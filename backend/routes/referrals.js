const express = require("express");
const router = express.Router();
const { getDb } = require("../database/init");
const { authenticate } = require("../middleware/auth");

// Stats des parrainages
router.get("/stats", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const direct = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE referred_by = ?",
    );
    const directCount = direct.getAsObject(userId).count;

    const validated = db.prepare(`
      SELECT COUNT(*) as count FROM users u
      INNER JOIN purchases p ON p.user_id = u.id
      WHERE u.referred_by = ?
    `);
    const validatedCount = validated.getAsObject(userId).count;

    const rewards = db.prepare(`
      SELECT COALESCE(SUM(r.amount), 0) as total FROM rewards r
      WHERE r.user_id = ?
    `);
    const rewardsTotal = rewards.getAsObject(userId).total;

    res.json({
      direct: directCount,
      validated: validatedCount,
      rewards: rewardsTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des filleuls avec leurs infos
router.get("/list", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const referrals = db.prepare(`
      SELECT id, username, phone, created_at, balance,
        (SELECT COUNT(*) FROM purchases WHERE user_id = users.id) as purchases_count,
        (SELECT SUM(amount) FROM purchases WHERE user_id = users.id) as purchases_total
      FROM users
      WHERE referred_by = ?
      ORDER BY created_at DESC
    `);
    const rows = referrals.getAsObject(userId);
    const list = rows ? (Array.isArray(rows) ? rows : [rows]) : [];

    res.json({ referrals: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
