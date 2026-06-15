const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;
const DATABASE_URL = process.env.DATABASE_URL;
const USER_AGENT = "CosmicDating/1.0 (+https://soul-connect-b95n.onrender.com)";
const HUMAN_DESIGN_API_KEY = process.env.HUMAN_DESIGN_API_KEY || process.env.HUMANDESIGN_API_KEY;
const HUMAN_DESIGN_GEOCODE_KEY = process.env.HUMAN_DESIGN_GEOCODE_KEY || process.env.HUMANDESIGN_GEOCODE_KEY;
const ZEN_FEMME_CHART_URL = "https://thezenfemme.com/free-chart";
const BODYGRAPHCHART_EMBED_ID = process.env.ZEN_FEMME_HD_EMBED_ID || process.env.BODYGRAPHCHART_EMBED_ID || "485";
const BODYGRAPHCHART_EMBED_TOKEN = process.env.ZEN_FEMME_HD_EMBED_TOKEN || process.env.BODYGRAPHCHART_EMBED_TOKEN || "bd31ba1b-5ce9-4035-960b-889eef3825e2";
const BODYGRAPHCHART_GENERATE_URL = `https://embed.bodygraphchart.com/v1/${BODYGRAPHCHART_EMBED_ID}/generate`;
const BODYGRAPHCHART_LOCATIONS_URL = "https://app.bodygraphchart.com/locations/cities";
const COUNTRIES_NOW_URL = "https://countriesnow.space/api/v0.1/countries";
const HD_REQUEST_TIMEOUT_MS = 10000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const LOCATION_CACHE_TTL_MS = 7 * DAY_MS;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let astroModule = null;
async function getAstro() {
  if (!astroModule) astroModule = await import("./js/astro-calc.js");
  return astroModule;
}

let lunarModule = null;
async function getLunar() {
  if (!lunarModule) lunarModule = await import("./js/lunar-years.js");
  return lunarModule;
}

let dbPool = null;
let dbReady = false;
const scrapeCache = new Map();

const ZODIAC_SIGN_NUMBERS = {
  aries: 1,
  taurus: 2,
  gemini: 3,
  cancer: 4,
  leo: 5,
  virgo: 6,
  libra: 7,
  scorpio: 8,
  sagittarius: 9,
  capricorn: 10,
  aquarius: 11,
  pisces: 12,
};

const CHINESE_TRAITS = {
  rat: "Clever, resourceful",
  ox: "Steady, dependable",
  tiger: "Brave, passionate",
  rabbit: "Gentle, diplomatic",
  dragon: "Charismatic, bold",
  snake: "Wise, intuitive",
  horse: "Energetic, free-spirited",
  goat: "Creative, empathetic",
  monkey: "Playful, inventive",
  rooster: "Honest, observant",
  dog: "Loyal, sincere",
  pig: "Generous, warm-hearted",
};

const CHINESE_ANIMALS_ORDER = [
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
];
const CHINESE_ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];
let locationCache = null;

function chineseAnimalFromLunarYear(year) {
  if (!Number.isFinite(year)) return null;
  const idx = ((year - 4) % 12 + 12) % 12;
  return CHINESE_ANIMALS_ORDER[idx];
}

function chineseElementFromYear(year) {
  if (!Number.isFinite(year)) return null;
  const idx = Math.floor(((year - 4) % 10) / 2);
  return CHINESE_ELEMENTS[idx];
}

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
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sortUniqueStrings(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function normalizeCountryCityRows(rows) {
  const citiesByCountry = new Map();
  for (const row of rows || []) {
    const country = String(row?.country || row?.name || "").trim();
    if (!country) continue;
    citiesByCountry.set(country, sortUniqueStrings(row.cities || []));
  }
  return {
    countries: sortUniqueStrings([...citiesByCountry.keys()]),
    citiesByCountry,
  };
}

function fallbackLocationRows() {
  try {
    const source = fs.readFileSync(path.join(ROOT, "js", "locations.js"), "utf8");
    const rows = [];
    const blockPattern = /country:\s*"([^"]+)"[\s\S]*?cities:\s*\[([\s\S]*?)\]/g;
    let block;
    while ((block = blockPattern.exec(source))) {
      const cities = [];
      const cityPattern = /"([^"]+)"/g;
      let city;
      while ((city = cityPattern.exec(block[2]))) cities.push(city[1]);
      rows.push({ country: block[1], cities });
    }
    return rows;
  } catch {
    return [];
  }
}

