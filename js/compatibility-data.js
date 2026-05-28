/**
 * Scraped zodiac pair scores (synastrychart.org) + Chinese trine/clash rules.
 */
import raw from "./zodiac-compat-bundle.js";
import { ZODIAC_SIGNS, CHINESE_ZODIAC } from "./data.js";

const { matrix, blurbs, levels, sources } = raw;

const CHINESE_ORDER = CHINESE_ZODIAC.map((c) => c.id);

/** Trine groups (4 allies) — classic Chinese astrology */
const CHINESE_TRINES = [
  ["rat", "dragon", "monkey"],
  ["ox", "snake", "rooster"],
  ["tiger", "horse", "dog"],
  ["rabbit", "goat", "pig"],
];

/** Six clashes (opposing pairs) */
const CHINESE_CLASH = [
  ["rat", "horse"],
  ["ox", "goat"],
  ["tiger", "monkey"],
  ["rabbit", "rooster"],
  ["dragon", "dog"],
  ["snake", "pig"],
];

function inSameTrine(a, b) {
  return CHINESE_TRINES.some((g) => g.includes(a) && g.includes(b));
}

function isClash(a, b) {
  return CHINESE_CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Western sun-sign score from scraped matrix (0–100) */
export function scrapedZodiacScore(signA, signB) {
  if (!signA || !signB) return null;
  const s = matrix[signA]?.[signB] ?? matrix[signB]?.[signA];
  return s != null ? s : null;
}

export function scrapedZodiacBlurb(signA, signB) {
  const key = `${signA}:${signB}`;
  const keyRev = `${signB}:${signA}`;
  return blurbs[key] || blurbs[keyRev] || null;
}

export function scrapedLevel(score) {
  if (score >= levels.excellent) return "excellent";
  if (score >= levels.good) return "good";
  if (score >= levels.moderate) return "moderate";
  return "challenging";
}

/** Chinese animal pair score (traditional trine/clash, 0–100) */
export function chinesePairScore(animalA, animalB) {
  if (!animalA || !animalB) return null;
  if (animalA === animalB) return 82;
  if (inSameTrine(animalA, animalB)) return 88;
  if (isClash(animalA, animalB)) return 38;
  const ia = CHINESE_ORDER.indexOf(animalA);
  const ib = CHINESE_ORDER.indexOf(animalB);
  const diff = Math.abs(ia - ib);
  if (diff === 4 || diff === 8) return 72;
  if (diff === 6) return 52;
  return 65;
}

/** Top western matches for a sign (for recommendations) */
export function topWesternMatches(signId, limit = 5) {
  if (!signId || !matrix[signId]) return [];
  return Object.entries(matrix[signId])
    .filter(([id]) => id !== signId)
    .map(([id, score]) => ({ sign: id, score, name: ZODIAC_SIGNS.find((z) => z.id === id)?.name }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Top Chinese matches */
export function topChineseMatches(animalId, limit = 5) {
  return CHINESE_ORDER.filter((id) => id !== animalId)
    .map((id) => ({ animal: id, score: chinesePairScore(animalId, id), name: CHINESE_ZODIAC.find((c) => c.id === id)?.name }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function compatibilitySources() {
  return sources;
}
