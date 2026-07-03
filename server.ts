import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limits for large canvas base64 images and audio uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Proxy Route for Google Sheets Web App (to bypass CORS issues)
  app.get("/api/sheets", async (req, res) => {
    try {
      const webAppUrl = req.query.url as string;
      if (!webAppUrl) {
        return res.status(400).json({ error: "Missing Google Sheets Web App URL ('url' parameter)." });
      }

      // Construct target URL and forward all query params except 'url'
      const targetUrl = new URL(webAppUrl);
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== "url" && typeof value === "string") {
          targetUrl.searchParams.set(key, value);
        }
      }

      console.log(`[Sheets Proxy GET] Fetching from: ${targetUrl.toString()}`);

      const response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Google Sheets returned an error: ${errorText}` });
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        try {
          // Attempt to parse as JSON anyway in case header was plain/text
          res.json(JSON.parse(text));
        } catch {
          res.send(text);
        }
      }
    } catch (error: any) {
      console.error("[Sheets Proxy GET Error]:", error);
      res.status(500).json({ error: error.message || "Failed to fetch data from Google Sheets through proxy." });
    }
  });

  app.post("/api/sheets", async (req, res) => {
    try {
      const webAppUrl = req.query.url as string || req.headers["x-sheets-url"] as string;
      if (!webAppUrl) {
        return res.status(400).json({ error: "Missing Google Sheets Web App URL." });
      }

      console.log(`[Sheets Proxy POST] Posting to: ${webAppUrl}`);

      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        try {
          res.status(response.status).json(JSON.parse(text));
        } catch {
          res.status(response.status).send(text);
        }
      }
    } catch (error: any) {
      console.error("[Sheets Proxy POST Error]:", error);
      res.status(500).json({ error: error.message || "Failed to send data to Google Sheets through proxy." });
    }
  });

  // Vite middleware for development or serving production dist files
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
