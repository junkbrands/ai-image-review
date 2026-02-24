require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const { loadProfanityList } = require("./services/profanityService");
const moderateRouter = require("./routes/moderate");

const app = express();
const PORT = process.env.PORT || 80;
const TEST_MODE = process.env.TEST_MODE || false;

// --- Middleware ---

// Request logging
app.use(morgan("dev"));

// JSON body parsing with 10 MB limit for base64 images
app.use(express.json({ limit: "10mb" }));

if (TEST_MODE) {
  // Serve the test UI from public/
  app.use(express.static("public"));
}

// --- Routes ---

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Image moderation
app.use("/api", moderateRouter);

// --- Startup ---

// Load profanity list into memory before accepting requests
loadProfanityList();

app.listen(PORT, () => {
  console.log(`Image moderation API listening on port ${PORT}`);
});
