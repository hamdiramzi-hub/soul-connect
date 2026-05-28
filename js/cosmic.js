import { ZODIAC_SIGNS, CHINESE_ZODIAC, CHINESE_ELEMENTS } from "./data.js";
import { blendedChartScore, zodiacPairBlurb, fullCompatibilityScore } from "./compatibility-matrix.js";
import { chineseYearForBirthDate } from "./lunar-years.js";

const CHINESE_ANIMALS_ORDER = CHINESE_ZODIAC.map((c) => c.id);

/** Western zodiac from YYYY-MM-DD */
export function zodiacFromBirthDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const md = m * 100 + d;
  if (md >= 321 && md <= 419) return "aries";
  if (md >= 420 && md <= 520) return "taurus";
  if (md >= 521 && md <= 620) return "gemini";
  if (md >= 621 && md <= 722) return "cancer";
  if (md >= 723 && md <= 822) return "leo";
  if (md >= 823 && md <= 922) return "virgo";
  if (md >= 923 && md <= 1022) return "libra";
  if (md >= 1023 && md <= 1121) return "scorpio";
  if (md >= 1122 && md <= 1221) return "sagittarius";
  if (md >= 1222 || md <= 119) return "capricorn";
  if (md >= 120 && md <= 218) return "aquarius";
  return "pisces";
}

/** Chinese zodiac animal from Gregorian birth date (Lunar New Year boundaries). */
export function chineseAnimalFromBirthDate(dateStr) {
  const year = chineseYearForBirthDate(dateStr);
  if (year == null) return null;
  const idx = ((year - 4) % 12 + 12) % 12;
  return CHINESE_ANIMALS_ORDER[idx];
}

export function chineseAnimalFromYear(year) {
  const idx = ((year - 4) % 12 + 12) % 12;
  return CHINESE_ANIMALS_ORDER[idx];
}

/** Five elements cycle for birth year */
export function chineseElementFromYear(year) {
  const idx = Math.floor(((year - 4) % 10) / 2);
  return CHINESE_ELEMENTS[idx];
}

export function deriveCosmicFromBirthDate(dateStr) {
  if (!dateStr) return { zodiac: null, chineseAnimal: null, chineseElement: null };
  const lunarYear = chineseYearForBirthDate(dateStr);
  return {
    zodiac: zodiacFromBirthDate(dateStr),
    chineseAnimal: chineseAnimalFromBirthDate(dateStr),
    chineseElement: chineseElementFromYear(lunarYear),
  };
}

/** Merge API natal chart into profile fields */
export function applyNatalChart(profile, chart) {
  if (!chart) return profile;
  return {
    ...profile,
    zodiac: chart.sunSign || profile.zodiac,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
    birthLatitude: chart.latitude ?? profile.birthLatitude,
    birthLongitude: chart.longitude ?? profile.birthLongitude,
    utcOffsetMinutes: chart.utcOffsetMinutes ?? profile.utcOffsetMinutes,
  };
}

/** Compatibility 0–100: scraped sun/moon/rising matrix + Chinese trine/clash + HD + prefs */
export function compatibilityScore(viewer, profile, prefs) {
  if (!viewer || !profile) return 0;

  const { score: base } = fullCompatibilityScore(viewer, profile);
  let score = base;

  if (viewer.hdType && profile.hdType) {
    if (viewer.hdType === profile.hdType) score += 5;
    else if (
      (viewer.hdType === "generator" || viewer.hdType === "mg") &&
      (profile.hdType === "generator" || profile.hdType === "mg")
    ) score += 8;
    else if (viewer.hdType === "projector" && profile.hdType === "projector") score += 4;
    else score += 2;
  }

  if (prefs?.zodiac?.length && prefs.zodiac.includes(profile.zodiac)) score += 8;
  if (prefs?.hdType?.length && prefs.hdType.includes(profile.hdType)) score += 8;
  if (prefs?.chinese?.length && prefs.chinese.includes(profile.chineseAnimal)) score += 8;

  return Math.min(100, Math.round(score));
}

export function compatibilityBreakdown(viewer, profile) {
  return fullCompatibilityScore(viewer, profile);
}

export function compatibilityInsight(viewer, profile) {
  if (!viewer?.zodiac || !profile?.zodiac) return "";
  const sunA = viewer.sunSign || viewer.zodiac;
  const sunB = profile.sunSign || profile.zodiac;
  let text = zodiacPairBlurb(sunA, sunB);
  if (viewer.moonSign && profile.moonSign) {
    const moonScore = blendedChartScore(
      { moonSign: viewer.moonSign },
      { moonSign: profile.moonSign }
    ).score;
    if (moonScore >= 80) text += " Emotional rhythms (Moon) align closely.";
    else if (moonScore < 60) text += " Moon signs differ—honor each other's inner needs.";
  }
  return text;
}

export function matchesFilters(profile, filters) {
  if (!filters) return true;
  if (filters.zodiac?.length && !filters.zodiac.includes(profile.zodiac)) return false;
  if (filters.hdType?.length && !filters.hdType.includes(profile.hdType)) return false;
  if (filters.chinese?.length && !filters.chinese.includes(profile.chineseAnimal)) return false;
  if (filters.element?.length && !filters.element.includes(profile.chineseElement)) return false;
  return true;
}
