import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "db.json");

// Initial DB structure
const initialDb = {
  users: [], // List of verified emails
  verifications: {}, // email -> { code, expiry }
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

  app.use(express.json());

  // Request Logger for Debugging
  app.use((req, res, next) => {
    console.log(`[NET] ${req.method} ${req.url} | ${new Date().toISOString()}`);
    next();
  });

  // --- API ROUTES ---

  // Check System Status
  app.get("/api/system/status", (req, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  // token Verification
  app.post("/api/auth/verify-token", (req, res) => {
    console.log(`[AUTH] Handshake request received at ${new Date().toISOString()}`);
    console.log(`[AUTH] Headers:`, JSON.stringify(req.headers, null, 2));
    
    try {
      const { token } = req.body;
      const LEGACY_TOKEN = "A4D6X-PR91-NV3R";
      
      console.log(`[AUTH] Raw token from body: "${token}"`);
      
      if (!token) {
        console.warn("[AUTH] Missing token in request body");
        return res.status(400).json({ error: "Access token missing from transmission." });
      }

      const normalize = (t: any) => t ? t.toString().replace(/[\s-]/g, "").trim().toUpperCase() : "";
      
      const cleanToken = normalize(token);
      const cleanLegacy = normalize(LEGACY_TOKEN);
      
      console.log(`[AUTH] Comparing: "${cleanToken}" vs "${cleanLegacy}"`);
      
      if (cleanToken === cleanLegacy) {
        console.log("[AUTH] Verification successful. Initializing link.");
        return res.json({ 
          success: true, 
          token: LEGACY_TOKEN,
          status: "Neural Link Established"
        });
      } else {
        console.warn(`[AUTH] Verification failed. Input: "${cleanToken}"`);
        return res.status(401).json({ error: "Neutral access code sequence invalid." });
      }
    } catch (error) {
      console.error("[AUTH] Fatal core exception during verification:", error);
      return res.status(500).json({ error: "Neural core processing failure." });
    }
  });

  // --- ADMIN ROUTES (Internal) ---
  app.post("/api/admin/toggle-maintenance", (req, res) => {
    const { secret, state, message } = req.body;
    if (secret !== "studio-admin-2026") return res.status(401).json({ error: "Unauthorized access to neural core." });
    
    const db = getDb();
    db.settings.maintenance = state;
    if (message) db.settings.maintenanceMessage = message;
    saveDb(db);
    res.json({ success: true, settings: db.settings });
  });

  app.get("/api/admin/users", (req, res) => {
    const { secret } = req.query;
    if (secret !== "studio-admin-2026") return res.status(401).json({ error: "Unauthorized" });
    
    const db = getDb();
    res.json({ users: db.users });
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
