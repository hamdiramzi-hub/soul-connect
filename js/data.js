export const ZODIAC_SIGNS = [
  { id: "aries", name: "Aries", symbol: "♈", element: "Fire", dates: "Mar 21 – Apr 19" },
  { id: "taurus", name: "Taurus", symbol: "♉", element: "Earth", dates: "Apr 20 – May 20" },
  { id: "gemini", name: "Gemini", symbol: "♊", element: "Air", dates: "May 21 – Jun 20" },
  { id: "cancer", name: "Cancer", symbol: "♋", element: "Water", dates: "Jun 21 – Jul 22" },
  { id: "leo", name: "Leo", symbol: "♌", element: "Fire", dates: "Jul 23 – Aug 22" },
  { id: "virgo", name: "Virgo", symbol: "♍", element: "Earth", dates: "Aug 23 – Sep 22" },
  { id: "libra", name: "Libra", symbol: "♎", element: "Air", dates: "Sep 23 – Oct 22" },
  { id: "scorpio", name: "Scorpio", symbol: "♏", element: "Water", dates: "Oct 23 – Nov 21" },
  { id: "sagittarius", name: "Sagittarius", symbol: "♐", element: "Fire", dates: "Nov 22 – Dec 21" },
  { id: "capricorn", name: "Capricorn", symbol: "♑", element: "Earth", dates: "Dec 22 – Jan 19" },
  { id: "aquarius", name: "Aquarius", symbol: "♒", element: "Air", dates: "Jan 20 – Feb 18" },
  { id: "pisces", name: "Pisces", symbol: "♓", element: "Water", dates: "Feb 19 – Mar 20" },
];

export const HD_TYPES = [
  { id: "manifestor", name: "Manifestor", strategy: "To Inform", theme: "Peace" },
  { id: "generator", name: "Generator", strategy: "To Respond", theme: "Satisfaction" },
  { id: "mg", name: "Manifesting Generator", strategy: "To Respond", theme: "Satisfaction" },
  { id: "projector", name: "Projector", strategy: "Wait for Invitation", theme: "Success" },
  { id: "reflector", name: "Reflector", strategy: "Wait a Lunar Cycle", theme: "Surprise" },
];

export const HD_AUTHORITIES = [
  "Emotional", "Sacral", "Splenic", "Ego Manifested", "Ego Projected",
  "Self-Projected", "Mental", "Lunar", "None",
];

export const HD_PROFILES = [
  "1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3",
];

export const CHINESE_ZODIAC = [
  { id: "rat", name: "Rat", emoji: "🐀", traits: "Clever, resourceful" },
  { id: "ox", name: "Ox", emoji: "🐂", traits: "Steady, dependable" },
  { id: "tiger", name: "Tiger", emoji: "🐅", traits: "Brave, passionate" },
  { id: "rabbit", name: "Rabbit", emoji: "🐇", traits: "Gentle, diplomatic" },
  { id: "dragon", name: "Dragon", emoji: "🐉", traits: "Charismatic, bold" },
  { id: "snake", name: "Snake", emoji: "🐍", traits: "Wise, intuitive" },
  { id: "horse", name: "Horse", emoji: "🐎", traits: "Energetic, free-spirited" },
  { id: "goat", name: "Goat", emoji: "🐐", traits: "Creative, empathetic" },
  { id: "monkey", name: "Monkey", emoji: "🐒", traits: "Playful, inventive" },
  { id: "rooster", name: "Rooster", emoji: "🐓", traits: "Honest, observant" },
  { id: "dog", name: "Dog", emoji: "🐕", traits: "Loyal, sincere" },
  { id: "pig", name: "Pig", emoji: "🐖", traits: "Generous, warm-hearted" },
];

export const CHINESE_ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];

export const LOOKING_FOR = ["Friendship", "Dating", "Long-term", "Marriage", "Exploring"];
export const GENDERS = ["Woman", "Man", "Non-binary", "Other"];
export const INTERESTS = [
  "Astrology", "Human Design", "Meditation", "Travel", "Art", "Music",
  "Yoga", "Cooking", "Nature", "Philosophy", "Dance", "Reading",
];

