const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token manquant ou invalide." });
    }

    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const db = req.db;
    const result = db.exec(`SELECT * FROM users WHERE id = ${decoded.id}`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    const row = result[0].values[0];
    const cols = result[0].columns;

    req.user = {
      id: row[cols.indexOf("id")],
      username: row[cols.indexOf("username")],
      phone: row[cols.indexOf("phone")],
      password: row[cols.indexOf("password")],
      balance: row[cols.indexOf("balance")],
      referralCode: row[cols.indexOf("referralCode")],
      referredBy: row[cols.indexOf("referredBy")],
      role: row[cols.indexOf("role")],
      referralRewards: row[cols.indexOf("referralRewards")],
      createdAt: row[cols.indexOf("createdAt")],
    };
    req.userId = req.user.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Session expirée. Reconnectez-vous." });
    }
    return res.status(401).json({ error: "Token invalide." });
  }
};

module.exports = auth;
