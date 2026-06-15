import {
  ZODIAC_SIGNS, HD_TYPES,
  CHINESE_ZODIAC, CHINESE_ELEMENTS, LOOKING_FOR, GENDERS, INTERESTS,
  getZodiacById, getHdTypeById, getChineseById,
} from "./data.js";
import {
  compatibilityScore, matchesFilters,
  applyNatalChart, compatibilityInsight, compatibilityBreakdown,
} from "./cosmic.js";
import {
  topWesternMatches, topChineseMatches, zodiacPairScore,
} from "./compatibility-matrix.js";
import { compatibilitySources } from "./compatibility-data.js";
import { fetchCities, fetchCountries, fetchNatalChart, fetchTodayInsights } from "./api-client.js";
import { BIRTH_LOCATIONS, getCitiesForCountry } from "./locations.js";
import {
  getMyProfile, saveMyProfile, getPreferences, savePreferences,
  getAllProfiles, getProfileById, toggleLike, getLikes, createProfileId,
  syncProfilesFromServer, saveProfileToServer,
} from "./store.js";
import { applyLanguage, initLanguageSwitcher, translatePage } from "./i18n.js";

const app = document.getElementById("app");
const mainNav = document.getElementById("main-nav");

let route = "home";
let wizardStep = 0;
let wizardDraft = {};
let viewProfileId = null;
let todayRequestId = 0;
let locationRequestId = 0;

const WIZARD_STEPS = ["Basics", "Cosmic self", "Preferences"];
const OTHER_CITY_VALUE = "__other__";
const LOCAL_COUNTRIES = BIRTH_LOCATIONS.map((item) => item.country);
const birthLocationState = {
  countries: LOCAL_COUNTRIES,
  countriesLoaded: false,
  countriesLoading: false,
  countriesError: "",
  citiesByCountry: new Map(BIRTH_LOCATIONS.map((item) => [item.country, item.cities])),
  cityLoads: new Set(),
  cityLoadingCountry: "",
  cityErrors: new Map(),
};

