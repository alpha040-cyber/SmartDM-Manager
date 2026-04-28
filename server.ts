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

  // --- API ROUTES ---

  // Check System Status
  app.get("/api/system/status", (req, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  // Verification Code Generation
  app.post("/api/auth/send-code", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Invalid neural identifier." });

    const db = getDb();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    db.verifications[email] = { code, expiry: Date.now() + 600000 }; // 10 min
    saveDb(db);

    console.log(`[AUTH] Verification code for ${email}: ${code}`);
    res.json({ success: true, message: "Verification transmission sent." });
  });

  app.post("/api/auth/verify-code", (req, res) => {
    const { email, code } = req.body;
    const db = getDb();
    
    const record = db.verifications[email];
    if (record && record.code === code && record.expiry > Date.now()) {
      delete db.verifications[email];
      if (!db.users.includes(email)) db.users.push(email);
      saveDb(db);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid or expired transmission code." });
    }
  });

  // token Verification
  app.post("/api/auth/verify-token", (req, res) => {
    const { token } = req.body;
    const LEGACY_TOKEN = "A4D6X-PR91-NV3R";
    const SESSION_TOKEN = "STUDIO-2026";
    
    if (token === LEGACY_TOKEN || token === SESSION_TOKEN) {
      res.json({ success: true, token: SESSION_TOKEN });
    } else {
      res.status(401).json({ error: "Invalid neural access code." });
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
