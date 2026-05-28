import { ZODIAC_SIGNS } from "./data.js";
import {
  scrapedZodiacScore,
  scrapedZodiacBlurb,
  chinesePairScore,
  topWesternMatches,
  topChineseMatches,
} from "./compatibility-data.js";

export { topWesternMatches, topChineseMatches };

/** Western sign pair score — scraped matrix first, else 50 */
export function zodiacPairScore(signA, signB) {
  if (!signA || !signB) return 50;
  const scraped = scrapedZodiacScore(signA, signB);
  if (scraped != null) return scraped;
  return 50;
}

export function zodiacPairBlurb(signA, signB) {
  const scraped = scrapedZodiacBlurb(signA, signB);
  if (scraped) return scraped;
  const score = zodiacPairScore(signA, signB);
  const a = ZODIAC_SIGNS.find((z) => z.id === signA)?.name || signA;
  const b = ZODIAC_SIGNS.find((z) => z.id === signB)?.name || signB;
  if (score >= 75) return `${a} and ${b}: strong harmony (${score}%).`;
  if (score >= 60) return `${a} and ${b}: good potential (${score}%).`;
  if (score >= 45) return `${a} and ${b}: moderate — growth through difference (${score}%).`;
  return `${a} and ${b}: challenging but transformative (${score}%).`;
}

/** Blend sun, moon, rising using scraped scores per layer */
export function blendedChartScore(a, b) {
  const parts = [
    { sign: a.sunSign || a.zodiac, other: b.sunSign || b.zodiac, weight: 0.45, label: "Sun" },
    { sign: a.moonSign, other: b.moonSign, weight: 0.35, label: "Moon" },
    { sign: a.risingSign, other: b.risingSign, weight: 0.2, label: "Rising" },
  ];

  let totalW = 0;
  let sum = 0;
  const breakdown = [];

  for (const p of parts) {
    if (!p.sign || !p.other) continue;
    const s = zodiacPairScore(p.sign, p.other);
    sum += s * p.weight;
    totalW += p.weight;
    breakdown.push({ layer: p.label, score: s, yours: p.sign, theirs: p.other });
  }

  if (!totalW) {
    const fallback = zodiacPairScore(a.zodiac, b.zodiac);
    return { score: fallback, breakdown: [{ layer: "Sun", score: fallback, yours: a.zodiac, theirs: b.zodiac }] };
  }

  return { score: Math.round(sum / totalW), breakdown };
}

/** Full profile compatibility using scraped western + Chinese */
export function fullCompatibilityScore(viewer, profile) {
  const western = blendedChartScore(
    {
      zodiac: viewer.zodiac,
      sunSign: viewer.sunSign || viewer.zodiac,
      moonSign: viewer.moonSign,
      risingSign: viewer.risingSign,
    },
    {
      zodiac: profile.zodiac,
      sunSign: profile.sunSign || profile.zodiac,
      moonSign: profile.moonSign,
      risingSign: profile.risingSign,
    }
  );

  const chinese =
    chinesePairScore(viewer.chineseAnimal, profile.chineseAnimal) ?? 65;

  const score = Math.round(western.score * 0.75 + chinese * 0.25);
  return { score, western, chinese, breakdown: western.breakdown };
}
