import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "db.json");

// Initial DB structure
const initialDb = {
  settings: {
    maintenance: false,
    maintenanceMessage: "System is currently undergoing deep core optimization. Please stand by."
  }
};

// Helper to read/write DB
function getDb() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

function saveDb(db: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[NET] ${req.method} ${req.url}`);
    next();
  });

  // --- API ROUTER ---
  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  apiRouter.get("/system/status", (req, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  apiRouter.post("/ai/generate", async (req, res) => {
    try {
      const { promptParts, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("[AI] GEMINI_API_KEY missing");
        return res.status(500).json({ error: "Neural core link missing. API key configuration error on server." });
      }

      const genAI = new GoogleGenAI({ apiKey });
      
      // Convert prompt parts
      const parts = promptParts.map((p: any) => {
        if (typeof p === "string") return { text: p };
        if (p.inlineData) return p;
        return p;
      });

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts }],
        config: { 
          systemInstruction,
          temperature: 0.7 
        }
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("[AI ERROR]", error);
      res.status(500).json({ error: error.message || "Failure during neural synthesis." });
    }
  });

  app.use("/api", apiRouter);

  // Catch-all for undefined API routes to prevent 404s from being silent
  app.use("/api/*", (req, res) => {
    console.warn(`[NET] 404 on API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Neural endpoint [${req.originalUrl}] not found.` });
  });

  // --- ADMIN ROUTES ---
  app.post("/api/admin/toggle-maintenance", (req, res) => {
    const { secret, state, message } = req.body;
    if (secret !== "studio-admin-2026") return res.status(401).json({ error: "Unauthorized access to neural core." });
    
    const db = getDb();
    db.settings.maintenance = state;
    if (message) db.settings.maintenanceMessage = message;
    saveDb(db);
    res.json({ success: true, settings: db.settings });
  });

  // --- VITE MIDDLEWARE ---
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
    console.log(`Neural Core online at http://0.0.0.0:${PORT}`);
  });
}

startServer();
