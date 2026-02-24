const vision = require("@google-cloud/vision");

// Create the client using API key authentication.
// The key is validated by the factory module before this file is loaded.
const client = new vision.ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY,
});

// Known stock photo / licensed-image domains
const STOCK_PHOTO_DOMAINS = [
  "shutterstock.com",
  "gettyimages.com",
  "istockphoto.com",
  "stock.adobe.com",
  "dreamstime.com",
  "123rf.com",
  "alamy.com",
  "depositphotos.com",
  "bigstockphoto.com",
];

// Keywords in web entity descriptions that suggest copyrighted content
const COPYRIGHT_KEYWORDS = [
  "stock photo",
  "getty",
  "shutterstock",
  "copyright",
  "watermark",
  "trademark",
  "licensed",
  "rights reserved",
  "royalty",
];

/**
 * Sends the base64 image to Google Cloud Vision for OCR, logo detection,
 * and web detection. Returns the same shape as claudeService.analyzeImage().
 *
 * @param {string} base64Image - Base64-encoded image data (no data URI prefix).
 * @param {string} _mimeType   - Accepted for interface compatibility; not used
 *                                by Google Vision (it auto-detects format).
 * @returns {Promise<{ extractedText: string|null, copyrightAssessment: object }>}
 */
async function analyzeImage(base64Image, _mimeType) {
  // Request all three features in a single API call
  const [result] = await client.annotateImage({
    image: { content: base64Image },
    features: [
      { type: "TEXT_DETECTION" },
      { type: "LOGO_DETECTION" },
      { type: "WEB_DETECTION" },
    ],
  });

  // Check for API-level errors returned inside the response
  if (result.error) {
    throw new Error(
      `Google Vision API error: ${result.error.message || "unknown"}`
    );
  }

  // --- Extract text ---
  // textAnnotations[0].description is the full concatenated OCR text.
  // Subsequent entries are individual word-level detections.
  const textAnnotations = result.textAnnotations || [];
  const extractedText =
    textAnnotations.length > 0 ? textAnnotations[0].description.trim() : null;

  // --- Synthesize copyright assessment ---
  const copyrightAssessment = buildCopyrightAssessment(result);

  return { extractedText, copyrightAssessment };
}

/**
 * Builds a copyrightAssessment object by combining signals from
 * logo detection and web detection features.
 *
 * @param {object} result - The full annotateImage response.
 * @returns {{ flagged: boolean, confidence: string, reasoning: string }}
 */
function buildCopyrightAssessment(result) {
  const signals = [];
  let maxScore = 0;

  // --- Logo detections ---
  const logos = result.logoAnnotations || [];
  for (const logo of logos) {
    if (logo.score >= 0.5) {
      signals.push(
        `Brand logo detected: "${logo.description}" (${(logo.score * 100).toFixed(0)}% confidence)`
      );
      maxScore = Math.max(maxScore, logo.score);
    }
  }

  // --- Web detection ---
  const webDetection = result.webDetection || {};

  // Check for exact image matches on stock photo sites
  const fullMatches = webDetection.fullMatchingImages || [];
  const stockMatches = fullMatches.filter((img) =>
    STOCK_PHOTO_DOMAINS.some((domain) => img.url && img.url.includes(domain))
  );
  if (stockMatches.length > 0) {
    signals.push(
      `Image found on ${stockMatches.length} stock photo site(s)`
    );
    // Multiple stock matches = very high confidence
    maxScore = Math.max(maxScore, stockMatches.length >= 2 ? 0.9 : 0.7);
  }

  // Check web entities for copyright-related keywords
  const webEntities = webDetection.webEntities || [];
  for (const entity of webEntities) {
    const desc = (entity.description || "").toLowerCase();
    const score = entity.score || 0;
    if (score >= 0.5 && COPYRIGHT_KEYWORDS.some((kw) => desc.includes(kw))) {
      signals.push(
        `Web entity: "${entity.description}" (${(score * 100).toFixed(0)}% relevance)`
      );
      maxScore = Math.max(maxScore, score);
    }
  }

  // --- Determine flagged, confidence, and reasoning ---
  const flagged = signals.length > 0;

  let confidence = "low";
  if (flagged) {
    if (maxScore >= 0.8) {
      confidence = "high";
    } else if (maxScore >= 0.5) {
      confidence = "medium";
    }
  }

  const reasoning = flagged
    ? signals.join(". ") + "."
    : "No copyrighted content indicators detected via logo or web matching.";

  return { flagged, confidence, reasoning };
}

module.exports = { analyzeImage };
