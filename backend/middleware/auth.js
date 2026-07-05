const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token manquant ou invalide." });
    }

    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = req.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    req.user = user;
    req.userId = user.id;
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
