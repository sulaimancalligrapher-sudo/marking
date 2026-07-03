import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  
  // Parse large base64 attachments safely
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route 1: Proxy database retrieval from Google Sheets Apps Script
  app.post('/api/sheets/data', async (req, res) => {
    const { appsScriptUrl } = req.body;
    if (!appsScriptUrl) {
      return res.status(400).json({ success: false, message: 'Google Apps Script URL is required.' });
    }

    try {
      // Fetch the table items by requesting the Apps Script endpoint
      // We append a query param to tell Code.gs what to do, or Code.gs can handle it natively.
      const urlWithAction = `${appsScriptUrl}?action=getAppConfig`;
      
      const response = await fetch(urlWithAction, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Google server returned status: ${response.status}`);
      }

      // Read text first since Apps Script redirect might return HTML or raw string
      const text = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        // Fallback or retry on redirect
        return res.json({ 
          success: true, 
          data: [], 
          rawText: text,
          message: 'Connection checked, but response was not valid JSON.' 
        });
      }

      res.json({ success: true, data: parsed });
    } catch (e: any) {
      console.error('Error fetching Sheets data:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // API Route 2: Proxy save all correction media & update sheet
  app.post('/api/sheets/save', async (req, res) => {
    const { appsScriptUrl, ...savePayload } = req.body;
    if (!appsScriptUrl) {
      return res.status(400).json({ success: false, message: 'Google Apps Script URL is required.' });
    }

    try {
      // Send parameters directly as POST to the Web App URL
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(savePayload)
      });

      if (!response.ok) {
        throw new Error(`Google write failed with status: ${response.status}`);
      }

      const textResponse = await response.text();
      res.json({ success: true, response: textResponse });
    } catch (e: any) {
      console.error('Error saving Sheets correction data:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Integrate Vite Dev Server Middleware or static assets delivery
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static files from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server fully up and running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal server boot failure:', err);
});
