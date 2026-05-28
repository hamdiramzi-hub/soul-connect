import { DEMO_PROFILES } from "./data.js";

const KEYS = {
  profile: "soulconnect_profile",
  prefs: "soulconnect_prefs",
  likes: "soulconnect_likes",
  remoteProfiles: "soulconnect_remote_profiles",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getMyProfile() {
  return read(KEYS.profile, null);
}

export function saveMyProfile(profile) {
  write(KEYS.profile, profile);
}

export async function syncProfilesFromServer() {
  try {
    const res = await fetch("/api/profiles");
    if (!res.ok) return false;
    const data = await res.json();
    write(KEYS.remoteProfiles, data.profiles || []);
    return true;
  } catch {
    return false;
  }
}

export async function saveProfileToServer(profile) {
  try {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) return false;
    await syncProfilesFromServer();
    return true;
  } catch {
    return false;
  }
}

export function getPreferences() {
  return read(KEYS.prefs, { zodiac: [], hdType: [], chinese: [], element: [] });
}

export function savePreferences(prefs) {
  write(KEYS.prefs, prefs);
}

export function getLikes() {
  return read(KEYS.likes, []);
}

export function toggleLike(profileId) {
  const likes = getLikes();
  const idx = likes.indexOf(profileId);
  if (idx >= 0) likes.splice(idx, 1);
  else likes.push(profileId);
  write(KEYS.likes, likes);
  return likes;
}

export function getAllProfiles() {
  const mine = getMyProfile();
  const remoteProfiles = read(KEYS.remoteProfiles, []);
  const byId = new Map();
  [...DEMO_PROFILES, ...remoteProfiles].forEach((profile) => {
    if (profile?.id) byId.set(profile.id, profile);
  });
  if (mine?.id) byId.set(mine.id, mine);
  const list = [...byId.values()];
  return list.filter((p) => p.id !== mine?.id);
}

export function getProfileById(id) {
  const mine = getMyProfile();
  if (mine?.id === id) return mine;
  const remoteProfiles = read(KEYS.remoteProfiles, []);
  return remoteProfiles.find((p) => p.id === id) || DEMO_PROFILES.find((p) => p.id === id) || null;
}

export function createProfileId() {
  return "user-" + Date.now().toString(36);
}
