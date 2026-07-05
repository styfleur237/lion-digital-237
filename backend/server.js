const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
require("dotenv").config();

const db = require("./database/init");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const walletRoutes = require("./routes/wallet");
const referralRoutes = require("./routes/referrals");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Injecter la DB dans chaque requête
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Trop de requêtes, veuillez réessayer plus tard." },
});
app.use("/api/", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Reset quotidien à minuit
const { resetDaily } = require("./utils/reset");
cron.schedule("0 0 * * *", () => {
  console.log("[CRON] Reset quotidien des comptes...");
  resetDaily(db);
});
app.get("/", (req, res) => {
  res.json({
    name: "Lion Digital 237 API",
    version: "2.0.0",
    status: "running",
  });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Lion Digital 237 API sur http://0.0.0.0:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
