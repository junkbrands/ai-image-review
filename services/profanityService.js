const fs = require("fs");
const path = require("path");

// In-memory cache of profanity terms loaded at startup
let profanityTerms = [];

/**
 * Loads profanity.txt from project root into memory.
 * Each non-empty line becomes a term in the cached list.
 * Call once at server startup.
 */
function loadProfanityList() {
  const filePath = path.join(__dirname, "..", "profanity.txt");
  const raw = fs.readFileSync(filePath, "utf-8");

  profanityTerms = raw
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  console.log(`Loaded ${profanityTerms.length} profanity terms`);
}

/**
 * Checks the given text against the cached profanity list.
 * Uses word-boundary regex for whole-word, case-insensitive matching.
 *
 * @param {string|null} text - The text to scan (typically extractedText from Claude).
 * @returns {{ flagged: boolean, matches: string[] }}
 */
function checkProfanity(text) {
  if (!text) {
    return { flagged: false, matches: [] };
  }

  const lower = text.toLowerCase();
  const matches = [];

  for (const term of profanityTerms) {
    // Escape regex special characters in the term, then wrap with \b
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");

    if (regex.test(lower)) {
      matches.push(term);
    }
  }

  return {
    flagged: matches.length > 0,
    matches,
  };
}

module.exports = { loadProfanityList, checkProfanity };
