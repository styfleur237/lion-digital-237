const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialiser la DB
let db;
(async () => {
  const { getDb } = require("./database/init");
  db = await getDb();
  console.log("[DB] Prête");
})();

// Middleware pour injecter db
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const walletRoutes = require("./routes/wallet");
const referralRoutes = require("./routes/referrals");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin", adminRoutes);

const walletRoutes = require("./routes/wallet");
app.use("/", walletRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "Lion Digital 237 API",
    version: "2.0.0",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Lion Digital 237 API sur le port ${PORT}`);
});
