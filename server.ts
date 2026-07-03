import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with large limits for high-resolution base64 drawings and recorded videos
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const GAS_URL = process.env.GAS_WEB_APP_URL || "";

// Helper to communicate with Google Apps Script Web App
async function callGas(action: string, params: Record<string, any> = {}, method: "GET" | "POST" = "GET") {
  if (!GAS_URL || GAS_URL.includes("YOUR_DEPLOYED_SCRIPT_ID")) {
    throw new Error("Google Apps Script URL is not configured. Please set GAS_WEB_APP_URL in your environment.");
  }

  let finalUrl = `${GAS_URL}?action=${action}`;
  
  const options: RequestInit = {
    method,
    headers: {
      "Accept": "application/json",
    }
  };

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      finalUrl += `&${key}=${encodeURIComponent(value)}`;
    }
  } else {
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json",
    };
    options.body = JSON.stringify(params);
  }

  try {
    const response = await fetch(finalUrl, options);
    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: false, raw: text, error: "Invalid JSON response from Apps Script" };
    }
  } catch (error: any) {
    console.error(`Error in callGas(${action}):`, error);
    return { success: false, error: error.message };
  }
}

// API Routes

// 1. Get Table Data
app.get("/api/table-data", async (req, res) => {
  try {
    const data = await callGas("getTableData");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. Get Profile Data (School Name, Logo, Social Links)
app.get("/api/profile", async (req, res) => {
  try {
    const data = await callGas("getData");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Additional Student Column Headers
app.get("/api/additional-headers", async (req, res) => {
  try {
    const data = await callGas("getAdditionalHeaders");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Predefined Phrases/Texts
app.get("/api/predefined-texts", async (req, res) => {
  try {
    const data = await callGas("getPredefinedTexts");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Sticker File IDs
app.get("/api/stickers", async (req, res) => {
  try {
    const data = await callGas("getStickerUrls");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Saved Correction Data for a Student Row
app.get("/api/saved-data/:row", async (req, res) => {
  try {
    const { row } = req.params;
    const data = await callGas("getSavedData", { row });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Watermark Settings
app.get("/api/watermark-settings", async (req, res) => {
  try {
    const data = await callGas("getWatermarkSettings");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Registered Correctors/Users
app.get("/api/users", async (req, res) => {
  try {
    const data = await callGas("getUsers");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Corrector login with Device ID & Geolocation tracking
app.post("/api/login", async (req, res) => {
  try {
    const { username, deviceId, lat, lng } = req.body;
    const result = await callGas("loginUser", { username, deviceId, lat, lng }, "POST");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Save Correction Data and uploaded files
app.post("/api/save", async (req, res) => {
  try {
    const result = await callGas("saveAllMedia", req.body, "POST");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Direct Media Stream Proxy with CORS support to prevent canvas tainting!
// This fetches from Google Drive and serves it locally, letting HTML5 video/audio/canvas access it safely.
app.get("/api/media/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const driveUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
    
    const response = await fetch(driveUrl);
    if (!response.ok) {
      return res.status(response.status).send("Failed to stream file from Google Drive");
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache file for 1 day
    
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error(`Error streaming media file ${req.params.fileId}:`, error);
    res.status(500).send("Error streaming media file: " + error.message);
  }
});

// Integrated Vite Dev Server / Static Asset Handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
