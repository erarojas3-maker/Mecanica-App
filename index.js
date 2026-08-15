import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // fotos/videos van en base64, necesitan margen

const PORT = process.env.PORT || 4000;

if (!process.env.DATABASE_URL) {
  console.error("Falta la variable de entorno DATABASE_URL (cadena de conexión de Postgres).");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

const ALLOWED_KEYS = new Set([
  "taller:clients",
  "taller:vehicles",
  "taller:orders",
  "taller:invoices",
  "taller:settings",
]);

function checkKey(req, res, next) {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: "Clave no permitida" });
  }
  next();
}

// Obtener el valor guardado de una colección
app.get("/api/store/:key", checkKey, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM store WHERE key = $1", [req.params.key]);
    res.json({ key: req.params.key, value: rows[0]?.value ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error leyendo datos" });
  }
});

// Guardar (reemplazar) el valor de una colección
app.put("/api/store/:key", checkKey, async (req, res) => {
  try {
    const value = req.body?.value ?? null;
    await pool.query(
      `INSERT INTO store (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [req.params.key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error guardando datos" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Servir el frontend compilado (Vite build) en producción
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
  })
  .catch((err) => {
    console.error("No se pudo inicializar la base de datos:", err);
    process.exit(1);
  });
