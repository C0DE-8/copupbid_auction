// routes/payment.copup.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const { pool } = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { notifyAdmins } = require("../services/telegram");

// ✅ mailer
const {
  sendCopupTopupSuccessEmail,
  sendCopupTopupFailedEmail,
} = require("../lib/mail");

// ENV
const FLW_BASE_URL = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY;

const APP_NAME = process.env.APP_NAME || "CopUpBid";

// backend base (for redirect_url)
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";

// ✅ frontend base (React route lives here)
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

/* ----------------------------- HELPERS ----------------------------- */
function makeTxRef(userId) {
  return `COPUP-${userId}-${Date.now()}`;
}

function flwHeaders() {
  if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

function isBadStatus(s) {
  const v = String(s || "").toLowerCase();
  return v === "failed" || v === "cancelled" || v === "canceled";
}

function isOkStatus(s) {
  // Flutterwave can send: successful, completed
  const v = String(s || "").toLowerCase();
  return v === "successful" || v === "completed";
}

/* ============================================================================
   POST /api/payment/copup/init
   Body: { amount_ngn }
   Returns: { ok, payment_link, tx_ref, amount_ngn }
============================================================================ */
router.post("/copup/init", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let { amount_ngn } = req.body || {};

    amount_ngn = Number(amount_ngn || 0);
    if (!amount_ngn || amount_ngn <= 0) {
      return res.status(400).json({ ok: false, message: "amount_ngn must be > 0" });
    }

    if (!FLW_PUBLIC_KEY || !FLW_SECRET_KEY) {
      return res.status(500).json({ ok: false, message: "Flutterwave keys not configured" });
    }

    // Ensure coin_rate exists
    const [[rate]] = await pool.query(
      "SELECT unit, price, currency FROM coin_rate WHERE id = 1 LIMIT 1"
    );
    if (!rate || !(Number(rate.unit) > 0) || !(Number(rate.price) > 0)) {
      console.error("[copup/init] coin_rate invalid:", rate);
      return res.status(500).json({
        ok: false,
        message: "Coin rate not configured. Please try again later.",
      });
    }

    const tx_ref = makeTxRef(userId);

    const [[user]] = await pool.query(
      "SELECT id, full_name, username, email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // Flutterwave redirect back to verify route (backend)
    const redirect_url = `${API_BASE_URL}/api/payment/copup/verify`;

    // Log pending topup first
    await pool.query(
      `INSERT INTO copup_topups (user_id, tx_ref, flw_tx_id, amount, currency, copup_coin, status)
       VALUES (?, ?, '', ?, 'NGN', 0, 'pending')`,
      [userId, tx_ref, amount_ngn]
    );

    const payload = {
      tx_ref,
      amount: amount_ngn,
      currency: "NGN",
      redirect_url,
      payment_options: "card,ussd,banktransfer",
      customer: {
        email: user.email,
        name: user.full_name || user.username || `User #${user.id}`,
      },
      customizations: {
        title: `${APP_NAME} CopUp Coin Top-up`,
        description: `Top-up for CopUp Coin balance`,
      },
    };

    const fwRes = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
      headers: flwHeaders(),
    });

    const data = fwRes.data;
    if (data.status !== "success") {
      console.error("[copup/init] Flutterwave init error:", data);
      try {
        await pool.query("UPDATE copup_topups SET status='failed' WHERE tx_ref=?", [tx_ref]);
      } catch (_) {}
      return res.status(500).json({ ok: false, message: "Unable to init payment" });
    }

    const paymentLink = data.data?.link;
    if (!paymentLink) {
      try {
        await pool.query("UPDATE copup_topups SET status='failed' WHERE tx_ref=?", [tx_ref]);
      } catch (_) {}
      return res.status(500).json({ ok: false, message: "Payment link not returned" });
    }

    return res.json({
      ok: true,
      payment_link: paymentLink,
      tx_ref,
      amount_ngn,
    });
  } catch (err) {
    console.error("[copup/init] error:", err.response?.data || err.message || err);
    return res.status(500).json({ ok: false, message: "Error initiating payment" });
  }
});

