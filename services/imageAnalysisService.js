/**
 * Provider factory — reads VISION_PROVIDER from the environment at startup
 * and exports the matching service's analyzeImage function.
 *
 * Supported providers:
 *   "claude"  (default) — requires ANTHROPIC_API_KEY
 *   "google"            — requires GOOGLE_CLOUD_API_KEY
 */

const VALID_PROVIDERS = ["claude", "google"];
const provider = (process.env.VISION_PROVIDER || "claude").toLowerCase();

if (!VALID_PROVIDERS.includes(provider)) {
  throw new Error(
    `Invalid VISION_PROVIDER "${process.env.VISION_PROVIDER}". ` +
      `Must be one of: ${VALID_PROVIDERS.join(", ")}`
  );
}

// Conditionally require only the selected provider so the unused SDK
// is never loaded (and doesn't need to be installed).
let service;

if (provider === "google") {
  if (!process.env.GOOGLE_CLOUD_API_KEY) {
    throw new Error(
      'VISION_PROVIDER is "google" but GOOGLE_CLOUD_API_KEY is not set'
    );
  }
  service = require("./googleVisionService");
} else {
  service = require("./claudeService");
}

console.log(`Image analysis provider: ${provider}`);

module.exports = { analyzeImage: service.analyzeImage };
