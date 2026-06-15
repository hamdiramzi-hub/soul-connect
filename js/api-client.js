/** Client calls to local Cosmic Dating astro API (no third-party scraping from the browser). */

export async function geocodePlace(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not find that location");
  }
  return res.json();
}

export async function fetchCountries() {
  const res = await fetch("/api/countries");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not load countries");
  }
  return res.json();
}

export async function fetchCities(country, query = "") {
  const params = new URLSearchParams({ country });
  if (query) params.set("q", query);
  const res = await fetch(`/api/cities?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not load cities");
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

export async function fetchTodayInsights(profile) {
  const params = new URLSearchParams();
  const zodiac = profile.sunSign || profile.zodiac;
  if (zodiac) params.set("zodiac", zodiac);
  if (profile.hdType) params.set("hdType", profile.hdType);
  if (profile.hdAuthority) params.set("hdAuthority", profile.hdAuthority);
  if (profile.hdProfile) params.set("hdProfile", profile.hdProfile);
  if (profile.chineseAnimal) params.set("chineseAnimal", profile.chineseAnimal);
  if (profile.chineseElement) params.set("chineseElement", profile.chineseElement);
  if (profile.birthDate) params.set("birthYear", profile.birthDate.slice(0, 4));

  const res = await fetch(`/api/today?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Today insights failed");
  }
  return res.json();
}
