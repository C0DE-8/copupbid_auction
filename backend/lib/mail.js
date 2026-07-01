// lib/mail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function sendEmail(to, subject, html) {
  const from = process.env.SMTP_FROM || `CopUpBid <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ from, to, subject, html });
}

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Existing helpers ---------- */
function sendRegistrationOtpEmail(to, otp, name = "New CopUp User") {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; border:1px solid #ddd; border-radius:8px; padding:20px;">
      <h2 style="color:#56b2b7; text-align:center;">Welcome to CopUpBid!</h2>
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Use the OTP below to verify your email:</p>
      <div style="text-align:center; margin:20px 0;">
        <span style="font-size:24px; font-weight:bold; color:#56b2b7; padding:10px 20px; border:1px dashed #56b2b7; border-radius:4px; display:inline-block;">${otp}</span>
      </div>
      <p>This OTP expires in <strong>10 minutes</strong>.</p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;">
      <p style="font-size:12px; color:#999; text-align:center;">Automated message. Do not reply.</p>
    </div>
  `;
  return sendEmail(to, "Your OTP for CopUpBid Registration", html);
}

function sendPasswordResetOtpEmail(to, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; border:1px solid #ddd; border-radius:8px; padding:20px;">
      <h2 style="color:#56b2b7; text-align:center;">Reset your CopUpBid password</h2>
      <p>Your password reset OTP is:</p>
      <div style="text-align:center; margin:20px 0;">
        <span style="font-size:24px; font-weight:bold; color:#56b2b7; padding:10px 20px; border:1px dashed #56b2b7; border-radius:4px; display:inline-block;">${otp}</span>
      </div>
      <p>This OTP expires in <strong>10 minutes</strong>.</p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;">
      <p style="font-size:12px; color:#999; text-align:center;">Automated message. Do not reply.</p>
    </div>
  `;
  return sendEmail(to, "Your OTP for password reset", html);
}

/* ---------- NEW: auction started email ---------- */
function buildAuctionStartedHtml({ auctionName, auctionLink, imageUrl }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #eee;border-radius:8px;padding:20px;">
    <div style="text-align:center;font-weight:700;font-size:20px;color:#56b2b7;margin-bottom:12px;">CopupBid</div>
    <h2 style="margin:0 0 10px 0;">Auction is now <span style="color:#22aa55">ACTIVE</span> 🎉</h2>
    <p style="margin:0 0 12px 0;">The auction <strong>${escapeHtml(auctionName)}</strong> has just started. Place your bids now.</p>
    ${imageUrl ? `<img src="${imageUrl}" alt="Auction" style="max-width:100%;border-radius:6px;margin:10px 0;" />` : ""}
    <p style="margin:12px 0;">Open the auction:</p>
    <p><a href="${auctionLink}" style="display:inline-block;background:#56b2b7;color:#fff;text-decoration:none;border-radius:6px;padding:10px 14px;">View Auction</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">
    <p style="font-size:12px; color:#888;">This is an automated message. Please do not reply.</p>
  </div>`;
}

function sendAuctionStartedEmail(to, auctionName, auctionLink, imageUrl) {
  const html = buildAuctionStartedHtml({ auctionName, auctionLink, imageUrl });
  return sendEmail(to, `Auction started: ${auctionName}`, html);
}

