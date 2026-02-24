const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

// System prompt instructs Claude to return structured JSON only
const SYSTEM_PROMPT = `You are an image analysis assistant. Analyze the provided image and respond with ONLY a valid JSON object — no markdown fences, no commentary.

The JSON must have this exact shape:

{
  "extractedText": "<all visible text in the image, or null if none>",
  "copyrightAssessment": {
    "flagged": <true or false>,
    "confidence": "<low | medium | high>",
    "reasoning": "<brief explanation>"
  }
}

For extractedText: transcribe every piece of visible text in the image. If there is no text at all, set the value to null.

For copyrightAssessment: determine whether the image contains potentially copyrighted or licensed content such as brand logos, watermarks, stock photo signatures, recognizable artwork, trademarked characters, or celebrity likenesses. Set flagged to true if any such content is detected. Set confidence to "low", "medium", or "high" based on how certain you are. Provide a brief reasoning string explaining your assessment.`;

/**
 * Sends the base64 image to Claude for text extraction and copyright analysis.
 *
 * @param {string} base64Image - Base64-encoded image data (no data URI prefix).
 * @param {string} mimeType   - One of image/jpeg, image/png, image/webp, image/gif.
 * @returns {Promise<{ extractedText: string|null, copyrightAssessment: object }>}
 */
async function analyzeImage(base64Image, mimeType) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Analyze this image. Extract all visible text and assess it for copyrighted or licensed content. Respond with the JSON object only.",
          },
        ],
      },
    ],
  });

  // Claude returns content blocks; extract the text from the first one
  const raw = message.content[0].text;

  // Parse the JSON response — strip markdown fences if Claude adds them
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);

  return parsed;
}

module.exports = { analyzeImage };
