/** Pure-JS natal chart helpers (sun, moon, rising) from UTC birth moment + lat/lon. */

const SIGN_IDS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

export function longitudeToSignId(lonDeg) {
  const n = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(n / 30) % 12;
  return SIGN_IDS[idx];
}

/** Julian day (UT) */
export function julianDayUTC(y, m, d, hour = 0, minute = 0, second = 0) {
  let year = y;
  let month = m;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = (hour + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    d +
    dayFrac +
    B -
    1524.5
  );
}

/** Apparent ecliptic longitude of the Sun (degrees, low-precision Meeus). */
export function sunEclipticLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  let L0 = 280.46646 + 36000.76983 * T;
  L0 = ((L0 % 360) + 360) % 360;
  let M = 357.52911 + 35999.05029 * T;
  M = ((M % 360) + 360) % 360;
  const Mrad = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
    0.019993 * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  return ((L0 + C) % 360 + 360) % 360;
}

/** Geocentric ecliptic longitude of the Moon (degrees, Meeus Ch. 47, ~1° error). */
export function moonEclipticLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    (T * T * T) / 538841 -
    (T * T * T * T) / 65194000;
  const D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T * T +
    (T * T * T) / 545868 -
    (T * T * T * T) / 113065000;
  const M =
    357.5291092 +
    35999.0502909 * T -
    0.0001536 * T * T +
    (T * T * T) / 24490000;
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    (T * T * T) / 69699 -
    (T * T * T * T) / 14712000;
  const F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T * T -
    (T * T * T) / 3526000 +
    (T * T * T * T) / 863310000;

  const torad = (x) => (x * Math.PI) / 180;
  const sum = (...terms) => terms.reduce((a, b) => a + b, 0);

  let lon =
    Lp +
    sum(
      6.289 * Math.sin(torad(Mp)),
      1.274 * Math.sin(torad(2 * D - Mp)),
      0.658 * Math.sin(torad(2 * D)),
      0.214 * Math.sin(torad(2 * Mp)),
      -0.186 * Math.sin(torad(M)),
      -0.114 * Math.sin(torad(2 * F)),
      0.059 * Math.sin(torad(2 * D - 2 * Mp)),
      0.057 * Math.sin(torad(2 * D - M - Mp)),
      0.053 * Math.sin(torad(2 * D + Mp)),
      0.046 * Math.sin(torad(2 * D - M)),
      -0.041 * Math.sin(torad(M - Mp)),
      -0.035 * Math.sin(torad(D)),
      0.03 * Math.sin(torad(Mp))
    );

  return ((lon % 360) + 360) % 360;
}

/** Ascendant ecliptic longitude (degrees). lat/lon in degrees, lon east-positive. */
export function ascendantLongitude(jd, latDeg, lonDeg) {
  const T = (jd - 2451545.0) / 36525;
  const eps = 23.439291 - 0.0130042 * T;
  const epsRad = (eps * Math.PI) / 180;

  let theta =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  theta = ((theta % 360) + 360) % 360;

  const lst = ((theta + lonDeg) % 360 + 360) % 360;
  const lstRad = (lst * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;

  const y = Math.cos(lstRad);
  const x = -(
    Math.sin(latRad) * Math.tan(epsRad) +
    Math.cos(latRad) * Math.sin(lstRad)
  );
  let asc = (Math.atan2(y, x) * 180) / Math.PI;
  return ((asc % 360) + 360) % 360;
}

/**
 * Build natal signs from birth parts.
 * @param {{ year, month, day, hour, minute, utcOffsetMinutes, latitude, longitude }}
 */
export function natalChartFromBirth({
  year,
  month,
  day,
  hour = 12,
  minute = 0,
  utcOffsetMinutes = 0,
  latitude = 0,
  longitude = 0,
}) {
  const utcHour = hour - utcOffsetMinutes / 60;
  let uh = utcHour;
  let ud = day;
  let um = month;
  let uy = year;
  if (uh < 0) {
    uh += 24;
    ud -= 1;
    if (ud < 1) {
      um -= 1;
      if (um < 1) {
        um = 12;
        uy -= 1;
      }
      ud = new Date(Date.UTC(uy, um, 0)).getUTCDate();
    }
  } else if (uh >= 24) {
    uh -= 24;
    ud += 1;
    const dim = new Date(Date.UTC(uy, um, 0)).getUTCDate();
    if (ud > dim) {
      ud = 1;
      um += 1;
      if (um > 12) {
        um = 1;
        uy += 1;
      }
    }
  }

  const jd = julianDayUTC(uy, um, ud, uh, minute);
  const sunLon = sunEclipticLongitude(jd);
  const moonLon = moonEclipticLongitude(jd);
  const ascLon = ascendantLongitude(jd, latitude, longitude);

  return {
    sunSign: longitudeToSignId(sunLon),
    moonSign: longitudeToSignId(moonLon),
    risingSign: longitudeToSignId(ascLon),
    longitudes: { sun: sunLon, moon: moonLon, ascendant: ascLon },
    julianDay: jd,
  };
}

/** Parse YYYY-MM-DD and HH:MM */
export function parseBirthInputs(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  let hour = 12;
  let minute = 0;
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    hour = Number.isFinite(h) ? h : 12;
    minute = Number.isFinite(min) ? min : 0;
  }
  return { year: y, month: m, day: d, hour, minute };
}