function sendHeistStartedEmail(to, heistName, heistLink = "https://copupbid.top/heist") {
  const name = escapeHtml(heistName || "Heist");
  const year = new Date().getFullYear();
  const subject = `Heist "${name}" has started!`;

  const html = `
    <html>
      <body style="font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; background-color: #1c1c1c;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #2e2e2e; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); color: white;">
          <div style="text-align: center; background-color: rgb(86, 178, 183); padding: 15px 0; border-radius: 12px 12px 0 0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);">
            <h1 style="color: white; margin: 0; font-size: 32px;">Copupbid: Heist Mission</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: rgb(86, 178, 183); font-size: 28px; font-weight: bold;">
              The heist you joined, "${name}", has now started!
            </h2>
            <p style="font-size: 18px; color: #ccc; font-style: italic;">The clock is ticking, get ready for the mission!</p>
            <p style="font-size: 16px; color: #ccc;">
              Prepare for action, gear up, and make sure you're ready to contribute to the success of the mission!
            </p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${heistLink}"
                 style="padding: 12px 25px; background-color: rgb(86, 178, 183); color: white; text-decoration: none;
                        font-size: 18px; font-weight: bold; border-radius: 6px; text-transform: uppercase;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);">
                Enter the Heist
              </a>
            </div>
            <p style="font-size: 16px; color: #ccc; margin-top: 30px;">Only the best will survive. Are you ready?</p>
          </div>
          <div style="background-color: #1a1a1a; text-align: center; padding: 10px;">
            <p style="font-size: 14px; color: #777;">&copy; ${year} Copupbid. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}
/* ---------- NEW: CopUp coin top-up success email ---------- */
function buildCopupTopupSuccessHtml({ name, coins, amount, currency, txRef }) {
  const safeName = escapeHtml(name || "CopUpBid User");
  const safeCurrency = escapeHtml(currency || "USD");
  const safeTxRef = escapeHtml(txRef || "-");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:18px 20px;color:#fff;text-align:center;">
        <h1 style="margin:0;font-size:22px;">CopUpBid Top-up Successful ✅</h1>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 10px 0;">Hello <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 14px 0;">Your CopUp Coin top-up was successful and has been added to your balance.</p>

        <div style="margin:16px 0;padding:14px 16px;border-radius:10px;background:#f3f4f6;">
          <p style="margin:0 0 6px 0;"><strong>Amount Paid:</strong> ${amount} ${safeCurrency}</p>
          <p style="margin:0 0 6px 0;"><strong>Coins Credited:</strong> ${coins} CopUp Coins</p>
          <p style="margin:0;"><strong>Transaction Ref:</strong> <span style="font-family:monospace;">${safeTxRef}</span></p>
        </div>

        <p style="margin:0 0 10px 0;">You can now use your CopUp Coins to join auctions, heists, and other activities on CopUpBid.</p>
        <p style="margin:0 0 6px 0;">If you did not authorize this payment, please contact support immediately.</p>

        <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">
          This is an automated message from CopUpBid. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;
}

function sendCopupTopupSuccessEmail(to, { name, coins, amount, currency, txRef }) {
  const subject = `CopUpBid Top-up Successful: ${coins} Coins Added`;
  const html = buildCopupTopupSuccessHtml({ name, coins, amount, currency, txRef });
  return sendEmail(to, subject, html);
}

/* ---------- NEW: CopUp coin top-up failed email ---------- */
function buildCopupTopupFailedHtml({ name, amount, currency, txRef, reason }) {
  const safeName = escapeHtml(name || "CopUpBid User");
  const safeCurrency = escapeHtml(currency || "USD");
  const safeTxRef = escapeHtml(txRef || "-");
  const safeReason = escapeHtml(reason || "Payment was not completed.");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #fecaca;border-radius:12px;overflow:hidden;">
      <div style="background:#b91c1c;padding:18px 20px;color:#fff;text-align:center;">
        <h1 style="margin:0;font-size:22px;">CopUpBid Top-up Failed ❌</h1>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 10px 0;">Hello <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 12px 0;">Your recent attempt to top up CopUp Coins was not successful.</p>

        <div style="margin:16px 0;padding:14px 16px;border-radius:10px;background:#fef2f2;">
          <p style="margin:0 0 6px 0;"><strong>Attempted Amount:</strong> ${amount} ${safeCurrency}</p>
          <p style="margin:0 0 6px 0;"><strong>Transaction Ref:</strong> <span style="font-family:monospace;">${safeTxRef}</span></p>
          <p style="margin:0;"><strong>Status:</strong> ${safeReason}</p>
        </div>

        <p style="margin:0 0 10px 0;">No CopUp Coins have been added to your account for this transaction.</p>
        <p style="margin:0 0 6px 0;">If you were charged but did not receive coins, please contact support with your transaction reference.</p>

        <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">
          This is an automated message from CopUpBid. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;
}

function sendCopupTopupFailedEmail(to, { name, amount, currency, txRef, reason }) {
  const subject = `CopUpBid Top-up Failed`;
  const html = buildCopupTopupFailedHtml({ name, amount, currency, txRef, reason });
  return sendEmail(to, subject, html);
}

module.exports = {
  sendEmail,
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
  sendAuctionStartedEmail,  
  sendHeistStartedEmail, 
  sendCopupTopupSuccessEmail,
  sendCopupTopupFailedEmail
};
