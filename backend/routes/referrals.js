const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/stats", auth, (req, res) => {
  const db = req.db;
  const refResult = db.exec(
    `SELECT * FROM referrals WHERE referrerId = ${req.userId}`,
  );
  const referrals = [];
  let validated = 0;

  if (refResult.length > 0) {
    const cols = refResult[0].columns;
    for (const row of refResult[0].values) {
      const ref = {
        id: row[cols.indexOf("id")],
        referrerId: row[cols.indexOf("referrerId")],
        username: row[cols.indexOf("username")],
        validated: row[cols.indexOf("validated")],
        reward: row[cols.indexOf("reward")],
      };
      referrals.push(ref);
      if (ref.validated) validated++;
    }
  }

  res.json({
    referralCode: req.user.referralCode,
    direct: referrals.length,
    validated,
    rewards: req.user.referralRewards || 0,
    referrals,
  });
});

router.get("/check/:code", (req, res) => {
  const db = req.db;
  const escCode = req.params.code.replace(/'/g, "''");
  const result = db.exec(
    `SELECT username FROM users WHERE referralCode = '${escCode}'`,
  );
  const valid = result.length > 0 && result[0].values.length > 0;
  const referrer = valid ? result[0].values[0][0] : null;
  res.json({ valid, referrer });
});

module.exports = router;
