// CopupBot //Service/copipbot.js

"use strict";

const OpenAI = (() => {
  try {
    return require("openai");
  } catch {
    return null;
  }
})();

let openai = null;
if (OpenAI && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ---------- Helpers ----------
function safeJsonParse(v, fallback) {
  try {
    if (v == null) return fallback;
    if (typeof v === "object") return v;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

// ✅ force answers to ONE WORD
function toOneWord(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/);
  return (m?.[0] || "").trim();
}

// ✅ enforce ONE WORD answers across list
function enforceOneWordVariants(list) {
  const out = [];
  const seenQ = new Set();

  for (const item of Array.isArray(list) ? list : []) {
    const q = String(item?.question || "").trim();
    const a = toOneWord(item?.answer || "");

    if (!q || !a) continue;

    const qKey = q.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenQ.has(qKey)) continue;

    seenQ.add(qKey);
    out.push({ question: q, answer: a });
  }

  return out;
}

// -------------------- Fallback generator --------------------
function fallbackGenerateVariantsFromStory(story, count = 5) {
  const clean = String(story || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const n = Math.min(60, Math.max(1, Number(count || 5)));

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  if (!sentences.length) {
    return [{ question: "What is the main event in the story?", answer: "event" }].slice(0, n);
  }

  const templates = [
    (s, a) => ({ question: `Who is mentioned here: "${s}"?`, answer: a }),
    (s, a) => ({ question: `What key detail is described here: "${s}"?`, answer: a }),
    (s, a) => ({ question: `Where does this happen: "${s}"?`, answer: a }),
    (s, a) => ({ question: `When does this happen: "${s}"?`, answer: a }),
    (s, a) => ({ question: `Why does this happen: "${s}"?`, answer: a }),
    (s, a) => ({ question: `How is this action described: "${s}"?`, answer: a }),
    (s, a) => ({ question: `What caused this event: "${s}"?`, answer: a }),
    (s, a) => ({ question: `What is the outcome here: "${s}"?`, answer: a }),
    (s, a) => ({ question: `Fill the missing word: "${s.replace(a, "_____")}"`, answer: a }),
    (s, a) => ({ question: `Which word completes: "${s.replace(a, "_____")}"?`, answer: a }),
  ];

  function extractAnswer(sentence) {
    const quoted = sentence.match(/"([^"]{1,60})"/);
    if (quoted) {
      const w = toOneWord(quoted[1]);
      if (w) return w;
    }

    const caps = sentence.match(/\b([A-Z][a-z]{2,20})\b/);
    if (caps) return toOneWord(caps[1]);

    const words = sentence
      .replace(/[^\w\s'-]/g, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

    for (const w of words) {
      const one = toOneWord(w);
      if (one && one.length >= 3) return one;
    }

    return "";
  }

  const usedSentence = new Set();
  const usedStructure = new Set();
  const out = [];

  let safety = 0;
  while (out.length < n && safety++ < 200) {
    const s = sentences[Math.floor(Math.random() * sentences.length)];
    if (!s || usedSentence.has(s)) continue;

    const a = extractAnswer(s);
    if (!a) continue;

    const tIndex = Math.floor(Math.random() * templates.length);
    if (usedStructure.has(tIndex) && usedStructure.size < templates.length) continue;

    usedSentence.add(s);
    usedStructure.add(tIndex);

    out.push(templates[tIndex](s, a));
  }

  while (out.length < n && usedSentence.size < sentences.length) {
    const s = sentences.find((x) => !usedSentence.has(x));
    if (!s) break;
    usedSentence.add(s);
    const a = extractAnswer(s);
    out.push(templates[out.length % templates.length](s, a));
  }

  return enforceOneWordVariants(out).slice(0, n);
}

// -------------------- AI generator --------------------
async function aiGenerateVariantsFromStory(story, count = 6) {
  if (!openai) return null;

  const n = Math.min(60, Math.max(1, Number(count || 6)));
  const cleanStory = String(story || "").trim();
  if (!cleanStory) return null;

  const prompt = `
You are CopUpBot.

TASK:
Generate exactly ${n} UNIQUE question-answer pairs from the story.

HARD RULES:
1) DO NOT repeat question sentence structures.
2) Each question targets a DIFFERENT part of the story.
3) Answers MUST be EXACTLY ONE WORD (no spaces).
   - Prefer an exact single word that appears in the story.
4) No trick questions. Must be solvable from the story.

OUTPUT:
Return ONLY valid JSON array:
[
  {"question":"...","answer":"..."},
  ...
]

STORY:
"""${cleanStory}"""
`;

  const resp = await openai.chat.completions.create({
    model: process.env.COPUPBOT_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const text = resp?.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse(text, null);
  if (!Array.isArray(parsed)) return null;

  const seenQ = new Set();
  const seenA = new Set();
  const cleaned = [];

  for (const x of parsed) {
    const q = String(x?.question || "").trim();
    const a = toOneWord(x?.answer || "");
    if (!q || !a) continue;

    const qKey = q.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s?]/g, "").trim();
    const aKey = a.toLowerCase();

    if (seenQ.has(qKey)) continue;
    if (seenA.has(aKey) && cleaned.length < n) continue;

    seenQ.add(qKey);
    seenA.add(aKey);
    cleaned.push({ question: q, answer: a });

    if (cleaned.length >= n) break;
  }

  return cleaned.length ? cleaned : null;
}

// -------------------- Main wrapper --------------------
async function generateVariantsFromStory(story, count = 6) {
  const n = Math.min(30, Math.max(1, Number(count || 6)));

  const ai = await aiGenerateVariantsFromStory(story, n);
  let list = Array.isArray(ai) ? ai : [];

  if (list.length < n) {
    const fb = fallbackGenerateVariantsFromStory(story, n - list.length);
    list = [...list, ...fb];
  }

  list = enforceOneWordVariants(list);

  // final cap
  return list.slice(0, n);
}

module.exports = {
  openaiConfigured: () => !!openai,
  safeJsonParse,
  toOneWord,
  enforceOneWordVariants,
  generateVariantsFromStory,
};