async function fetchLocationIndex({ allowStale = false } = {}) {
  const now = Date.now();
  if (locationCache && now - locationCache.at < LOCATION_CACHE_TTL_MS) return locationCache.value;

  const fallback = normalizeCountryCityRows(fallbackLocationRows());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(COUNTRIES_NOW_URL, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Countries source returned ${res.status}`);
    const payload = await res.json();
    const normalized = normalizeCountryCityRows(payload?.data || []);
    if (!normalized.countries.length) throw new Error("Countries source returned no countries");
    const value = { ...normalized, source: "countriesnow.space", fallback: false };
    locationCache = { at: now, value };
    return value;
  } catch (e) {
    if (allowStale && locationCache?.value) return { ...locationCache.value, stale: true };
    return {
      ...fallback,
      source: "local fallback",
      fallback: true,
      warning: e.message || "Country/city source unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleCountries() {
  const locations = await fetchLocationIndex({ allowStale: true });
  return {
    status: 200,
    body: {
      countries: locations.countries,
      source: locations.source,
      fallback: Boolean(locations.fallback),
      stale: Boolean(locations.stale),
      warning: locations.warning,
    },
  };
}

async function handleCities(url) {
  const country = url.searchParams.get("country")?.trim();
  if (!country) return { status: 400, body: { error: "Missing country parameter", cities: [] } };
  const query = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const defaultLimit = query ? 500 : 30000;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || defaultLimit), 1), 30000);
  const locations = await fetchLocationIndex({ allowStale: true });
  const matchedCountry = locations.countries.find((item) => item.toLowerCase() === country.toLowerCase());
  let cities = matchedCountry ? locations.citiesByCountry.get(matchedCountry) || [] : [];
  if (query) {
    cities = cities.filter((city) => city.toLowerCase().includes(query));
  }
  cities = cities.slice(0, limit);
  return {
    status: 200,
    body: {
      country: matchedCountry || country,
      cities,
      source: locations.source,
      fallback: Boolean(locations.fallback),
      stale: Boolean(locations.stale),
      warning: locations.warning,
    },
  };
}

function decodeHtml(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&nbsp;/g, " ");
}

function htmlToText(html = "") {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|section|article|h[1-6]|li|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function fetchCached(key, url, ttlMs) {
  const cached = scrapeCache.get(key);
  if (cached && Date.now() - cached.at < ttlMs) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Source returned ${res.status}`);
    const value = await res.text();
    scrapeCache.set(key, { at: Date.now(), value });
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeHoroscope(signId) {
  const sign = String(signId || "").toLowerCase();
  const signNumber = ZODIAC_SIGN_NUMBERS[sign];
  const sourceUrl = "https://www.horoscope.com/us/horoscopes/general/index-horoscope-general-daily.aspx";
  if (!signNumber) {
    return {
      ok: false,
      sourceUrl,
      title: "Daily horoscope",
      text: "Add your Sun sign to your profile to receive a personalized daily horoscope.",
    };
  }

  try {
    const signUrl = `https://www.horoscope.com/us/horoscopes/general/horoscope-general-daily-today.aspx?sign=${signNumber}`;
    const html = await fetchCached(`horoscope:${sign}`, signUrl, 6 * HOUR_MS);
    const dated = html.match(/<p>\s*<strong>([^<]+)<\/strong>\s*-\s*([\s\S]*?)<\/p>/i);
    const meta = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const date = dated ? decodeHtml(dated[1]).trim() : null;
    const text = decodeHtml((dated ? dated[2] : meta?.[1] || "").replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();

    if (!text) throw new Error("Horoscope text not found");
    return {
      ok: true,
      sourceUrl,
      detailUrl: signUrl,
      title: `${sign[0].toUpperCase()}${sign.slice(1)} daily horoscope`,
      date,
      text,
    };
  } catch {
    return {
      ok: false,
      sourceUrl,
      title: "Daily horoscope",
      text: "Today's horoscope source is unavailable right now. Check back soon for your Sun sign reading.",
    };
  }
}

function matchLine(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

async function scrapeHumanDesign() {
  const sourceUrl = "https://human.design/daily-impact";
  try {
    const html = await fetchCached("human-design:daily-impact", sourceUrl, 2 * HOUR_MS);
    const text = htmlToText(html);
    const date = matchLine(text, /([A-Z][a-z]+ \d{1,2}, \d{4}\s*\|\s*[^|\n]+\|\s*UTC)/);
    const gate = matchLine(text, /(Gate\s+\d+\s*-\s*THE GATE OF [A-Z ]+?)(?:\s+Keynote|\n|$)/i);
    const bodygraph = matchLine(text, /Bodygraph Position\s+(.+?)(?:\s+Quarter|\n|$)/i);
    const line = matchLine(text, /Impact Line for Gate\s+\d+\s*\|\s*Line\s+(\d+)/i);
    const lineName = matchLine(text, /Line Name\s+(.+?)(?:\s+Line Heading|\n|$)/i);
    const lineHeading = matchLine(text, /Line Heading\s+(.+?)(?:\s+Detriment|\n|$)/i);
    const exaltation = matchLine(text, /Exaltation\s+(.+?)(?:\s+See More|\n|$)/i);
    const harmonicGate = matchLine(text, /Harmonic Gate\s+(.+?)(?:\s+\d+(st|nd|rd|th) Line Day|\n|$)/i);

    if (!gate && !lineHeading) throw new Error("Daily Impact details not found");
    return {
      ok: true,
      sourceUrl,
      title: "Human Design Daily Impact",
      date,
      gate,
      bodygraph,
      line,
      lineName,
      lineHeading,
      harmonicGate,
      text: [lineHeading, exaltation].filter(Boolean).join(" "),
    };
  } catch {
    return {
      ok: false,
      sourceUrl,
      title: "Human Design Daily Impact",
      text: "Human Design's Daily Impact source is unavailable right now. Follow your strategy and authority as today's steady anchor.",
    };
  }
}

async function scrapeChineseReference({ animal, element, birthYear }) {
  const sourceUrl = "https://www.timeanddate.com/calendar/chinese-zodiac-signs.html";
  const localTraits = CHINESE_TRAITS[animal] || "Your Chinese year adds another layer of instinct, timing, and temperament.";
  let reference = "";
  let sourceAvailable = false;

  try {
    const html = await fetchCached("chinese-zodiac:timeanddate", sourceUrl, 7 * DAY_MS);
    const text = htmlToText(html);
    sourceAvailable = /Chinese Zodiac/i.test(text);
    if (animal) {
      const animalName = animal[0].toUpperCase() + animal.slice(1);
      const animalLine = text
        .split("\n")
        .find((line) => line.includes(animalName) && /Year|Zodiac|personality|traits/i.test(line));
      reference = animalLine || "";
    }
  } catch {
    sourceAvailable = false;
  }

  return {
    ok: sourceAvailable,
    sourceUrl,
    title: "Chinese zodiac year",
    animal,
    element,
    birthYear,
    traits: localTraits,
    text: reference || `${element ? `${element} ` : ""}${animal || "Chinese zodiac"} energy: ${localTraits}. This reference is based on your saved profile year/sign data.`,
  };
}

async function handleToday(url) {
  const zodiac = url.searchParams.get("zodiac");
  const hdType = url.searchParams.get("hdType");
  const hdAuthority = url.searchParams.get("hdAuthority");
  const hdProfile = url.searchParams.get("hdProfile");
  const chineseAnimal = url.searchParams.get("chineseAnimal");
  const chineseElement = url.searchParams.get("chineseElement");
  const birthYear = url.searchParams.get("birthYear");

  const [horoscope, humanDesign, chinese] = await Promise.all([
    scrapeHoroscope(zodiac),
    scrapeHumanDesign(),
    scrapeChineseReference({
      animal: chineseAnimal,
      element: chineseElement,
      birthYear,
    }),
  ]);

  return {
    status: 200,
    body: {
      generatedAt: new Date().toISOString(),
      profile: { zodiac, hdType, hdAuthority, hdProfile, chineseAnimal, chineseElement, birthYear },
      horoscope,
      humanDesign,
      chinese,
    },
  };
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

function normalizeHumanDesignType(value) {
  const raw = String(value || "").toLowerCase();
  if (!raw) return null;
  if (raw.includes("manifesting") && raw.includes("generator")) return "mg";
  if (raw.includes("generator")) return "generator";
  if (raw.includes("projector")) return "projector";
  if (raw.includes("manifestor")) return "manifestor";
  if (raw.includes("reflector")) return "reflector";
  return null;
}

function pickFirst(...values) {
  return values.find((value) => value != null && value !== "");
}

function normalizeHumanDesignApiPayload(data) {
  const body = data?.data || data?.chart || data?.result || data || {};
  const properties = body.properties || body;
  const type = normalizeHumanDesignType(pickFirst(
    properties.type,
    properties.energyType,
    properties.energy_type,
    properties.humanDesignType,
    properties.human_design_type
  ));
  const authority = pickFirst(
    properties.authority,
    properties.innerAuthority,
    properties.inner_authority,
    properties.decisionAuthority,
    properties.decision_authority
  );
  const profile = pickFirst(
    properties.profile,
    properties.profileLine,
    properties.profile_line,
    properties.profileName,
    properties.profile_name
  );
  return { type, authority, profile };
}

function parseBirthDateParts(birthDate) {
  const match = String(birthDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3] };
}

function parseBirthTimeParts(birthTime) {
  const match = String(birthTime || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

function formatBodyGraphBirthPlace(hit) {
  let formatted = hit.name;
  if (hit.region?.name && hit.name !== hit.region.name) {
    formatted += `, ${hit.region.name}`;
  }
  if (hit.region?.country?.name) {
    formatted += `, ${hit.region.country.name}`;
  }
  return formatted;
}

function normalizeBodyGraphProfile(value) {
  if (!value) return null;
  return String(value).replace(/\s+/g, "").replace(/-/g, "/");
}

function normalizeBodyGraphAuthority(value) {
  if (!value) return null;
  return String(value).trim().split(" - ")[0].trim();
}

function normalizeBodyGraphChartPayload(data) {
  const properties = data?.Properties || data?.properties || {};
  const type = normalizeHumanDesignType(pickFirst(
    properties.Type?.id,
    properties.Type?.option,
    properties.type?.id,
    properties.type?.option
  ));
  const authority = normalizeBodyGraphAuthority(pickFirst(
    properties.InnerAuthority?.option,
    properties.InnerAuthority?.id,
    properties.innerAuthority?.option,
    properties.innerAuthority?.id,
    properties.Authority?.option,
    properties.Authority?.id
  ));
  const profile = normalizeBodyGraphProfile(pickFirst(
    properties.Profile?.option,
    properties.Profile?.id,
    properties.profile?.option,
    properties.profile?.id
  ));
  return { type, authority, profile };
}

async function resolveBodyGraphLocation({ birthPlace, latitude, longitude, timeZone }) {
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const placeLabel = birthPlace?.trim();

  if (hasCoords && timeZone && placeLabel) {
    return {
      birthplace: placeLabel,
      latitude: String(latitude),
      longitude: String(longitude),
      timezone: timeZone,
    };
  }

  if (!placeLabel) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `${BODYGRAPHCHART_LOCATIONS_URL}?query=${encodeURIComponent(placeLabel)}&limit=5`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`Location lookup returned ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;

    let hit = rows[0];
    if (hasCoords) {
      const exact = rows.find((row) =>
        Math.abs(Number(row.latitude) - latitude) < 0.75 &&
        Math.abs(Number(row.longitude) - longitude) < 0.75
      );
      if (exact) hit = exact;
    }

    return {
      birthplace: formatBodyGraphBirthPlace(hit),
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone || timeZone || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function calculateHumanDesignViaZenFemme({
  birthDate,
  birthTime,
  birthPlace,
  latitude,
  longitude,
  timeZone,
}) {
  const source = "Zen Femme free chart";
  const dateParts = parseBirthDateParts(birthDate);
  const timeParts = parseBirthTimeParts(birthTime);
  if (!dateParts || !timeParts) {
    return {
      ok: false,
      source,
      message: "Human Design could not be calculated from the verified Zen Femme source because the birth date or time was invalid. No value was guessed.",
    };
  }

  const location = await resolveBodyGraphLocation({
    birthPlace,
    latitude,
    longitude,
    timeZone,
  });
  if (!location?.timezone || !location.latitude || !location.longitude || !location.birthplace) {
    return {
      ok: false,
      source,
      message: "Human Design could not be calculated from the verified Zen Femme source because the birth place timezone and coordinates could not be resolved. No value was guessed.",
    };
  }

  const requestData = new URLSearchParams({
    name: "Chart",
    year: dateParts.year,
    month: dateParts.month,
    day: dateParts.day,
    hour: timeParts.hour,
    minute: timeParts.minute,
    birthplace: location.birthplace,
    timezone: location.timezone,
    latitude: location.latitude,
    longitude: location.longitude,
    chartUrl: `${ZEN_FEMME_CHART_URL}#chart,${Buffer.from(`name=Chart&birthplace=${location.birthplace}`).toString("base64")}`,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HD_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${BODYGRAPHCHART_GENERATE_URL}?token=${encodeURIComponent(BODYGRAPHCHART_EMBED_TOKEN)}`,
      {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          Origin: "https://thezenfemme.com",
          Referer: ZEN_FEMME_CHART_URL,
        },
        body: requestData,
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`Zen Femme chart source returned ${res.status}`);
    const data = await res.json();
    const parsed = normalizeBodyGraphChartPayload(data);
    if (!parsed.type && !parsed.authority && !parsed.profile) {
      throw new Error("Zen Femme chart response did not include Type, Authority, or Profile");
    }
    return {
      ok: true,
      source,
      sourceUrl: ZEN_FEMME_CHART_URL,
      ...parsed,
    };
  } catch (e) {
    const message = e.name === "AbortError"
      ? "Human Design could not be calculated from the verified Zen Femme source because the request timed out. No value was guessed."
      : "Human Design could not be calculated from the verified Zen Femme source. No value was guessed.";
    return { ok: false, source, message };
  } finally {
    clearTimeout(timeout);
  }
}

async function calculateHumanDesignViaApi({ birthDate, birthTime, birthPlace, latitude, longitude }) {
  const source = "Zen Femme free chart";
  if (!HUMAN_DESIGN_API_KEY) {
    return {
      ok: false,
      source,
      message: "Human Design could not be calculated from the verified Zen Femme source. No value was guessed.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HD_REQUEST_TIMEOUT_MS);
  try {
    const useCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const url = useCoordinates
      ? "https://api.humandesignapi.nl/v2/charts/coordinates"
      : "https://api.humandesignapi.nl/v2/charts/simple";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUMAN_DESIGN_API_KEY}`,
      "User-Agent": USER_AGENT,
    };
    if (!useCoordinates && HUMAN_DESIGN_GEOCODE_KEY) {
      headers["HD-Geocode-Key"] = HUMAN_DESIGN_GEOCODE_KEY;
    }
    const body = useCoordinates
      ? { birthdate: birthDate, birthtime: birthTime, lat: latitude, lng: longitude }
      : { birthdate: birthDate, birthtime: birthTime, location: birthPlace };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Fallback source returned ${res.status}`);
    const parsed = normalizeHumanDesignApiPayload(await res.json());
    if (!parsed.type && !parsed.authority && !parsed.profile) {
      throw new Error("Human Design response did not include chart properties");
    }
    return { ok: true, source, ...parsed };
  } catch (e) {
    return {
      ok: false,
      source,
      message: "Human Design could not be calculated from the verified Zen Femme source. No value was guessed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function calculateHumanDesign(args) {
  const zen = await calculateHumanDesignViaZenFemme(args);
  if (zen.ok) return zen;

  if (HUMAN_DESIGN_API_KEY) {
    const fallback = await calculateHumanDesignViaApi(args);
    if (fallback.ok) return fallback;
    return {
      ok: false,
      source: zen.source,
      message: "Human Design could not be calculated from the verified Zen Femme source. No value was guessed.",
    };
  }

  return zen;
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
  if (!birthTime) return { status: 400, body: { error: "birthTime required" } };

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
  const { chineseYearForBirthDate } = await getLunar();
  const chineseYear = chineseYearForBirthDate(birthDate);
  const humanDesign = await calculateHumanDesign({
    birthDate,
    birthTime,
    birthPlace: placeLabel,
    latitude: lat,
    longitude: lon,
    timeZone,
  });

  return {
    status: 200,
    body: {
      ...chart,
      chineseYear,
      chineseAnimal: chineseAnimalFromLunarYear(chineseYear),
      chineseElement: chineseElementFromYear(chineseYear),
      humanDesign,
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

    if (url.pathname === "/api/countries" && req.method === "GET") {
      try {
        const out = await handleCountries();
        return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Countries failed", countries: [] });
      }
    }

    if (url.pathname === "/api/cities" && req.method === "GET") {
      try {
        const out = await handleCities(url);
        return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Cities failed", cities: [] });
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

    if (url.pathname === "/api/today" && req.method === "GET") {
      try {
        const out = await handleToday(url);
        return sendJson(res, out.status, out.body);
      } catch (e) {
        return sendJson(res, 500, { error: e.message || "Today insights failed" });
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
      const ext = path.extname(file);
      const cacheControl = file.endsWith(".html") || [".js", ".css"].includes(ext)
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=300";
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
        "Cache-Control": cacheControl,
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Cosmic Dating -> http://localhost:${PORT}`);
    console.log(`Astro API: POST /api/natal · GET /api/geocode?q=City · GET /api/today · GET /api/countries · GET /api/cities?country=Country`);
    console.log(DATABASE_URL ? "Profile DB: PostgreSQL enabled" : "Profile DB: localStorage fallback");
  });