/* ============================================================================
   GET /api/payment/copup/verify
   Flutterwave redirect query:
   ?status=successful|completed&tx_ref=...&transaction_id=...
   -> verifies, credits bid_points, telegram + email alerts, redirects to frontend /payment-result
============================================================================ */
router.get("/copup/verify", async (req, res) => {
  const { status, tx_ref, transaction_id } = req.query || {};

  console.log("[copup/verify] incoming:", { status, tx_ref, transaction_id });

  if (!tx_ref || !transaction_id) {
    return res.status(400).json({ ok: false, message: "Missing tx_ref or transaction_id" });
  }

  // If Flutterwave clearly says failed/cancelled
  if (isBadStatus(status)) {
    try {
      await pool.query("UPDATE copup_topups SET status = 'failed' WHERE tx_ref = ?", [tx_ref]);

      const [[row]] = await pool.query(
        `SELECT c.amount, c.currency, u.email, u.full_name, u.username
         FROM copup_topups c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.tx_ref = ?
         LIMIT 1`,
        [tx_ref]
      );

      if (row && row.email) {
        const displayName = row.full_name || row.username || row.email;
        sendCopupTopupFailedEmail(row.email, {
          name: displayName,
          amount: Number(row.amount || 0),
          currency: row.currency || "NGN",
          txRef: tx_ref,
          reason: "Payment not completed or was cancelled.",
        }).catch((e) => console.error("[copup/verify] failed email error:", e.message));
      }
    } catch (e) {
      console.error("[copup/verify] failed-status handler error:", e.message);
    }

    return res.redirect(
      `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
        "Payment not successful"
      )}`
    );
  }

  // If status is something unknown, DO NOT fail early — still verify with Flutterwave
  // because Flutterwave sometimes returns "completed".
  if (!FLW_SECRET_KEY) {
    return res.status(500).json({ ok: false, message: "Flutterwave secret key not configured" });
  }

  try {
    // verify with Flutterwave
    const verifyRes = await axios.get(
      `${FLW_BASE_URL}/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    const data = verifyRes.data;
    if (data.status !== "success") {
      console.error("[copup/verify] Flutterwave verify error:", data);
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "Verification failed"
        )}`
      );
    }

    const tx = data.data;

    // Strong safety checks
    if (!tx) {
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "No transaction data"
        )}`
      );
    }

    const txStatus = String(tx.status || "").toLowerCase();
    const txRefFromFw = String(tx.tx_ref || "");

    console.log("[copup/verify] flutterwave tx:", {
      txStatus,
      tx_ref_fw: txRefFromFw,
      tx_ref_local: tx_ref,
      amount: tx.amount,
      currency: tx.currency,
      id: tx.id,
    });

    if (txRefFromFw !== String(tx_ref)) {
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "Transaction mismatch"
        )}`
      );
    }

    // Accept successful/completed from FW verify result
    const okTx = txStatus === "successful" || txStatus === "completed";
    if (!okTx) {
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "Payment not successful"
        )}`
      );
    }

    const amountPaid = Number(tx.amount || 0);
    const currencyPaid = tx.currency || "NGN";
    const flwId = String(tx.id);

    // Get existing topup record
    const [[topup]] = await pool.query("SELECT * FROM copup_topups WHERE tx_ref = ? LIMIT 1", [
      tx_ref,
    ]);

    if (!topup) {
      console.warn("[copup/verify] copup_topups not found for tx_ref:", tx_ref);
      // create fallback record (optional)
      // If you want hard fail instead, replace this with redirect failure.
    }

    // If already marked successful, don't double credit
    if (topup && String(topup.status).toLowerCase() === "successful") {
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=success&reason=${encodeURIComponent(
          "Already credited"
        )}`
      );
    }

    const userId = topup?.user_id;
    if (!userId) {
      console.error("[copup/verify] No userId for tx_ref:", tx_ref);
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "User not found for this payment"
        )}`
      );
    }

    // Get coin rate from DB (assumed NGN-based)
    const [[rate]] = await pool.query(
      "SELECT unit, price, currency FROM coin_rate WHERE id = 1 LIMIT 1"
    );

    if (!rate || !(Number(rate.unit) > 0) || !(Number(rate.price) > 0)) {
      console.error("[copup/verify] coin_rate invalid:", rate);
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "Coin rate not configured"
        )}`
      );
    }

    const unit = Number(rate.unit); // e.g. 10 coins
    const pricePerUnit = Number(rate.price); // e.g. 1000 NGN for 10 coins

    // coins = (paid_amount / pricePerUnit) * unit
    let copupCoin = Math.floor((amountPaid / pricePerUnit) * unit);
    if (!Number.isFinite(copupCoin) || copupCoin < 0) copupCoin = 0;

    // Begin DB transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE copup_topups
           SET flw_tx_id = ?, amount = ?, currency = ?, copup_coin = ?, status = 'successful'
         WHERE tx_ref = ?`,
        [flwId, amountPaid, currencyPaid, copupCoin, tx_ref]
      );

      await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [
        copupCoin,
        userId,
      ]);

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      console.error("[copup/verify] DB transaction error:", e.message);
      return res.redirect(
        `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
          "Server error crediting balance"
        )}`
      );
    } finally {
      conn.release();
    }

    // fetch user for notifications
    const [[user]] = await pool.query(
      "SELECT full_name, email, username FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const displayName = user?.full_name || user?.username || user?.email || `User #${userId}`;

    // Telegram alert for admins
    await notifyAdmins(
      `💰 <b>New CopUp Coin Top-up</b>\n\n` +
        `<b>User:</b> ${displayName}\n` +
        `<b>Amount:</b> ${amountPaid} ${currencyPaid}\n` +
        `<b>Rate:</b> ${unit} coins for ${pricePerUnit} ${rate.currency || "NGN"}\n` +
        `<b>Credited:</b> ${copupCoin} CopUp Coin\n` +
        `<b>Tx Ref:</b> <code>${tx_ref}</code>\n` +
        `<b>FLW Tx ID:</b> <code>${flwId}</code>`
    );

    // User success email
    if (user?.email) {
      sendCopupTopupSuccessEmail(user.email, {
        name: displayName,
        coins: copupCoin,
        amount: amountPaid,
        currency: currencyPaid,
        txRef: tx_ref,
      }).catch((e) => console.error("[copup/verify] success email error:", e.message));
    }

    // ✅ redirect success to React
    return res.redirect(
      `${FRONTEND_BASE_URL}/payment-result?status=success&coins=${copupCoin}&amount=${amountPaid}`
    );
  } catch (err) {
    console.error("[copup/verify] verify error:", err.response?.data || err.message || err);
    return res.redirect(
      `${FRONTEND_BASE_URL}/payment-result?status=failed&reason=${encodeURIComponent(
        "Verification error"
      )}`
    );
  }
});

module.exports = router;