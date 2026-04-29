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

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  app.get("/api/system/status", (req, res) => {
    const db = getDb();
    res.json(db.settings);
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
