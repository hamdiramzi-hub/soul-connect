import {
  ZODIAC_SIGNS, HD_TYPES, HD_AUTHORITIES, HD_PROFILES,
  CHINESE_ZODIAC, CHINESE_ELEMENTS, LOOKING_FOR, GENDERS, INTERESTS,
  getZodiacById, getHdTypeById, getChineseById,
} from "./data.js";
import {
  deriveCosmicFromBirthDate, compatibilityScore, matchesFilters,
  applyNatalChart, compatibilityInsight, compatibilityBreakdown,
} from "./cosmic.js";
import {
  topWesternMatches, topChineseMatches, zodiacPairScore,
} from "./compatibility-matrix.js";
import { compatibilitySources } from "./compatibility-data.js";
import { fetchNatalChart, geocodePlace } from "./api-client.js";
import {
  getMyProfile, saveMyProfile, getPreferences, savePreferences,
  getAllProfiles, getProfileById, toggleLike, getLikes, createProfileId,
} from "./store.js";

const app = document.getElementById("app");
const mainNav = document.getElementById("main-nav");

let route = "home";
let wizardStep = 0;
let wizardDraft = {};
let viewProfileId = null;

const WIZARD_STEPS = ["Basics", "Cosmic self", "Preferences"];

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
  return `
    <article class="card profile-card" data-profile-id="${esc(p.id)}">
      <img class="profile-card-avatar" src="${esc(p.avatar)}" alt="" loading="lazy" />
      <h3>${esc(p.name)}, ${p.age}</h3>
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
  const hd = getHdTypeById(p.hdType);
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
          <h1 class="section-title" style="margin:0">${esc(p.name)}, ${p.age}</h1>
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
          <div class="value">${hd ? hd.name : "—"}</div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0.25rem 0 0">${esc(p.hdProfile || "")} · ${esc(p.hdAuthority || "")}</p>
          ${hd ? `<p style="font-size:0.75rem;color:var(--mint)">Strategy: ${hd.strategy}</p>` : ""}
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
  const d = { ...existing, ...wizardDraft };
  const cosmic = deriveCosmicFromBirthDate(d.birthDate);
  const autoZodiac = d.zodiac || cosmic.zodiac;
  const autoChinese = d.chineseAnimal || cosmic.chineseAnimal;
  const autoElement = d.chineseElement || cosmic.chineseElement;

  const stepsHtml = WIZARD_STEPS.map((label, i) =>
    `<div class="wizard-step${i < wizardStep ? " done" : ""}${i === wizardStep ? " active" : ""}" title="${esc(label)}"></div>`
  ).join("");

  let stepContent = "";

  if (wizardStep === 0) {
    stepContent = `
      <div class="form-row">
        <div class="form-group">
          <label for="name">Display name</label>
          <input id="name" name="name" value="${esc(d.name || "")}" required />
        </div>
        <div class="form-group">
          <label for="age">Age</label>
          <input id="age" name="age" type="number" min="18" max="120" value="${esc(d.age || "")}" required />
        </div>
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
    const chartHint = d.sunSign
      ? `Calculated: ☉ ${getZodiacById(d.sunSign)?.name || d.sunSign}${d.moonSign ? ` · ☽ ${getZodiacById(d.moonSign)?.name}` : ""}${d.risingSign ? ` · ↑ ${getZodiacById(d.risingSign)?.name}` : ""}`
      : "";
    stepContent = `
      <div class="form-group">
        <label for="birthDate">Birth date</label>
        <input id="birthDate" name="birthDate" type="date" value="${esc(d.birthDate || "")}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="birthTime">Birth time</label>
          <input id="birthTime" name="birthTime" type="time" value="${esc(d.birthTime || "")}" />
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">Needed for Moon & Rising</p>
        </div>
        <div class="form-group">
          <label for="birthPlace">Birth place</label>
          <input id="birthPlace" name="birthPlace" value="${esc(d.birthPlace || "")}" placeholder="City, Country" />
        </div>
      </div>
      <input type="hidden" id="birthLatitude" name="birthLatitude" value="${esc(d.birthLatitude ?? "")}" />
      <input type="hidden" id="birthLongitude" name="birthLongitude" value="${esc(d.birthLongitude ?? "")}" />
      <input type="hidden" id="utcOffsetMinutes" name="utcOffsetMinutes" value="${esc(d.utcOffsetMinutes ?? "")}" />
      <p id="chart-status" style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1rem">${esc(chartHint)}</p>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-calc-chart" style="margin-bottom:1.25rem">Calculate chart from date, time & place</button>
      <div class="form-group">
        <label>Western zodiac ${autoZodiac ? `(suggested: ${getZodiacById(autoZodiac)?.name})` : ""}</label>
        ${chipGrid("zodiac", ZODIAC_SIGNS, [d.zodiac || autoZodiac].filter(Boolean), "id", (z) => `${z.symbol} ${z.name}`)}
      </div>
      <div class="form-group">
        <label>Human Design type</label>
        ${chipGrid("hdType", HD_TYPES, [d.hdType].filter(Boolean))}
      </div>
      <div class="form-group">
        <label for="hdAuthority">Authority</label>
        <select id="hdAuthority" name="hdAuthority">
          <option value="">Select…</option>
          ${HD_AUTHORITIES.map((a) => `<option value="${a}"${d.hdAuthority === a ? " selected" : ""}>${a}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label for="hdProfile">Profile line</label>
        <select id="hdProfile" name="hdProfile">
          <option value="">Select…</option>
          ${HD_PROFILES.map((pr) => `<option value="${pr}"${d.hdProfile === pr ? " selected" : ""}>${pr}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Chinese zodiac ${autoChinese ? `(suggested: ${getChineseById(autoChinese)?.name})` : ""}</label>
        ${chipGrid("chineseAnimal", CHINESE_ZODIAC, [d.chineseAnimal || autoChinese].filter(Boolean), "id", (c) => `${c.emoji} ${c.name}`)}
      </div>
      <div class="form-group">
        <label>Chinese element ${autoElement ? `(suggested: ${autoElement})` : ""}</label>
        ${chipGrid("chineseElement", CHINESE_ELEMENTS, [d.chineseElement || autoElement].filter(Boolean))}
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
  if (wizardStep === 1) bindChartCalculator();
  document.getElementById("wizard-back")?.addEventListener("click", () => {
    collectWizardForm();
    wizardStep--;
    renderCreate();
  });
  document.getElementById("wizard-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    collectWizardForm();
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
    wizardDraft.zodiac = getChipValues("zodiac")[0] || wizardDraft.zodiac;
    wizardDraft.hdType = getChipValues("hdType")[0] || wizardDraft.hdType;
    wizardDraft.chineseAnimal = getChipValues("chineseAnimal")[0] || wizardDraft.chineseAnimal;
    wizardDraft.chineseElement = getChipValues("chineseElement")[0] || wizardDraft.chineseElement;
    const cosmic = deriveCosmicFromBirthDate(wizardDraft.birthDate);
    wizardDraft.zodiac = wizardDraft.zodiac || cosmic.zodiac;
    wizardDraft.chineseAnimal = wizardDraft.chineseAnimal || cosmic.chineseAnimal;
    wizardDraft.chineseElement = wizardDraft.chineseElement || cosmic.chineseElement;
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
    if (!d.birthPlace && (d.birthLatitude == null || d.birthLongitude == null)) {
      if (status) status.textContent = "Enter birth place (city) for Rising sign.";
      return;
    }
    btn.disabled = true;
    if (status) status.textContent = "Calculating chart…";
    try {
      const chart = await fetchNatalChart({
        birthDate: d.birthDate,
        birthTime: d.birthTime || "12:00",
        birthPlace: d.birthPlace,
        latitude: d.birthLatitude ? Number(d.birthLatitude) : undefined,
        longitude: d.birthLongitude ? Number(d.birthLongitude) : undefined,
        utcOffsetMinutes: d.utcOffsetMinutes ? Number(d.utcOffsetMinutes) : undefined,
      });
      wizardDraft = applyNatalChart(wizardDraft, chart);
      wizardDraft.zodiac = chart.sunSign || wizardDraft.zodiac;
      const parts = [
        chart.sunSign && `☉ ${getZodiacById(chart.sunSign)?.name}`,
        chart.moonSign && `☽ ${getZodiacById(chart.moonSign)?.name}`,
        chart.risingSign && `↑ ${getZodiacById(chart.risingSign)?.name}`,
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
  const profile = {
    id: existing?.id || createProfileId(),
    name: d.name,
    age: parseInt(d.age, 10),
    location: d.location,
    bio: d.bio,
    gender: d.gender,
    avatar: d.avatar || "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
    lookingFor: d.lookingFor || [],
    interests: d.interests || [],
    birthDate: d.birthDate,
    birthTime: d.birthTime,
    birthPlace: d.birthPlace,
    birthLatitude: d.birthLatitude != null && d.birthLatitude !== "" ? Number(d.birthLatitude) : undefined,
    birthLongitude: d.birthLongitude != null && d.birthLongitude !== "" ? Number(d.birthLongitude) : undefined,
    utcOffsetMinutes: d.utcOffsetMinutes != null && d.utcOffsetMinutes !== "" ? Number(d.utcOffsetMinutes) : undefined,
    sunSign: d.sunSign || d.zodiac,
    moonSign: d.moonSign,
    risingSign: d.risingSign,
    zodiac: d.zodiac || d.sunSign,
    hdType: d.hdType,
    hdAuthority: d.hdAuthority,
    hdProfile: d.hdProfile,
    chineseAnimal: d.chineseAnimal,
    chineseElement: d.chineseElement,
  };
  saveMyProfile(profile);
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

render();
