// backend/services/telegram.js
const axios = require("axios");

async function notifyAdmins(message) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const ids = (process.env.TELEGRAM_ADMIN_CHAT_IDS || "")
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);

    if (!token || !ids.length) {
      console.warn("Telegram not configured properly");
      return;
    }

    const baseUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    await Promise.all(
      ids.map(chatId =>
        axios
          .post(baseUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
          })
          .catch(err => {
            console.error(
              "Telegram send error:",
              err.response?.data || err.message
            );
          })
      )
    );
  } catch (e) {
    console.error("notifyAdmins error:", e.message);
  }
}

module.exports = { notifyAdmins };
