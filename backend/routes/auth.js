// routes/auth.js  (CommonJS)
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const {
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
} = require("../lib/mail");

const router = express.Router();

/* ------------------------------ helpers ------------------------------ */
function generateReferralCode() {
  return Math.random().toString(36).slice(2, 8); // 6 chars
}
function generateWalletAddress() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let walletAddress = "cop";
  for (let i = 0; i < 20; i++) {
    walletAddress += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return walletAddress;
}
function generateGameId() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n) =>
    Array.from({ length: n }, () => base[Math.floor(Math.random() * base.length)]).join("");
  return `${pick(4)}-${pick(4)}-${pick(4)}`;
}

/* ------------------------------- SEND OTP ------------------------------- */
// POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (exists.length) return res.status(400).json({ message: "Email already registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email, otp, expiresAt]
    );

    await sendRegistrationOtpEmail(email, otp, name || "New CopUp User");
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("send-otp error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

/* -------------------------------- REGISTER ------------------------------- */
// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, full_name, password, otp, referralCode } = req.body || {};
    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: "username, email, password, otp are required" });
    }

    const [[dupEmail]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE email = ?", [email]);
    if (dupEmail.c) return res.status(400).json({ message: "Email already exists" });

    const [[dupUser]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE username = ?", [username]);
    if (dupUser.c) return res.status(400).json({ message: "Username already exists" });

    if (full_name) {
      const [[dupFull]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE full_name = ?", [full_name]);
      if (dupFull.c) return res.status(400).json({ message: "Full name already exists" });
    }

    // OTP check + expiry
    const [otpRows] = await pool.query(
      "SELECT email, otp, expires_at FROM otps WHERE email = ? AND otp = ? LIMIT 1",
      [email, otp]
    );
    if (!otpRows.length) return res.status(400).json({ message: "Invalid OTP" });
    if (new Date(otpRows[0].expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userReferralCode = generateReferralCode();
    const walletAddress = generateWalletAddress();
    const gameId = generateGameId();

    // ⬇️ No `profile` field here anymore
    const [result] = await pool.query(
      `INSERT INTO users
        (email, username, full_name, password_hash, role, is_verified, is_blocked, referral_code, wallet_address, game_id)
       VALUES
        (?, ?, ?, ?, 'user', 1, 0, ?, ?, ?)`,
      [email, username, full_name || null, password_hash, userReferralCode, walletAddress, gameId]
    );

    const newUserId = result.insertId;

    if (referralCode) {
      const [refRows] = await pool.query("SELECT id FROM users WHERE referral_code = ? LIMIT 1", [referralCode]);
      if (refRows.length) {
        await pool.query("INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)", [
          refRows[0].id,
          newUserId,
        ]);
      }
    }

    await pool.query("DELETE FROM otps WHERE email = ?", [email]);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

/* ---------------------------------- LOGIN --------------------------------- */
// POST /api/auth/login  (identifier = email OR username)
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ message: "identifier and password are required" });
    }

    const [rows] = await pool.query(
      `SELECT id, email, username, password_hash, role, is_verified, is_blocked
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 1`,
      [identifier, identifier]
    );
    const user = rows[0];

    if (!user || !user.is_verified) {
      return res.status(401).json({ message: "Invalid credentials or account not verified" });
    }
    if (user.is_blocked) return res.status(403).json({ message: "Account is blocked" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Error logging in" });
  }
});

/* ------------------------- FORGOT / RESET PASSWORD ------------------------ */
// POST /api/auth/forget-password
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });

    const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows.length) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email, otp, expiresAt]
    );

    await sendPasswordResetOtpEmail(email, otp);
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("forget-password error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "email, otp, newPassword are required" });
    }

    const [otpRows] = await pool.query(
      "SELECT otp, expires_at FROM otps WHERE email = ? AND otp = ? LIMIT 1",
      [email, otp]
    );
    if (!otpRows.length) return res.status(400).json({ message: "Invalid OTP" });
    if (new Date(otpRows[0].expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE email = ?", [password_hash, email]);

    await pool.query("DELETE FROM otps WHERE email = ?", [email]);

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;
