const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/stats", auth, (req, res) => {
  const db = req.db;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const referrals = db
    .prepare("SELECT * FROM referrals WHERE referrerId = ?")
    .all(req.userId);
  const validated = referrals.filter((r) => r.validated).length;

  res.json({
    referralCode: user.referralCode,
    direct: referrals.length,
    validated,
    rewards: user.referralRewards,
    referrals,
  });
});

router.get("/check/:code", (req, res) => {
  const db = req.db;
  const referrer = db
    .prepare("SELECT username FROM users WHERE referralCode = ?")
    .get(req.params.code);
  res.json({
    valid: !!referrer,
    referrer: referrer ? referrer.username : null,
  });
});

module.exports = router;
