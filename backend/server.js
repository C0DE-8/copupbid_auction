const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { ping } = require("./db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const PaymentRoutes = require("./routes/payment");
const ShopRoutes = require("./routes/shop");
const HeistRoutes = require("./routes/heists");

const { startAuctionPendingToHoldJob, startAuctionCloseJob } = require("./jobs/auctionStatus.cron");
startAuctionCloseJob();
startAuctionPendingToHoldJob();
const { startHeistStatusJob } = require("./jobs/heistStatus.cron");
startHeistStatusJob();

// require('./jobs/winners').start();

dotenv.config();

const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,     // avoids cross-origin isolation
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));


app.use(cors());
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ limit: "60mb", extended: true }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.json({ ok: true, name: "CopupBid backend running 🚀 GOD-DID-ITS-AGAIN" }));
app.get("/copupbid", (req, res) => res.json({ message: "CopupBid backend running 🚀" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", PaymentRoutes);
app.use("/api/shop", ShopRoutes);
app.use("/api/heists", HeistRoutes);

app.use("/pages", express.static(path.join(process.cwd(), "pages"), { extensions: ["html"] }));

// (Optional) also allow /pages/affilate-h.html/:heistId/:referrerId
app.get("/pages/affilate-h.html/:heistId/:referrerId", (req, res) => {
  res.sendFile(path.join(process.cwd(), "pages", "affilate-h.html"));
});

app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "db_error" });
  }
});


// app.get("/payment-result", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "payment-result.html"));
// });

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
