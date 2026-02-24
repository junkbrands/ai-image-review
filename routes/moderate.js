const express = require("express");
const { analyzeImage } = require("../services/imageAnalysisService");
const { checkProfanity } = require("../services/profanityService");

const router = express.Router();

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Simple check: a valid base64 string contains only these characters
const BASE64_REGEX = /^[A-Za-z0-9+/\n\r]+=*$/;

/**
 * POST /api/moderate-image
 *
 * Accepts { image, mimeType }, runs AI vision analysis (Claude or Google),
 * checks extracted text for profanity, and returns a structured result.
 */
router.post("/moderate-image", async (req, res) => {
  const errors = [];
  const { image, mimeType } = req.body || {};

  // --- Input validation ---

  if (!image) {
    errors.push('Missing required field: "image"');
  } else if (typeof image !== "string" || image.trim().length === 0) {
    errors.push('"image" must be a non-empty base64-encoded string');
  } else if (!BASE64_REGEX.test(image)) {
    errors.push('"image" contains invalid base64 characters');
  }

  if (!mimeType) {
    errors.push('Missing required field: "mimeType"');
  } else if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    errors.push(
      `Unsupported mimeType "${mimeType}". Must be one of: ${[...SUPPORTED_MIME_TYPES].join(", ")}`
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: "fail",
      extractedText: null,
      profanityCheck: { flagged: false, matches: [] },
      copyrightCheck: { flagged: false, confidence: "low", reasoning: "" },
      errors,
    });
  }

  // --- Call AI provider for image analysis ---

  let extractedText = null;
  let copyrightCheck = { flagged: false, confidence: "low", reasoning: "" };

  try {
    const result = await analyzeImage(image, mimeType);
    extractedText = result.extractedText || null;
    copyrightCheck = {
      flagged: Boolean(result.copyrightAssessment?.flagged),
      confidence: result.copyrightAssessment?.confidence || "low",
      reasoning: result.copyrightAssessment?.reasoning || "",
    };
  } catch (err) {
    console.error("Image analysis API error:", err.message);

    // Distinguish JSON parse failures from upstream API errors
    const message =
      err instanceof SyntaxError
        ? "Failed to parse AI response"
        : `Upstream AI service error: ${err.message}`;

    return res.status(502).json({
      status: "fail",
      extractedText: null,
      profanityCheck: { flagged: false, matches: [] },
      copyrightCheck: { flagged: false, confidence: "low", reasoning: "" },
      errors: [message],
    });
  }

  // --- Profanity check on extracted text ---

  const profanityCheck = checkProfanity(extractedText);

  // Top-level status: fail if either check is flagged
  const status =
    profanityCheck.flagged || copyrightCheck.flagged ? "fail" : "pass";

  return res.json({
    status,
    extractedText,
    profanityCheck,
    copyrightCheck,
    errors: [],
  });
});

module.exports = router;
