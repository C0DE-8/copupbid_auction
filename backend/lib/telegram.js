// lib/telegram.js
const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // set in your .env
if (!BOT_TOKEN) {
  console.warn("[telegram] TELEGRAM_BOT_TOKEN is not set. Notifications will fail.");
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a Telegram message to a single chatId.
 * @param {string|number} chatId
 * @param {string} text - Message text (supports HTML if parse_mode='HTML')
 * @param {object} opts - Optional Telegram sendMessage options
 *   e.g. { parse_mode: 'HTML', disable_web_page_preview: true }
 */
async function sendTelegramNotification(chatId, text, opts = {}) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode || "HTML",
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
    ...opts,
  };

  const url = `${API_BASE}/sendMessage`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
}

/**
 * Send the same message to multiple chatIds.
 * @param {Array<string|number>} chatIds
 * @param {string} text
 * @param {object} opts
 * @returns {{sent:number, failed:number, results:Array}}
 */
async function sendToMany(chatIds = [], text, opts = {}) {
  const results = await Promise.allSettled(
    chatIds.map((id) => sendTelegramNotification(id, text, opts))
  );
  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    results,
  };
}

module.exports = {
  sendTelegramNotification,
  sendToMany,
};