export const DEMO_PROFILES = [
  {
    id: "demo-1",
    name: "Luna Rivera",
    age: 28,
    location: "Portland, OR",
    bio: "Projector seeking depth over small talk. Night walks and tarot on Sundays.",
    gender: "Woman",
    lookingFor: ["Long-term", "Dating"],
    interests: ["Astrology", "Human Design", "Meditation"],
    birthDate: "1997-11-08",
    zodiac: "scorpio",
    hdType: "projector",
    hdAuthority: "Emotional",
    hdProfile: "4/6",
    chineseAnimal: "ox",
    chineseElement: "Fire",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  },
  {
    id: "demo-2",
    name: "Kai Mendez",
    age: 31,
    location: "Austin, TX",
    bio: "Manifesting Generator who loves live music and spontaneous road trips.",
    gender: "Man",
    lookingFor: ["Dating", "Exploring"],
    interests: ["Music", "Travel", "Yoga"],
    birthDate: "1994-07-15",
    zodiac: "cancer",
    hdType: "mg",
    hdAuthority: "Sacral",
    hdProfile: "3/5",
    chineseAnimal: "dog",
    chineseElement: "Wood",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  },
  {
    id: "demo-3",
    name: "Sage Chen",
    age: 26,
    location: "San Francisco, CA",
    bio: "Reflector soaking up the city. Into galleries, tea houses, and lunar rituals.",
    gender: "Non-binary",
    lookingFor: ["Friendship", "Dating"],
    interests: ["Art", "Astrology", "Philosophy"],
    birthDate: "1999-02-03",
    zodiac: "aquarius",
    hdType: "reflector",
    hdAuthority: "Lunar",
    hdProfile: "6/2",
    chineseAnimal: "rabbit",
    chineseElement: "Earth",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
  },
  {
    id: "demo-4",
    name: "Amara Okonkwo",
    age: 33,
    location: "Brooklyn, NY",
    bio: "Generator building community gardens. Seeking someone who values growth.",
    gender: "Woman",
    lookingFor: ["Long-term", "Marriage"],
    interests: ["Nature", "Cooking", "Human Design"],
    birthDate: "1992-04-22",
    zodiac: "taurus",
    hdType: "generator",
    hdAuthority: "Sacral",
    hdProfile: "2/4",
    chineseAnimal: "monkey",
    chineseElement: "Water",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
  },
  {
    id: "demo-5",
    name: "River Ashford",
    age: 29,
    location: "Denver, CO",
    bio: "Manifestor with a calm center. Climbing, stargazing, and deep conversations.",
    gender: "Man",
    lookingFor: ["Dating", "Long-term"],
    interests: ["Nature", "Astrology", "Travel"],
    birthDate: "1996-12-01",
    zodiac: "sagittarius",
    hdType: "manifestor",
    hdAuthority: "Splenic",
    hdProfile: "5/1",
    chineseAnimal: "rat",
    chineseElement: "Fire",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
  {
    id: "demo-6",
    name: "Mira Patel",
    age: 27,
    location: "Chicago, IL",
    bio: "Pisces dreamer and 1/4 profile. Poetry nights and cozy bookstores.",
    gender: "Woman",
    lookingFor: ["Dating", "Exploring"],
    interests: ["Reading", "Art", "Meditation"],
    birthDate: "1998-03-12",
    zodiac: "pisces",
    hdType: "projector",
    hdAuthority: "Self-Projected",
    hdProfile: "1/4",
    chineseAnimal: "tiger",
    chineseElement: "Earth",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
  },
];

export function getZodiacById(id) {
  return ZODIAC_SIGNS.find((z) => z.id === id);
}

export function getHdTypeById(id) {
  return HD_TYPES.find((t) => t.id === id);
}

export function getChineseById(id) {
  return CHINESE_ZODIAC.find((c) => c.id === id);
}
