# AI Image Review

A production-ready Node.js REST API that moderates images using either **Claude** (Anthropic) or **Google Cloud Vision**. It extracts text, checks for profanity, and detects potentially copyrighted content in a single API call.

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` to choose a provider and set the required API key:

```bash
# Use Claude (default)
VISION_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here

# — or use Google Cloud Vision —
VISION_PROVIDER=google
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key-here
```

3. **Start the server:**

```bash
npm start
```

4. **Open the test UI** at `http://localhost:3000` to drag-and-drop images for moderation.

## Choosing a provider

Set `VISION_PROVIDER` in `.env` to switch between backends. Only the selected provider's API key needs to be set.

| Variable | Required when | Description |
|---|---|---|
| `VISION_PROVIDER` | always (defaults to `claude`) | `"claude"` or `"google"` |
| `ANTHROPIC_API_KEY` | `VISION_PROVIDER=claude` | Anthropic API key |
| `GOOGLE_CLOUD_API_KEY` | `VISION_PROVIDER=google` | Google Cloud API key (enable the Cloud Vision API in your GCP project) |

### How each provider works

**Claude** sends the image with a structured prompt asking it to extract text and reason about copyright in a single response. It provides holistic, natural-language copyright reasoning.

**Google Cloud Vision** requests three detection features in one API call — TEXT_DETECTION (OCR), LOGO_DETECTION (brand logos), and WEB_DETECTION (stock photo matching, web entities). Copyright signals are synthesized from the combined results: logo scores, stock photo domain matches, and copyright-related web entity keywords.

## Endpoints

### `GET /health`

Returns `{ "status": "ok" }` when the server is running.

### `POST /api/moderate-image`

Analyzes an image for text content, profanity, and copyrighted material.

**Request body:**

```json
{
  "image": "<base64-encoded image data>",
  "mimeType": "image/jpeg"
}
```

Supported MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

**Response:**

```json
{
  "status": "pass",
  "extractedText": "Some text found in the image",
  "profanityCheck": {
    "flagged": false,
    "matches": []
  },
  "copyrightCheck": {
    "flagged": false,
    "confidence": "low",
    "reasoning": "No copyrighted content detected."
  },
  "errors": []
}
```

The top-level `status` is `"fail"` if either `profanityCheck.flagged` or `copyrightCheck.flagged` is `true`.

## Sample curl command

```bash
# Encode an image to base64 and send it for moderation
curl -X POST http://localhost:3000/api/moderate-image \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"$(base64 -i path/to/image.jpg)\", \"mimeType\": \"image/jpeg\"}"
```

## Project structure

```
server.js                          — Express entry point
routes/moderate.js                 — POST /api/moderate-image handler
services/imageAnalysisService.js   — Provider factory (selects Claude or Google)
services/claudeService.js          — Anthropic Claude API integration
services/googleVisionService.js    — Google Cloud Vision API integration
services/profanityService.js       — Profanity list loading and matching
profanity.txt                      — One term per line, loaded at startup
public/index.html                  — Drag-and-drop test UI
.env.example                       — Required environment variables
```

## Profanity list

Edit `profanity.txt` to add or remove terms. Each line is one word or phrase. Matching is case-insensitive and uses word boundaries (whole words only).
