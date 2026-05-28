import { DEMO_PROFILES } from "./data.js";

const KEYS = {
  profile: "soulconnect_profile",
  prefs: "soulconnect_prefs",
  likes: "soulconnect_likes",
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
  const list = [...DEMO_PROFILES];
  if (mine?.id && !list.some((p) => p.id === mine.id)) {
    list.unshift(mine);
  }
  return list.filter((p) => p.id !== mine?.id);
}

export function getProfileById(id) {
  const mine = getMyProfile();
  if (mine?.id === id) return mine;
  return DEMO_PROFILES.find((p) => p.id === id) || null;
}

export function createProfileId() {
  return "user-" + Date.now().toString(36);
}
