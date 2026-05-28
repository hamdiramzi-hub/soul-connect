/** Client calls to local Cosmic Dating astro API (no third-party scraping from the browser). */

export async function geocodePlace(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not find that location");
  }
  return res.json();
}

export async function fetchNatalChart({ birthDate, birthTime, latitude, longitude, utcOffsetMinutes, birthPlace }) {
  const res = await fetch("/api/natal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthDate,
      birthTime,
      latitude,
      longitude,
      utcOffsetMinutes,
      birthPlace,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Chart calculation failed");
  }
  return res.json();
}
