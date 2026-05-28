const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;
const DATABASE_URL = process.env.DATABASE_URL;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

let astroModule = null;
async function getAstro() {
  if (!astroModule) astroModule = await import("./js/astro-calc.js");
  return astroModule;
}

let dbPool = null;
let dbReady = false;

async function getDb() {
  if (!DATABASE_URL) return null;
  if (!dbPool) {
    const { Pool } = require("pg");
    dbPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  if (!dbReady) {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    dbReady = true;
  }
  return dbPool;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(Buffer.concat(chunks).toString("utf8"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function handleProfiles(req, url) {
  const db = await getDb();
  if (!db) return { status: 503, body: { error: "DATABASE_URL is not configured" } };

  if (url.pathname === "/api/profiles" && req.method === "GET") {
    const { rows } = await db.query(
      "SELECT data FROM profiles ORDER BY updated_at DESC LIMIT 200"
    );
    return { status: 200, body: { profiles: rows.map((row) => row.data) } };
  }

  if (url.pathname === "/api/profiles" && req.method === "POST") {
    const raw = await readBody(req);
    const profile = raw ? JSON.parse(raw) : {};
    if (!profile.id || !profile.name) {
      return { status: 400, body: { error: "Profile id and name are required" } };
    }
    await db.query(
      `INSERT INTO profiles (id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [profile.id, JSON.stringify(profile)]
    );
    return { status: 200, body: { profile } };
  }

  const match = url.pathname.match(/^\/api\/profiles\/([^/]+)$/);
  if (match && req.method === "GET") {
    const id = decodeURIComponent(match[1]);
    const { rows } = await db.query("SELECT data FROM profiles WHERE id = $1", [id]);
    if (!rows.length) return { status: 404, body: { error: "Profile not found" } };
    return { status: 200, body: { profile: rows[0].data } };
  }

  return null;
}

async function handleGeocode(url) {
  const q = url.searchParams.get("q");
  if (!q?.trim()) return { status: 400, body: { error: "Missing q parameter" } };

  const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=1`;
  const nomRes = await fetch(nomUrl, {
    headers: { "User-Agent": "CosmicDating/1.0 (educational; localhost)" },
  });
  if (!nomRes.ok) return { status: 502, body: { error: "Geocoding service unavailable" } };
  const rows = await nomRes.json();
  if (!rows?.length) return { status: 404, body: { error: "Location not found" } };

  const hit = rows[0];
  const lat = parseFloat(hit.lat);
  const lon = parseFloat(hit.lon);
  let timeZone = null;
  let utcOffsetMinutes = null;

  try {
    const tzRes = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`
    );
    if (tzRes.ok) {
      const tz = await tzRes.json();
      timeZone = tz.timeZone || null;
    }
  } catch {
    /* optional */
  }

  return {
    status: 200,
    body: {
      displayName: hit.display_name,
      latitude: lat,
      longitude: lon,
      timeZone,
      utcOffsetMinutes,
    },
  };
}

async function resolveUtcOffsetMinutes({ birthDate, birthTime, timeZone, utcOffsetMinutes }) {
  if (Number.isFinite(utcOffsetMinutes)) return utcOffsetMinutes;
  if (!timeZone || !birthDate) return 0;

  const timePart = birthTime || "12:00";
  const dt = `${birthDate}T${timePart}:00`;
  try {
    const url = `https://timeapi.io/api/TimeZone/zone?timeZone=${encodeURIComponent(timeZone)}&dateTime=${encodeURIComponent(dt)}`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    const sec =
      data.utcOffset?.seconds ??
      data.currentUtcOffset?.seconds ??
      data.standardUtcOffset?.seconds ??
      0;
    return Math.round(sec / 60);
  } catch {
    return 0;
  }
}

async function handleNatal(body) {
  const {
    birthDate,
    birthTime,
    latitude,
    longitude,
    utcOffsetMinutes: utcIn,
    birthPlace,
  } = body || {};

  if (!birthDate) return { status: 400, body: { error: "birthDate required" } };

  let lat = latitude;
  let lon = longitude;
  let timeZone = body.timeZone || null;
  let placeLabel = birthPlace || null;

  if ((lat == null || lon == null) && birthPlace) {
    const geo = await handleGeocode(new URL(`http://x/?q=${encodeURIComponent(birthPlace)}`));
    if (geo.status !== 200) return geo;
    lat = geo.body.latitude;
    lon = geo.body.longitude;
    timeZone = geo.body.timeZone || timeZone;
    placeLabel = geo.body.displayName || birthPlace;
  }

  if (lat == null || lon == null) {
    return { status: 400, body: { error: "Provide birthPlace or latitude/longitude" } };
  }

  const { parseBirthInputs, natalChartFromBirth } = await getAstro();
  const parsed = parseBirthInputs(birthDate, birthTime);
  if (!parsed) return { status: 400, body: { error: "Invalid birthDate" } };

  const utcOffsetMinutes = await resolveUtcOffsetMinutes({
    birthDate,
    birthTime,
    timeZone,
    utcOffsetMinutes: utcIn,
  });

  const chart = natalChartFromBirth({
    ...parsed,
    utcOffsetMinutes,
    latitude: lat,
    longitude: lon,
  });

  return {
    status: 200,
    body: {
      ...chart,
      latitude: lat,
      longitude: lon,
      birthPlace: placeLabel,
      timeZone,
      utcOffsetMinutes,
      source: "local-ephemeris",
    },
  };
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === "/api/geocode" && req.method === "GET") {
      try {
        const out = await handleGeocode(url);
        return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Geocode failed" });
      }
    }

    if (url.pathname === "/api/natal" && req.method === "POST") {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const out = await handleNatal(body);
        return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Natal chart failed" });
      }
    }

    if (url.pathname === "/api/profiles" || url.pathname.startsWith("/api/profiles/")) {
      try {
        const out = await handleProfiles(req, url);
        if (out) return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Profile API failed" });
      }
    }

    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = path.join(ROOT, path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ""));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Cosmic Dating -> http://localhost:${PORT}`);
    console.log(`Astro API: POST /api/natal · GET /api/geocode?q=City`);
    console.log(DATABASE_URL ? "Profile DB: PostgreSQL enabled" : "Profile DB: localStorage fallback");
  });