function sortUniqueStrings(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function currentBirthCountries() {
  return sortUniqueStrings([...LOCAL_COUNTRIES, ...birthLocationState.countries]);
}

function currentBirthCities(country) {
  if (!country) return [];
  const loaded = birthLocationState.citiesByCountry.get(country);
  return loaded?.length ? loaded : getCitiesForCountry(country);
}

function isCreateCosmicStep() {
  return route === "create" && wizardStep === 1;
}

function rerenderCreateCosmicStep() {
  if (isCreateCosmicStep()) renderCreate();
}

async function loadBirthCountries() {
  if (birthLocationState.countriesLoaded || birthLocationState.countriesLoading) return;
  birthLocationState.countriesLoading = true;
  birthLocationState.countriesError = "";
  const requestId = ++locationRequestId;
  try {
    const data = await fetchCountries();
    if (requestId !== locationRequestId) return;
    birthLocationState.countries = currentBirthCountries().concat(data.countries || []);
    birthLocationState.countriesLoaded = true;
  } catch (e) {
    birthLocationState.countriesError = e.message || "Using local country list.";
    birthLocationState.countriesLoaded = true;
  } finally {
    birthLocationState.countriesLoading = false;
    rerenderCreateCosmicStep();
  }
}

async function loadBirthCities(country) {
  if (!country || birthLocationState.cityLoads.has(country) || birthLocationState.cityLoadingCountry === country) return;
  birthLocationState.cityLoadingCountry = country;
  birthLocationState.cityErrors.delete(country);
  try {
    const data = await fetchCities(country);
    const resolvedCountry = data.country || country;
    birthLocationState.citiesByCountry.set(resolvedCountry, sortUniqueStrings(data.cities || []));
    if (resolvedCountry !== country) {
      birthLocationState.citiesByCountry.set(country, birthLocationState.citiesByCountry.get(resolvedCountry) || []);
    }
    birthLocationState.cityLoads.add(country);
  } catch (e) {
    birthLocationState.cityErrors.set(country, e.message || "Using local city list.");
    birthLocationState.cityLoads.add(country);
  } finally {
    if (birthLocationState.cityLoadingCountry === country) birthLocationState.cityLoadingCountry = "";
    rerenderCreateCosmicStep();
  }
}

function calculateAge(birthDate, birthTime = "00:00") {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T${birthTime || "00:00"}:00`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const hadBirthday =
    now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() &&
      (now.getDate() > born.getDate() ||
        (now.getDate() === born.getDate() &&
          (now.getHours() > born.getHours() ||
            (now.getHours() === born.getHours() && now.getMinutes() >= born.getMinutes())))));
  if (!hadBirthday) age--;
  return age >= 0 ? age : null;
}

function ageLabel(profile) {
  return calculateAge(profile?.birthDate, profile?.birthTime) ?? profile?.age ?? "";
}

function hasBirthInputs(d) {
  return Boolean(d.birthDate && d.birthTime && buildBirthPlace(d));
}

function hasCalculatedChart(d) {
  return Boolean(d.sunSign && d.moonSign && d.risingSign && d.chineseAnimal && d.chineseElement);
}

function buildBirthPlace(d) {
  const city = d.birthCity === OTHER_CITY_VALUE ? d.birthCityOther : d.birthCity;
  if (!city || !d.birthCountry) return "";
  return `${city}, ${d.birthCountry}`;
}

function hydrateBirthLocation(d) {
  const placeSource = d.birthPlace || d.location;
  if ((d.birthCountry && d.birthCity) || !placeSource) return d;
  const place = String(placeSource);
  const placeLower = place.toLowerCase();
  const cityCandidate = place.split(",")[0]?.trim();
  const aliases = {
    "United States": ["usa", "u.s.a.", "us", "u.s.", "united states of america"],
    "United Kingdom": ["uk", "u.k.", "great britain", "england"],
    "United Arab Emirates": ["uae", "u.a.e."],
  };
  const matched = BIRTH_LOCATIONS.find((item) => {
    const names = [item.country, ...(aliases[item.country] || [])].map((name) => name.toLowerCase());
    return names.some((name) => placeLower.includes(name)) ||
      item.cities.some((city) => cityCandidate && city.toLowerCase() === cityCandidate.toLowerCase());
  });
  if (!matched || !cityCandidate) return d;
  const matchedCity = matched.cities.find((item) => item.toLowerCase() === cityCandidate.toLowerCase());
  return {
    ...d,
    birthCountry: matched.country,
    birthCity: matchedCity || OTHER_CITY_VALUE,
    birthCityOther: matchedCity ? "" : cityCandidate,
  };
}

function navigate(r, params = {}) {
  route = r;
  if (params.id) viewProfileId = params.id;
  if (r === "create") wizardStep = 0;
  render();
  window.scrollTo(0, 0);
}

function esc(s) {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

function renderNav() {
  const profile = getMyProfile();
  const links = [
    { id: "home", label: "Home" },
    { id: "discover", label: "Discover" },
    ...(profile ? [{ id: "today", label: "Today" }] : []),
    profile
      ? { id: "profile", label: "My profile" }
      : { id: "create", label: "Create profile" },
    { id: "preferences", label: "Match prefs" },
    ...(profile ? [{ id: "matches", label: "Sign matches" }] : []),
  ];
  mainNav.innerHTML = links
    .map(
      (l) =>
        `<a href="#" class="nav-link${route === l.id ? " active" : ""}" data-nav="${l.id}">${esc(l.label)}</a>`
    )
    .join("");
}

function cosmicTagsHtml(p) {
  const z = getZodiacById(p.sunSign || p.zodiac);
  const moon = getZodiacById(p.moonSign);
  const rising = getZodiacById(p.risingSign);
  const hd = getHdTypeById(p.hdType);
  const cn = getChineseById(p.chineseAnimal);
  return `
    ${z ? `<span class="tag zodiac" title="Sun">${z.symbol} ${z.name}</span>` : ""}
    ${moon ? `<span class="tag zodiac" title="Moon">☽ ${moon.name}</span>` : ""}
    ${rising ? `<span class="tag zodiac" title="Rising">↑ ${rising.name}</span>` : ""}
    ${hd ? `<span class="tag hd">${hd.name}</span>` : ""}
    ${cn ? `<span class="tag chinese">${cn.emoji} ${cn.name} · ${esc(p.chineseElement || "")}</span>` : ""}
  `;
}

function profileCardHtml(p, viewer, prefs) {
  const score = viewer ? compatibilityScore(viewer, p, prefs) : null;
  const age = ageLabel(p);
  return `
    <article class="card profile-card" data-profile-id="${esc(p.id)}">
      <img class="profile-card-avatar" src="${esc(p.avatar)}" alt="" loading="lazy" />
      <h3>${esc(p.name)}${age !== "" ? `, ${esc(age)}` : ""}</h3>
      <p class="profile-card-meta">${esc(p.location)}</p>
      <div class="cosmic-tags">
        ${cosmicTagsHtml(p)}
        ${score != null ? `<span class="tag match">${score}% aligned</span>` : ""}
      </div>
      <p style="font-size:0.88rem;color:var(--text-muted);margin:0.75rem 0 0">${esc(p.bio?.slice(0, 90))}${(p.bio?.length || 0) > 90 ? "…" : ""}</p>
    </article>
  `;
}

function compatBreakdownHtml(viewer, profile) {
  const b = compatibilityBreakdown(viewer, profile);
  if (!b?.breakdown?.length) return "";
  const rows = b.breakdown
    .map(
      (r) =>
        `<tr><td>${esc(r.layer)}</td><td>${esc(getZodiacById(r.yours)?.name || r.yours)}</td><td>${esc(getZodiacById(r.theirs)?.name || r.theirs)}</td><td>${r.score}%</td></tr>`
    )
    .join("");
  return `
    <div class="compat-breakdown" style="margin:0.75rem 0;font-size:0.85rem">
      <p style="color:var(--text-muted);margin:0 0 0.35rem">Layer scores (scraped sun-sign matrix)</p>
      <table class="compat-table"><thead><tr><th></th><th>You</th><th>Them</th><th>Match</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="color:var(--text-muted);margin:0.35rem 0 0">Chinese year: ${b.chinese}% · Combined: ${b.score}%</p>
    </div>`;
}

function compatScoreClass(score) {
  if (score >= 75) return "excellent";
  if (score >= 60) return "good";
  if (score >= 45) return "moderate";
  return "challenging";
}

function renderSignMatches() {
  const me = getMyProfile();
  if (!me) {
    app.innerHTML = `<div class="empty-state card"><p>Create a profile to see your best sign matches.</p><button class="btn btn-primary" data-nav="create">Create profile</button></div>`;
    return;
  }
  const sun = me.sunSign || me.zodiac;
  const cn = me.chineseAnimal;
  const westernTop = topWesternMatches(sun, 12);
  const chineseTop = cn ? topChineseMatches(cn, 12) : [];
  const src = compatibilitySources()[0];

  const allWestern = ZODIAC_SIGNS.map((z) => ({
    id: z.id,
    name: z.name,
    symbol: z.symbol,
    score: zodiacPairScore(sun, z.id),
  })).sort((a, b) => b.score - a.score);

  app.innerHTML = `
    <h2 class="section-title">Your sign matches</h2>
    <p class="section-sub">All-pair scores from <a href="${esc(src?.url || "#")}" target="_blank" rel="noopener">${esc(src?.name || "astrology sources")}</a> — run <code>npm run scrape:compat</code> to refresh.</p>
    <div class="card-grid" style="margin-bottom:1.5rem">
      <div class="card">
        <h3>☉ Best Sun matches</h3>
        <p style="font-size:0.85rem;color:var(--text-muted)">Your Sun: ${esc(getZodiacById(sun)?.symbol)} ${esc(getZodiacById(sun)?.name)}</p>
        <ul class="match-list">
          ${westernTop.map((m) => `<li><span>${esc(getZodiacById(m.sign)?.symbol)} ${esc(m.name)}</span><span class="compat-pill ${compatScoreClass(m.score)}">${m.score}%</span></li>`).join("")}
        </ul>
      </div>
      ${cn ? `
      <div class="card">
        <h3>🐉 Best Chinese matches</h3>
        <p style="font-size:0.85rem;color:var(--text-muted)">Your animal: ${esc(getChineseById(cn)?.emoji)} ${esc(getChineseById(cn)?.name)}</p>
        <ul class="match-list">
          ${chineseTop.map((m) => `<li><span>${esc(getChineseById(m.animal)?.emoji)} ${esc(m.name)}</span><span class="compat-pill ${compatScoreClass(m.score)}">${m.score}%</span></li>`).join("")}
        </ul>
      </div>` : ""}
    </div>
    <div class="card">
      <h3>All 12 Sun pairings</h3>
      <div class="compat-mini-grid">
        ${allWestern.map((z) => `<div class="compat-cell ${compatScoreClass(z.score)}" title="${esc(z.name)}"><span>${z.symbol}</span><strong>${z.score}%</strong></div>`).join("")}
      </div>
    </div>
    <p style="margin-top:1rem"><button type="button" class="btn btn-primary" data-nav="discover">Find souls in Discover</button></p>
  `;
}

function sourceLinkHtml(item, label = "Source") {
  if (!item?.sourceUrl) return "";
  return `<a class="source-link" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function statusTagHtml(ok) {
  return `<span class="tag ${ok ? "match" : ""}">${ok ? "Live source" : "Fallback"}</span>`;
}

const LEGACY_HD_RECALC_PROMPT = "Human Design can now be calculated from your birth data via the Zen Femme free chart. Click Calculate again, then save your profile.";

function isLegacyHumanDesignApiFailure(p) {
  const status = String(p?.hdCalculationStatus || "");
  const source = String(p?.humanDesignSource || p?.hdSource || "");
  return !p?.hdType && /Human Design API|HUMAN_DESIGN_API_KEY/i.test(`${source} ${status}`);
}

function sanitizedHumanDesignSource(source) {
  return /Human Design API|HUMAN_DESIGN_API_KEY/i.test(String(source || "")) ? "Zen Femme free chart" : source;
}

function sanitizedHumanDesignStatus(status) {
  return /Human Design API|HUMAN_DESIGN_API_KEY/i.test(String(status || ""))
    ? LEGACY_HD_RECALC_PROMPT
    : status;
}

function humanDesignDisplay(p) {
  const hd = getHdTypeById(p?.hdType);
  const legacyApiFailure = isLegacyHumanDesignApiFailure(p);
  const source = legacyApiFailure ? "" : sanitizedHumanDesignSource(p?.humanDesignSource || p?.hdSource || "");
  const status = legacyApiFailure
    ? LEGACY_HD_RECALC_PROMPT
    : sanitizedHumanDesignStatus(p?.hdCalculationStatus || "Human Design requires the Zen Femme free chart source. It will stay blank until it can be calculated from verified birth data.");
  const details = [p?.hdAuthority, p?.hdProfile].filter(Boolean).join(" · ");
  return { hd, source, status, details };
}

function renderTodayCard({ eyebrow, title, meta, body, source, ok, extra = "" }) {
  return `
    <article class="card today-card">
      <div class="today-card-head">
        <span class="today-eyebrow">${esc(eyebrow)}</span>
        ${statusTagHtml(ok)}
      </div>
      <h3>${esc(title)}</h3>
      ${meta ? `<p class="today-meta">${esc(meta)}</p>` : ""}
      <p class="daily-text">${esc(body)}</p>
      ${extra}
      ${sourceLinkHtml(source)}
    </article>
  `;
}

function renderTodayContent(me, data) {
  const sun = getZodiacById(me.sunSign || me.zodiac);
  const hd = getHdTypeById(me.hdType);
  const cn = getChineseById(me.chineseAnimal);
  const hdImpact = data.humanDesign || {};
  const hdExtraParts = [
    hdImpact.gate && `Gate: ${hdImpact.gate}`,
    hdImpact.line && `Line ${hdImpact.line}${hdImpact.lineName ? ` - ${hdImpact.lineName}` : ""}`,
    hdImpact.bodygraph && `Center: ${hdImpact.bodygraph}`,
    hdImpact.harmonicGate && `Harmonic: ${hdImpact.harmonicGate}`,
  ].filter(Boolean);

  app.innerHTML = `
    <section class="today-hero card">
      <span class="hero-badge">Today</span>
      <h1>Your daily cosmic weather</h1>
      <p>Read the day through your saved Sun sign, Human Design, and Chinese zodiac year.</p>
      <div class="cosmic-tags">
        ${sun ? `<span class="tag zodiac">${sun.symbol} ${sun.name}</span>` : ""}
        ${hd ? `<span class="tag hd">${hd.name}</span>` : ""}
        ${cn ? `<span class="tag chinese">${cn.emoji} ${cn.name}${me.chineseElement ? ` · ${esc(me.chineseElement)}` : ""}</span>` : ""}
      </div>
    </section>
    <div class="today-grid">
      ${renderTodayCard({
        eyebrow: "Western astrology",
        title: data.horoscope?.title || "Daily horoscope",
        meta: data.horoscope?.date || (sun ? `${sun.element} · ${sun.dates}` : ""),
        body: data.horoscope?.text || "Today's horoscope is unavailable right now.",
        source: data.horoscope,
        ok: data.horoscope?.ok,
      })}
      ${renderTodayCard({
        eyebrow: "Human Design",
        title: hdImpact.title || "Human Design Daily Impact",
        meta: [
          hd?.name,
          me.hdAuthority && `${me.hdAuthority} authority`,
          me.hdProfile && `${me.hdProfile} profile`,
          hdImpact.date,
        ].filter(Boolean).join(" · "),
        body: hdImpact.text || "Today's Human Design impact is unavailable right now.",
        source: hdImpact,
        ok: hdImpact.ok,
        extra: hdExtraParts.length ? `<ul class="today-facts">${hdExtraParts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : "",
      })}
      ${renderTodayCard({
        eyebrow: "Chinese zodiac",
        title: cn ? `${cn.emoji} ${cn.name} year guidance` : "Chinese zodiac year",
        meta: [me.chineseElement && `${me.chineseElement} element`, me.birthDate && `Born ${me.birthDate.slice(0, 4)}`].filter(Boolean).join(" · "),
        body: data.chinese?.text || `${cn?.traits || "Your Chinese year reference is unavailable right now."}`,
        source: data.chinese,
        ok: data.chinese?.ok,
      })}
    </div>
    <p class="today-note">Daily sources can change their markup or availability; cached server fetches keep this page fast and avoid browser-side CORS scraping.</p>
  `;
  translatePage(app);
}

function renderToday() {
  const me = getMyProfile();
  if (!me) {
    app.innerHTML = `
      <div class="empty-state card">
        <h2 class="section-title">Your daily cosmic weather</h2>
        <p>Create a profile first so Today can personalize your horoscope, Human Design, and Chinese zodiac guidance.</p>
        <button type="button" class="btn btn-primary" data-nav="create">Create profile</button>
      </div>
    `;
    return;
  }

  const sun = getZodiacById(me.sunSign || me.zodiac);
  const hd = getHdTypeById(me.hdType);
  const cn = getChineseById(me.chineseAnimal);
  const requestId = ++todayRequestId;
  app.innerHTML = `
    <section class="today-hero card">
      <span class="hero-badge">Today</span>
      <h1>Your daily cosmic weather</h1>
      <p>Loading live daily insights for ${esc(me.name || "your profile")}.</p>
      <div class="cosmic-tags">
        ${sun ? `<span class="tag zodiac">${sun.symbol} ${sun.name}</span>` : ""}
        ${hd ? `<span class="tag hd">${hd.name}</span>` : ""}
        ${cn ? `<span class="tag chinese">${cn.emoji} ${cn.name}</span>` : ""}
      </div>
      <p class="today-loading">Consulting today&apos;s sources...</p>
    </section>
  `;

  fetchTodayInsights(me)
    .then((data) => {
      if (route === "today" && requestId === todayRequestId) renderTodayContent(me, data);
    })
    .catch((e) => {
      if (route !== "today" || requestId !== todayRequestId) return;
      app.innerHTML = `
        <div class="empty-state card">
          <h2 class="section-title">Today is cloudy</h2>
          <p>${esc(e.message || "Daily insights are unavailable right now.")}</p>
          <button type="button" class="btn btn-secondary" data-nav="profile">Review my profile</button>
        </div>
      `;
      bindGlobalNav();
    });
}

function renderHome() {
  const profile = getMyProfile();
  app.innerHTML = `
    <section class="hero">
      <span class="hero-badge">Cosmic dating</span>
      <h1>Connect soul to soul</h1>
      <p>Build a profile rich with zodiac, Human Design, and Chinese year wisdom—then discover people who resonate with your cosmic preferences.</p>
      <div class="hero-actions">
        <button type="button" class="btn btn-primary" data-nav="${profile ? "discover" : "create"}">
          ${profile ? "Discover souls" : "Create your profile"}
        </button>
        <button type="button" class="btn btn-secondary" data-nav="preferences">Set match preferences</button>
      </div>
    </section>
    <section class="features">
      <div class="card feature-card">
        <h3>♈ Birth chart</h3>
        <p>Sun, Moon, and Rising from your birth date, time, and place—like major astrology sites calculate.</p>
      </div>
      <div class="card feature-card">
        <h3>◇ Human Design</h3>
        <p>Type, authority, and profile reveal how you're built to connect and decide.</p>
      </div>
      <div class="card feature-card">
        <h3>🐉 Chinese year</h3>
        <p>Animal and element from your birth year add another layer of compatibility.</p>
      </div>
    </section>
  `;
}

function renderDiscover() {
  const viewer = getMyProfile();
  const prefs = getPreferences();
  const filters = prefs;
  let profiles = getAllProfiles().filter((p) => matchesFilters(p, filters));

  profiles.sort((a, b) => {
    const sa = compatibilityScore(viewer, a, prefs);
    const sb = compatibilityScore(viewer, b, prefs);
    return sb - sa;
  });

  if (!viewer) {
    app.innerHTML = `
      <div class="empty-state card">
        <h2 class="section-title">Discover souls</h2>
        <p>Create your profile first so we can show alignment scores tailored to you.</p>
        <button type="button" class="btn btn-primary" data-nav="create">Create profile</button>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <h2 class="section-title">Discover</h2>
    <p class="section-sub">${profiles.length} soul${profiles.length === 1 ? "" : "s"} match your cosmic filters</p>
    <div class="discover-layout">
      <aside class="card filters-panel">
        <h3>Quick filters</h3>
        <p style="font-size:0.85rem;color:var(--text-muted)">Uses your <a href="#" data-nav="preferences" style="color:var(--lavender)">match preferences</a>. Adjust there for full control.</p>
        ${filterSummaryHtml(prefs)}
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%;margin-top:1rem" data-nav="preferences">Edit preferences</button>
      </aside>
      <div>
        <div class="card-grid">
          ${profiles.length ? profiles.map((p) => profileCardHtml(p, viewer, prefs)).join("") : '<div class="empty-state"><p>No profiles match. Loosen your preferences.</p></div>'}
        </div>
      </div>
    </div>
  `;
}

function filterSummaryHtml(prefs) {
  const parts = [];
  if (prefs.zodiac?.length) parts.push(`Signs: ${prefs.zodiac.map((id) => getZodiacById(id)?.name).filter(Boolean).join(", ")}`);
  if (prefs.hdType?.length) parts.push(`HD: ${prefs.hdType.map((id) => getHdTypeById(id)?.name).filter(Boolean).join(", ")}`);
  if (prefs.chinese?.length) parts.push(`Chinese: ${prefs.chinese.map((id) => getChineseById(id)?.name).filter(Boolean).join(", ")}`);
  if (prefs.element?.length) parts.push(`Elements: ${prefs.element.join(", ")}`);
  if (!parts.length) return '<p style="font-size:0.85rem;color:var(--text-muted)">No filters active—all souls visible.</p>';
  return parts.map((p) => `<p style="font-size:0.82rem;margin:0.35rem 0">${esc(p)}</p>`).join("");
}

function renderProfileDetail() {
  const p = getProfileById(viewProfileId);
  const viewer = getMyProfile();
  const prefs = getPreferences();
  if (!p) {
    app.innerHTML = `<div class="empty-state card"><p>Profile not found.</p><button class="btn btn-primary" data-nav="discover">Back</button></div>`;
    return;
  }

  const z = getZodiacById(p.sunSign || p.zodiac);
  const moonZ = getZodiacById(p.moonSign);
  const riseZ = getZodiacById(p.risingSign);
  const hdDisplay = humanDesignDisplay(p);
  const hd = hdDisplay.hd;
  const cn = getChineseById(p.chineseAnimal);
  const score = viewer ? compatibilityScore(viewer, p, prefs) : null;
  const liked = getLikes().includes(p.id);
  const isMine = viewer?.id === p.id;

  app.innerHTML = `
    <button type="button" class="btn btn-ghost btn-sm" data-nav="discover" style="margin-bottom:1rem">← Back</button>
    <article class="card profile-detail">
      <div class="profile-hero">
        <img src="${esc(p.avatar)}" alt="" />
        <div>
          <h1 class="section-title" style="margin:0">${esc(p.name)}${ageLabel(p) !== "" ? `, ${esc(ageLabel(p))}` : ""}</h1>
          <p class="section-sub" style="margin:0.25rem 0 1rem">${esc(p.location)} · ${esc(p.gender)}</p>
          ${score != null ? `<p style="color:var(--gold-bright);font-weight:500">${score}% cosmic alignment with you</p>` : ""}
          ${viewer && !isMine && compatibilityInsight(viewer, p) ? `<p style="font-size:0.9rem;color:var(--lavender);font-style:italic;margin:0.5rem 0 0">${esc(compatibilityInsight(viewer, p))}</p>` : ""}
          ${viewer && !isMine ? compatBreakdownHtml(viewer, p) : ""}
          <p>${esc(p.bio)}</p>
          <p style="font-size:0.9rem;color:var(--text-muted)">Looking for: ${(p.lookingFor || []).map(esc).join(", ")}</p>
          <div class="cosmic-tags" style="margin-top:0.75rem">
            ${(p.interests || []).map((i) => `<span class="tag">${esc(i)}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="cosmic-panel">
        <div class="cosmic-item">
          <div class="label">Western chart</div>
          <div class="value">${z ? `☉ ${z.symbol} ${z.name}` : "—"}</div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0.25rem 0 0">
            ${moonZ ? `☽ ${moonZ.name}` : ""}${riseZ ? `${moonZ ? " · " : ""}↑ ${riseZ.name}` : ""}
          </p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0.2rem 0 0">${z ? `${z.element} · ${z.dates}` : ""}</p>
        </div>
        <div class="cosmic-item">
          <div class="label">Human Design</div>
          <div class="value">${hd ? hd.name : "Not calculated"}</div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0.25rem 0 0">${hd ? esc(hdDisplay.details || "Type calculated") : esc(hdDisplay.status)}</p>
          ${hd ? `<p style="font-size:0.75rem;color:var(--mint)">Strategy: ${hd.strategy}</p>` : ""}
          ${hdDisplay.source ? `<p style="font-size:0.75rem;color:var(--blue);margin:0.25rem 0 0">Source: ${esc(hdDisplay.source)}</p>` : ""}
        </div>
        <div class="cosmic-item">
          <div class="label">Chinese year</div>
          <div class="value">${cn ? `${cn.emoji} ${cn.name}` : "—"}</div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0.25rem 0 0">${esc(p.chineseElement || "")} element · ${cn?.traits || ""}</p>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
        ${!isMine ? `<button type="button" class="btn btn-primary" id="btn-like">${liked ? "♥ Liked" : "♡ Like"}</button>` : ""}
        ${isMine ? `<button type="button" class="btn btn-secondary" data-nav="create">Edit profile</button>` : ""}
      </div>
    </article>
  `;

  document.getElementById("btn-like")?.addEventListener("click", () => {
    toggleLike(p.id);
    renderProfileDetail();
  });
}

function renderMyProfile() {
  const p = getMyProfile();
  if (!p) {
    navigate("create");
    return;
  }
  viewProfileId = p.id;
  renderProfileDetail();
}

function chipGrid(name, options, selected, valueKey = "id", labelFn = (o) => o.name || o) {
  const sel = new Set(selected || []);
  return `
    <div class="chip-grid" data-chip-group="${name}">
      ${options
        .map((o) => {
          const val = typeof o === "string" ? o : o[valueKey];
          const label = typeof o === "string" ? o : labelFn(o);
          return `<button type="button" class="chip${sel.has(val) ? " selected" : ""}" data-chip="${name}" data-value="${esc(val)}">${esc(label)}</button>`;
        })
        .join("")}
    </div>
  `;
}

function renderCreate() {
  const existing = getMyProfile();
  const source = Object.keys(wizardDraft).length ? wizardDraft : existing;
  const d = hydrateBirthLocation({ ...source });
  wizardDraft = { ...d };
  if (hasCalculatedChart(d) && !d._calculatedBirthDate) {
    wizardDraft._calculatedBirthDate = d.birthDate;
    wizardDraft._calculatedBirthTime = d.birthTime;
    wizardDraft._calculatedBirthPlace = d.birthPlace;
    d._calculatedBirthDate = d.birthDate;
    d._calculatedBirthTime = d.birthTime;
    d._calculatedBirthPlace = d.birthPlace;
  }
  const age = calculateAge(d.birthDate, d.birthTime);

  const stepsHtml = WIZARD_STEPS.map((label, i) =>
    `<div class="wizard-step${i < wizardStep ? " done" : ""}${i === wizardStep ? " active" : ""}" title="${esc(label)}"></div>`
  ).join("");

  let stepContent = "";

  if (wizardStep === 0) {
    stepContent = `
      <div class="form-group">
        <label for="name">Display name</label>
        <input id="name" name="name" value="${esc(d.name || "")}" required />
      </div>
      <div class="form-group">
        <label for="location">Location</label>
        <input id="location" name="location" value="${esc(d.location || "")}" placeholder="City, State" />
      </div>
      <div class="form-group">
        <label for="gender">Gender</label>
        <select id="gender" name="gender">
          <option value="">Select…</option>
          ${GENDERS.map((g) => `<option value="${g}"${d.gender === g ? " selected" : ""}>${g}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label for="bio">About you</label>
        <textarea id="bio" name="bio" rows="4">${esc(d.bio || "")}</textarea>
      </div>
      <div class="form-group">
        <label for="avatar">Photo URL</label>
        <input id="avatar" name="avatar" value="${esc(d.avatar || "")}" placeholder="https://…" />
      </div>
      <div class="form-group">
        <label>Looking for</label>
        ${chipGrid("lookingFor", LOOKING_FOR, d.lookingFor)}
      </div>
      <div class="form-group">
        <label>Interests</label>
        ${chipGrid("interests", INTERESTS, d.interests)}
      </div>
    `;
  } else if (wizardStep === 1) {
    const sun = getZodiacById(d.sunSign);
    const moon = getZodiacById(d.moonSign);
    const rising = getZodiacById(d.risingSign);
    const chinese = getChineseById(d.chineseAnimal);
    const countries = sortUniqueStrings([...currentBirthCountries(), d.birthCountry].filter(Boolean));
    const countriesHtml = countries
      .map((country) => `<option value="${esc(country)}"${d.birthCountry === country ? " selected" : ""}>${esc(country)}</option>`)
      .join("");
    const cities = currentBirthCities(d.birthCountry);
    const selectedCityMissing = d.birthCity && d.birthCity !== OTHER_CITY_VALUE && !cities.includes(d.birthCity);
    const cityOptionsHtml = [
      '<option value="">Select city...</option>',
      ...(birthLocationState.cityLoadingCountry === d.birthCountry ? ['<option value="" disabled>Loading cities...</option>'] : []),
      ...cities.map((city) => `<option value="${esc(city)}"${d.birthCity === city ? " selected" : ""}>${esc(city)}</option>`),
      ...(selectedCityMissing ? [`<option value="${esc(d.birthCity)}" selected>${esc(d.birthCity)}</option>`] : []),
      `<option value="${OTHER_CITY_VALUE}"${d.birthCity === OTHER_CITY_VALUE ? " selected" : ""}>Other city...</option>`,
    ].join("");
    const selectedBirthPlace = buildBirthPlace(d);
    const locationStatus = [
      birthLocationState.countriesLoading && "Loading all countries...",
      birthLocationState.countriesError && "Using the local country fallback for now.",
      birthLocationState.cityErrors.get(d.birthCountry) && "City list unavailable for this country; choose Other city if needed.",
    ].filter(Boolean).join(" ");
    const chartHint = hasCalculatedChart(d)
      ? `Calculated from birth data: ☉ ${sun?.name || d.sunSign}${moon ? ` · ☽ ${moon.name}` : ""}${rising ? ` · ↑ ${rising.name}` : ""}`
      : "Enter birth date, exact time, and place, then calculate. The app will not guess your signs.";
    const hdDisplay = humanDesignDisplay(d);
    stepContent = `
      <div class="form-group">
        <label for="birthDate">Birth date</label>
        <input id="birthDate" name="birthDate" type="date" value="${esc(d.birthDate || "")}" required />
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">
          Age is calculated from this date${age != null ? `: ${age}` : ""}. We never ask you to type it.
        </p>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="birthTime">Birth time</label>
          <input id="birthTime" name="birthTime" type="time" value="${esc(d.birthTime || "")}" required />
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">Required for Moon, Rising, and verified Human Design calculations.</p>
        </div>
        <div class="form-group">
          <label for="birthCountry">Country of birth</label>
          <select id="birthCountry" name="birthCountry" required>
            <option value="">Select country...</option>
            ${countriesHtml}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="birthCity">City of birth</label>
          <select id="birthCity" name="birthCity" ${d.birthCountry ? "" : "disabled"} required>
            ${cityOptionsHtml}
          </select>
        </div>
        <div class="form-group${d.birthCity === OTHER_CITY_VALUE ? "" : " hidden"}" id="birth-city-other-wrap">
          <label for="birthCityOther">Other birth city</label>
          <input id="birthCityOther" name="birthCityOther" value="${esc(d.birthCityOther || "")}" placeholder="Type your birth city" />
        </div>
      </div>
      ${locationStatus ? `<p style="font-size:0.76rem;color:var(--text-muted);margin:-0.4rem 0 0.75rem">${esc(locationStatus)}</p>` : ""}
      <p style="font-size:0.78rem;color:var(--text-muted);margin:-0.25rem 0 1rem">
        Selected birth place: ${selectedBirthPlace ? esc(selectedBirthPlace) : "Choose country and city"}
      </p>
      <input type="hidden" id="birthPlace" name="birthPlace" value="${esc(selectedBirthPlace)}" />
      <input type="hidden" id="birthLatitude" name="birthLatitude" value="${esc(d.birthLatitude ?? "")}" />
      <input type="hidden" id="birthLongitude" name="birthLongitude" value="${esc(d.birthLongitude ?? "")}" />
      <input type="hidden" id="utcOffsetMinutes" name="utcOffsetMinutes" value="${esc(d.utcOffsetMinutes ?? "")}" />
      <p id="chart-status" style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1rem">${esc(chartHint)}</p>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-calc-chart" style="margin-bottom:1.25rem">Calculate from birth date, time & place</button>
      <div class="calculated-grid">
        <div class="cosmic-item">
          <div class="label">Western chart</div>
          <div class="value">${sun ? `☉ ${sun.symbol} ${sun.name}` : "Not calculated"}</div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0">
            ${moon ? `☽ ${moon.name}` : "Moon pending"}${rising ? ` · ↑ ${rising.name}` : " · Rising pending"}
          </p>
        </div>
        <div class="cosmic-item">
          <div class="label">Chinese zodiac</div>
          <div class="value">${chinese ? `${chinese.emoji} ${chinese.name}` : "Not calculated"}</div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0">${esc(d.chineseElement || "Element pending")}</p>
        </div>
        <div class="cosmic-item">
          <div class="label">Human Design</div>
          <div class="value">${d.hdType ? esc(getHdTypeById(d.hdType)?.name || d.hdType) : "Not calculated"}</div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0">
            ${hdDisplay.details ? esc(hdDisplay.details) : esc(hdDisplay.status)}
          </p>
          ${hdDisplay.source ? `<p style="font-size:0.72rem;color:var(--blue);margin:0.25rem 0 0">Source: ${esc(hdDisplay.source)}</p>` : ""}
        </div>
      </div>
    `;
  } else {
    stepContent = `
      <p style="color:var(--text-muted);margin-bottom:1.25rem">Choose what you're open to in a partner. These power Discover filters and boost alignment scores.</p>
      <div class="form-group">
        <label>Preferred zodiac signs</label>
        ${chipGrid("prefZodiac", ZODIAC_SIGNS, d.prefZodiac || [], "id", (z) => `${z.symbol} ${z.name}`)}
      </div>
      <div class="form-group">
        <label>Preferred Human Design types</label>
        ${chipGrid("prefHd", HD_TYPES, d.prefHd || [])}
      </div>
      <div class="form-group">
        <label>Preferred Chinese animals</label>
        ${chipGrid("prefChinese", CHINESE_ZODIAC, d.prefChinese || [], "id", (c) => `${c.emoji} ${c.name}`)}
      </div>
      <div class="form-group">
        <label>Preferred Chinese elements</label>
        ${chipGrid("prefElement", CHINESE_ELEMENTS, d.prefElement || [])}
      </div>
    `;
  }

  app.innerHTML = `
    <h2 class="section-title">${existing ? "Edit" : "Create"} your profile</h2>
    <p class="section-sub">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[wizardStep]}</p>
    <form class="card form-wizard" id="wizard-form">
      <div class="wizard-steps">${stepsHtml}</div>
      ${stepContent}
      <div class="wizard-actions">
        <button type="button" class="btn btn-ghost" id="wizard-back"${wizardStep === 0 ? " disabled" : ""}>Back</button>
        <button type="submit" class="btn btn-primary">${wizardStep < WIZARD_STEPS.length - 1 ? "Continue" : "Save profile"}</button>
      </div>
    </form>
  `;

  bindChipGroups();
  if (wizardStep === 1) {
    bindBirthLocationSelectors();
    bindChartCalculator();
    loadBirthCountries();
    if (d.birthCountry) loadBirthCities(d.birthCountry);
  }
  document.getElementById("wizard-back")?.addEventListener("click", () => {
    collectWizardForm();
    wizardStep--;
    renderCreate();
  });
  document.getElementById("wizard-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    collectWizardForm();
    if (wizardStep === 1 && !hasCalculatedChart(wizardDraft)) {
      const status = document.getElementById("chart-status");
      if (status) status.textContent = hasBirthInputs(wizardDraft)
        ? "Please calculate from your birth date, time, and place before continuing."
        : "Birth date, exact time, and birth place are required before continuing.";
      return;
    }
    if (wizardStep < WIZARD_STEPS.length - 1) {
      wizardStep++;
      renderCreate();
    } else {
      finishWizard();
    }
  });
}

function collectWizardForm() {
  const form = document.getElementById("wizard-form");
  if (!form) return;
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    if (v) wizardDraft[k] = v;
  }
  wizardDraft.lookingFor = getChipValues("lookingFor");
  wizardDraft.interests = getChipValues("interests");
  if (wizardStep === 1) {
    ["birthDate", "birthTime", "birthCountry", "birthCity", "birthCityOther", "birthPlace", "birthLatitude", "birthLongitude", "utcOffsetMinutes"].forEach((key) => {
      wizardDraft[key] = fd.get(key) || "";
    });
    wizardDraft.birthPlace = buildBirthPlace(wizardDraft);
    if (wizardDraft.birthDate !== wizardDraft._calculatedBirthDate ||
      wizardDraft.birthTime !== wizardDraft._calculatedBirthTime ||
      wizardDraft.birthPlace !== wizardDraft._calculatedBirthPlace) {
      clearCalculatedBirthFields();
    }
  }
  if (wizardStep === 2) {
    wizardDraft.prefZodiac = getChipValues("prefZodiac");
    wizardDraft.prefHd = getChipValues("prefHd");
    wizardDraft.prefChinese = getChipValues("prefChinese");
    wizardDraft.prefElement = getChipValues("prefElement");
  }
}

function getChipValues(group) {
  return [...document.querySelectorAll(`[data-chip="${group}"].selected`)].map((el) => el.dataset.value);
}

function clearCalculatedBirthFields() {
  delete wizardDraft.sunSign;
  delete wizardDraft.moonSign;
  delete wizardDraft.risingSign;
  delete wizardDraft.zodiac;
  delete wizardDraft.chineseAnimal;
  delete wizardDraft.chineseElement;
  delete wizardDraft.hdType;
  delete wizardDraft.hdAuthority;
  delete wizardDraft.hdProfile;
  delete wizardDraft.humanDesignSource;
  delete wizardDraft.hdCalculationStatus;
  delete wizardDraft.birthLatitude;
  delete wizardDraft.birthLongitude;
  delete wizardDraft.utcOffsetMinutes;
}

function bindBirthLocationSelectors() {
  const country = document.getElementById("birthCountry");
  const city = document.getElementById("birthCity");
  const cityOther = document.getElementById("birthCityOther");
  country?.addEventListener("change", () => {
    collectWizardForm();
    wizardDraft.birthCountry = country.value;
    wizardDraft.birthCity = "";
    wizardDraft.birthCityOther = "";
    clearCalculatedBirthFields();
    renderCreate();
  });
  city?.addEventListener("change", () => {
    collectWizardForm();
    wizardDraft.birthCity = city.value;
    if (city.value !== OTHER_CITY_VALUE) wizardDraft.birthCityOther = "";
    clearCalculatedBirthFields();
    renderCreate();
  });
  cityOther?.addEventListener("change", () => {
    collectWizardForm();
    clearCalculatedBirthFields();
    renderCreate();
  });
}

async function bindChartCalculator() {
  const btn = document.getElementById("btn-calc-chart");
  const status = document.getElementById("chart-status");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    collectWizardForm();
    const d = wizardDraft;
    if (!d.birthDate) {
      if (status) status.textContent = "Enter a birth date first.";
      return;
    }
    if (!d.birthTime) {
      if (status) status.textContent = "Enter the exact birth time before calculating.";
      return;
    }
    const birthPlace = buildBirthPlace(d);
    if (!birthPlace && (d.birthLatitude == null || d.birthLongitude == null)) {
      if (status) status.textContent = "Enter birth place (city, country) before calculating.";
      return;
    }
    btn.disabled = true;
    if (status) status.textContent = "Calculating from birth date, time, and place...";
    try {
      const chart = await fetchNatalChart({
        birthDate: d.birthDate,
        birthTime: d.birthTime,
        birthPlace,
        latitude: d.birthLatitude ? Number(d.birthLatitude) : undefined,
        longitude: d.birthLongitude ? Number(d.birthLongitude) : undefined,
        utcOffsetMinutes: d.utcOffsetMinutes ? Number(d.utcOffsetMinutes) : undefined,
      });
      wizardDraft = applyNatalChart(wizardDraft, chart);
      wizardDraft.birthPlace = birthPlace;
      wizardDraft.zodiac = chart.sunSign || wizardDraft.zodiac;
      wizardDraft.chineseAnimal = chart.chineseAnimal || wizardDraft.chineseAnimal;
      wizardDraft.chineseElement = chart.chineseElement || wizardDraft.chineseElement;
      wizardDraft._calculatedBirthDate = wizardDraft.birthDate;
      wizardDraft._calculatedBirthTime = wizardDraft.birthTime;
      wizardDraft._calculatedBirthPlace = wizardDraft.birthPlace;
      if (chart.humanDesign?.ok) {
        wizardDraft.hdType = chart.humanDesign.type || wizardDraft.hdType;
        wizardDraft.hdAuthority = chart.humanDesign.authority || wizardDraft.hdAuthority;
        wizardDraft.hdProfile = chart.humanDesign.profile || wizardDraft.hdProfile;
        wizardDraft.humanDesignSource = chart.humanDesign.source || "Zen Femme free chart";
        delete wizardDraft.hdSource;
        delete wizardDraft.hdCalculationStatus;
      } else {
        delete wizardDraft.hdType;
        delete wizardDraft.hdAuthority;
        delete wizardDraft.hdProfile;
        wizardDraft.hdCalculationStatus = chart.humanDesign?.message || "Human Design could not be calculated from the verified Zen Femme source. No value was guessed.";
      }
      const parts = [
        chart.sunSign && `☉ ${getZodiacById(chart.sunSign)?.name}`,
        chart.moonSign && `☽ ${getZodiacById(chart.moonSign)?.name}`,
        chart.risingSign && `↑ ${getZodiacById(chart.risingSign)?.name}`,
        chart.chineseAnimal && `${getChineseById(chart.chineseAnimal)?.emoji} ${getChineseById(chart.chineseAnimal)?.name}`,
      ].filter(Boolean);
      if (status) status.textContent = `Calculated: ${parts.join(" · ")}`;
      renderCreate();
    } catch (e) {
      if (status) status.textContent = e.message || "Chart failed. Use node serve.js (not file://).";
    } finally {
      btn.disabled = false;
    }
  });
}

function bindChipGroups() {
  document.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.chip;
      const single = ["zodiac", "hdType", "chineseAnimal", "chineseElement"].includes(group);
      if (single) {
        document.querySelectorAll(`[data-chip="${group}"]`).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      } else {
        btn.classList.toggle("selected");
      }
    });
  });
}

function finishWizard() {
  const existing = getMyProfile();
  const d = wizardDraft;
  const age = calculateAge(d.birthDate, d.birthTime);
  const profile = {
    id: existing?.id || createProfileId(),
    name: d.name,
    age,
    location: d.location,
    bio: d.bio,
    gender: d.gender,
    avatar: d.avatar || "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
    lookingFor: d.lookingFor || [],
    interests: d.interests || [],
    birthDate: d.birthDate,
    birthTime: d.birthTime,
    birthCountry: d.birthCountry,
    birthCity: d.birthCity,
    birthCityOther: d.birthCityOther,
    birthPlace: d.birthPlace,
    birthLatitude: d.birthLatitude != null && d.birthLatitude !== "" ? Number(d.birthLatitude) : undefined,
    birthLongitude: d.birthLongitude != null && d.birthLongitude !== "" ? Number(d.birthLongitude) : undefined,
    utcOffsetMinutes: d.utcOffsetMinutes != null && d.utcOffsetMinutes !== "" ? Number(d.utcOffsetMinutes) : undefined,
    sunSign: d.sunSign,
    moonSign: d.moonSign,
    risingSign: d.risingSign,
    zodiac: d.sunSign,
    hdType: d.hdType,
    hdAuthority: d.hdAuthority,
    hdProfile: d.hdProfile,
    humanDesignSource: d.humanDesignSource,
    hdCalculationStatus: d.hdCalculationStatus,
    chineseAnimal: d.chineseAnimal,
    chineseElement: d.chineseElement,
  };
  saveMyProfile(profile);
  saveProfileToServer(profile).then((saved) => {
    if (!saved) console.info("Profile saved locally; server database unavailable.");
  });
  savePreferences({
    zodiac: d.prefZodiac || [],
    hdType: d.prefHd || [],
    chinese: d.prefChinese || [],
    element: d.prefElement || [],
  });
  wizardDraft = {};
  wizardStep = 0;
  navigate("discover");
}

function renderPreferences() {
  const prefs = getPreferences();
  app.innerHTML = `
    <h2 class="section-title">Match preferences</h2>
    <p class="section-sub">Curate who appears in Discover and who scores highest for you.</p>
    <form class="card form-wizard" id="prefs-form" style="max-width:640px">
      <div class="form-group">
        <label>Zodiac signs you're drawn to</label>
        ${chipGrid("zodiac", ZODIAC_SIGNS, prefs.zodiac, "id", (z) => `${z.symbol} ${z.name}`)}
      </div>
      <div class="form-group">
        <label>Human Design types</label>
        ${chipGrid("hdType", HD_TYPES, prefs.hdType)}
      </div>
      <div class="form-group">
        <label>Chinese zodiac animals</label>
        ${chipGrid("chinese", CHINESE_ZODIAC, prefs.chinese, "id", (c) => `${c.emoji} ${c.name}`)}
      </div>
      <div class="form-group">
        <label>Chinese elements</label>
        ${chipGrid("element", CHINESE_ELEMENTS, prefs.element)}
      </div>
      <button type="submit" class="btn btn-primary">Save preferences</button>
    </form>
  `;
  bindChipGroups();
  document.getElementById("prefs-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    savePreferences({
      zodiac: getChipValues("zodiac"),
      hdType: getChipValues("hdType"),
      chinese: getChipValues("chinese"),
      element: getChipValues("element"),
    });
    navigate("discover");
  });
}

function render() {
  renderNav();
  switch (route) {
    case "home":
      renderHome();
      break;
    case "discover":
      renderDiscover();
      break;
    case "today":
      renderToday();
      break;
    case "profile":
      renderMyProfile();
      break;
    case "view":
      renderProfileDetail();
      break;
    case "create":
      renderCreate();
      break;
    case "preferences":
      renderPreferences();
      break;
    case "matches":
      renderSignMatches();
      break;
    default:
      renderHome();
  }
  bindGlobalNav();
  applyLanguage();
  translatePage(document.body);
}

function bindGlobalNav() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const target = el.dataset.nav;
      if (target === "create" && getMyProfile()) {
        wizardDraft = { ...getMyProfile() };
        const prefs = getPreferences();
        wizardDraft.prefZodiac = prefs.zodiac;
        wizardDraft.prefHd = prefs.hdType;
        wizardDraft.prefChinese = prefs.chinese;
        wizardDraft.prefElement = prefs.element;
      }
      navigate(target);
    });
  });
  document.querySelectorAll("[data-profile-id]").forEach((el) => {
    el.addEventListener("click", () => {
      viewProfileId = el.dataset.profileId;
      navigate("view");
    });
  });
}

document.querySelector(".logo")?.addEventListener("click", (e) => {
  e.preventDefault();
  navigate("home");
});

initLanguageSwitcher(render);
render();
syncProfilesFromServer().then((synced) => {
  if (synced) render();
});
