import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000; // As per runtime environment constraints, port MUST be 3000

  // Configure high payload limits for transferring Base64 image and audio streams
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API proxy to forward requests to the Google Apps Script Web App without CORS blocks
  app.post('/api/sheets-proxy', async (req, res) => {
    const { url, method, data } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'يجب تحديد رابط Google Apps Script Web App' });
    }

    try {
      const fetchOptions: RequestInit = {
        method: method || 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        redirect: 'follow', // Crucial for Google Apps Script redirects
      };

      if (data) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      const text = await response.text();

      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch {
        return res.send(text);
      }
    } catch (error: any) {
      console.error('Sheets Proxy Server Error:', error);
      return res.status(500).json({ error: 'فشل في الاتصال بجوجل شيت: ' + error.message });
    }
  });

  // Proxy to download and serve Google Drive media with proper CORS headers to avoid "Tainted Canvas" issues
  app.get('/api/drive-proxy', async (req, res) => {
    const fileId = req.query.id as string;
    const fileUrl = req.query.url as string;
    const type = (req.query.type as string) || 'image';
    
    if (!fileId && !fileUrl) {
      return res.status(400).send('Missing url or id parameter');
    }

    try {
      let targetUrl = '';
      let fallbackUrl = '';
      
      let finalFileId = fileId;
      if (!finalFileId && fileUrl) {
        const fileIdMatch = fileUrl.match(/(?:id=|\/d\/|folders\/)([a-zA-Z0-9-_]{25,})[/\?]?/);
        if (fileIdMatch && fileIdMatch[1]) {
          finalFileId = fileIdMatch[1];
        }
      }

      if (finalFileId) {
        if (type === 'audio' || type === 'video') {
          // Audio and video files must stream directly from Google's uc endpoint, lh3 is for images only
          targetUrl = `https://docs.google.com/uc?export=download&id=${finalFileId}`;
        } else {
          // Images load faster and support CORS on lh3
          targetUrl = `https://lh3.googleusercontent.com/d/${finalFileId}`;
          fallbackUrl = `https://docs.google.com/uc?export=download&id=${finalFileId}`;
        }
      } else {
        targetUrl = fileUrl;
      }

      let response = await fetch(targetUrl);
      if (!response.ok && fallbackUrl) {
        console.warn(`Drive Proxy primary fetch failed for ${targetUrl}, trying fallback ${fallbackUrl}...`);
        response = await fetch(fallbackUrl);
      }

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch media from Google Drive: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (error: any) {
      console.error('Drive Proxy Error:', error);
      return res.status(500).send('Drive Proxy Error: ' + error.message);
    }
  });

  // Serve static files in production, or use Vite dev server in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`[Server] running on http://localhost:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
