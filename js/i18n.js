const STORAGE_KEY = "cosmicdating_language";

export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
];

const TEXT = {
  de: {
    "Cosmic Dating — Dating aligned with your cosmic self": "Cosmic Dating — Dating im Einklang mit deinem kosmischen Selbst",
    "Find connection through stars, design, and ancient wisdom.": "Finde Verbindung durch Sterne, Design und alte Weisheit.",
    "Home": "Start",
    "Language": "Sprache",
    "Discover": "Entdecken",
    "My profile": "Mein Profil",
    "Create profile": "Profil erstellen",
    "Match prefs": "Match-Wünsche",
    "Sign matches": "Zeichen-Matches",
    "Cosmic dating": "Kosmisches Dating",
    "Connect soul to soul": "Verbinde Seele mit Seele",
    "Build a profile rich with zodiac, Human Design, and Chinese year wisdom—then discover people who resonate with your cosmic preferences.": "Erstelle ein Profil mit Sternzeichen, Human Design und chinesischem Jahreswissen – und entdecke Menschen, die mit deinen kosmischen Vorlieben resonieren.",
    "Discover souls": "Seelen entdecken",
    "Set match preferences": "Match-Wünsche festlegen",
    "Birth chart": "Geburtshoroskop",
    "♈ Birth chart": "♈ Geburtshoroskop",
    "Sun, Moon, and Rising from your birth date, time, and place—like major astrology sites calculate.": "Sonne, Mond und Aszendent aus Geburtsdatum, Uhrzeit und Ort – wie bei großen Astrologie-Seiten.",
    "Human Design": "Human Design",
    "◇ Human Design": "◇ Human Design",
    "Type, authority, and profile reveal how you're built to connect and decide.": "Typ, Autorität und Profil zeigen, wie du Verbindung aufbaust und Entscheidungen triffst.",
    "Chinese year": "Chinesisches Jahr",
    "🐉 Chinese year": "🐉 Chinesisches Jahr",
    "Animal and element from your birth year add another layer of compatibility.": "Tier und Element deines Geburtsjahres ergänzen eine weitere Ebene der Kompatibilität.",
    "Discover souls": "Seelen entdecken",
    "Create your profile": "Erstelle dein Profil",
    "Display name": "Anzeigename",
    "Age": "Alter",
    "Location": "Ort",
    "Gender": "Geschlecht",
    "About you": "Über dich",
    "Photo URL": "Foto-URL",
    "Looking for": "Ich suche",
    "Interests": "Interessen",
    "Back": "Zurück",
    "Continue": "Weiter",
    "Save profile": "Profil speichern",
    "Birth date": "Geburtsdatum",
    "Birth time": "Geburtszeit",
    "Needed for Moon & Rising": "Benötigt für Mond und Aszendent",
    "Birth place": "Geburtsort",
    "Calculate chart from date, time & place": "Horoskop aus Datum, Zeit und Ort berechnen",
    "Human Design type": "Human-Design-Typ",
    "Authority": "Autorität",
    "Profile line": "Profil-Linie",
    "Preferred zodiac signs": "Bevorzugte Sternzeichen",
    "Preferred Human Design types": "Bevorzugte Human-Design-Typen",
    "Preferred Chinese animals": "Bevorzugte chinesische Tiere",
    "Preferred Chinese elements": "Bevorzugte chinesische Elemente",
    "Match preferences": "Match-Wünsche",
    "Curate who appears in Discover and who scores highest for you.": "Lege fest, wer in Entdecken erscheint und wer am besten zu dir passt.",
    "Save preferences": "Wünsche speichern",
    "Quick filters": "Schnellfilter",
    "Edit preferences": "Wünsche bearbeiten",
    "Western chart": "Westliches Horoskop",
    "Edit profile": "Profil bearbeiten",
  },
  ar: {
    "Cosmic Dating — Dating aligned with your cosmic self": "كوزميك ديتنغ — تعارف متناغم مع ذاتك الكونية",
    "Find connection through stars, design, and ancient wisdom.": "اكتشف التواصل عبر النجوم والتصميم والحكمة القديمة.",
    "Home": "الرئيسية",
    "Language": "اللغة",
    "Discover": "استكشف",
    "My profile": "ملفي",
    "Create profile": "إنشاء ملف",
    "Match prefs": "تفضيلات التوافق",
    "Sign matches": "توافق الأبراج",
    "Cosmic dating": "تعارف كوني",
    "Connect soul to soul": "تواصل من روح إلى روح",
    "Build a profile rich with zodiac, Human Design, and Chinese year wisdom—then discover people who resonate with your cosmic preferences.": "أنشئ ملفًا غنيًا بالأبراج والتصميم البشري وحكمة السنة الصينية، ثم اكتشف أشخاصًا ينسجمون مع تفضيلاتك الكونية.",
    "Discover souls": "استكشف الأرواح",
    "Set match preferences": "اضبط تفضيلات التوافق",
    "Birth chart": "الخريطة الفلكية",
    "♈ Birth chart": "♈ الخريطة الفلكية",
    "Sun, Moon, and Rising from your birth date, time, and place—like major astrology sites calculate.": "الشمس والقمر والطالع من تاريخ ووقت ومكان ميلادك، كما تحسبها مواقع التنجيم الكبرى.",
    "Human Design": "التصميم البشري",
    "◇ Human Design": "◇ التصميم البشري",
    "Type, authority, and profile reveal how you're built to connect and decide.": "النوع والسلطة والملف يكشفون كيف تتواصل وتتخذ قراراتك.",
    "Chinese year": "السنة الصينية",
    "🐉 Chinese year": "🐉 السنة الصينية",
    "Animal and element from your birth year add another layer of compatibility.": "الحيوان والعنصر من سنة ميلادك يضيفان طبقة أخرى للتوافق.",
    "Create your profile": "أنشئ ملفك",
    "Display name": "اسم العرض",
    "Age": "العمر",
    "Location": "الموقع",
    "Gender": "الجنس",
    "About you": "نبذة عنك",
    "Photo URL": "رابط الصورة",
    "Looking for": "أبحث عن",
    "Interests": "الاهتمامات",
    "Back": "رجوع",
    "Continue": "متابعة",
    "Save profile": "حفظ الملف",
    "Birth date": "تاريخ الميلاد",
    "Birth time": "وقت الميلاد",
    "Needed for Moon & Rising": "مطلوب لحساب القمر والطالع",
    "Birth place": "مكان الميلاد",
    "Calculate chart from date, time & place": "احسب الخريطة من التاريخ والوقت والمكان",
    "Human Design type": "نوع التصميم البشري",
    "Authority": "السلطة",
    "Profile line": "خط الملف",
    "Preferred zodiac signs": "الأبراج المفضلة",
    "Preferred Human Design types": "أنواع التصميم البشري المفضلة",
    "Preferred Chinese animals": "الحيوانات الصينية المفضلة",
    "Preferred Chinese elements": "العناصر الصينية المفضلة",
    "Match preferences": "تفضيلات التوافق",
    "Curate who appears in Discover and who scores highest for you.": "حدد من يظهر في الاستكشاف ومن يحصل على أعلى توافق معك.",
    "Save preferences": "حفظ التفضيلات",
    "Quick filters": "فلاتر سريعة",
    "Edit preferences": "تعديل التفضيلات",
    "Western chart": "الخريطة الغربية",
    "Edit profile": "تعديل الملف",
  },
  it: {
    "Cosmic Dating — Dating aligned with your cosmic self": "Cosmic Dating — Incontri allineati al tuo sé cosmico",
    "Find connection through stars, design, and ancient wisdom.": "Trova connessione attraverso stelle, design e saggezza antica.",
    "Home": "Home",
    "Language": "Lingua",
    "Discover": "Scopri",
    "My profile": "Il mio profilo",
    "Create profile": "Crea profilo",
    "Match prefs": "Preferenze",
    "Sign matches": "Affinità segni",
    "Cosmic dating": "Dating cosmico",
    "Connect soul to soul": "Connetti anima ad anima",
    "Build a profile rich with zodiac, Human Design, and Chinese year wisdom—then discover people who resonate with your cosmic preferences.": "Crea un profilo ricco di zodiaco, Human Design e saggezza dell'anno cinese, poi scopri persone in sintonia con le tue preferenze cosmiche.",
    "Discover souls": "Scopri anime",
    "Set match preferences": "Imposta preferenze",
    "Birth chart": "Tema natale",
    "♈ Birth chart": "♈ Tema natale",
    "Sun, Moon, and Rising from your birth date, time, and place—like major astrology sites calculate.": "Sole, Luna e Ascendente da data, ora e luogo di nascita, come nei principali siti di astrologia.",
    "Human Design": "Human Design",
    "◇ Human Design": "◇ Human Design",
    "Type, authority, and profile reveal how you're built to connect and decide.": "Tipo, autorità e profilo rivelano come sei fatto per connetterti e decidere.",
    "Chinese year": "Anno cinese",
    "🐉 Chinese year": "🐉 Anno cinese",
    "Animal and element from your birth year add another layer of compatibility.": "Animale ed elemento del tuo anno di nascita aggiungono un altro livello di compatibilità.",
    "Create your profile": "Crea il tuo profilo",
    "Display name": "Nome visualizzato",
    "Age": "Età",
    "Location": "Località",
    "Gender": "Genere",
    "About you": "Su di te",
    "Photo URL": "URL foto",
    "Looking for": "Cerco",
    "Interests": "Interessi",
    "Back": "Indietro",
    "Continue": "Continua",
    "Save profile": "Salva profilo",
    "Birth date": "Data di nascita",
    "Birth time": "Ora di nascita",
    "Needed for Moon & Rising": "Necessario per Luna e Ascendente",
    "Birth place": "Luogo di nascita",
    "Calculate chart from date, time & place": "Calcola il tema da data, ora e luogo",
    "Human Design type": "Tipo Human Design",
    "Authority": "Autorità",
    "Profile line": "Linea profilo",
    "Preferred zodiac signs": "Segni zodiacali preferiti",
    "Preferred Human Design types": "Tipi Human Design preferiti",
    "Preferred Chinese animals": "Animali cinesi preferiti",
    "Preferred Chinese elements": "Elementi cinesi preferiti",
    "Match preferences": "Preferenze match",
    "Curate who appears in Discover and who scores highest for you.": "Scegli chi appare in Scopri e chi ottiene il punteggio più alto per te.",
    "Save preferences": "Salva preferenze",
    "Quick filters": "Filtri rapidi",
    "Edit preferences": "Modifica preferenze",
    "Western chart": "Tema occidentale",
    "Edit profile": "Modifica profilo",
  },
  es: {
    "Cosmic Dating — Dating aligned with your cosmic self": "Cosmic Dating — Citas alineadas con tu yo cósmico",
    "Find connection through stars, design, and ancient wisdom.": "Encuentra conexión a través de las estrellas, el diseño y la sabiduría antigua.",
    "Home": "Inicio",
    "Language": "Idioma",
    "Discover": "Descubrir",
    "My profile": "Mi perfil",
    "Create profile": "Crear perfil",
    "Match prefs": "Preferencias",
    "Sign matches": "Afinidad de signos",
    "Cosmic dating": "Citas cósmicas",
    "Connect soul to soul": "Conecta alma con alma",
    "Build a profile rich with zodiac, Human Design, and Chinese year wisdom—then discover people who resonate with your cosmic preferences.": "Crea un perfil con zodiaco, Diseño Humano y sabiduría del año chino; luego descubre personas que resuenan con tus preferencias cósmicas.",
    "Discover souls": "Descubrir almas",
    "Set match preferences": "Definir preferencias",
    "Birth chart": "Carta natal",
    "♈ Birth chart": "♈ Carta natal",
    "Sun, Moon, and Rising from your birth date, time, and place—like major astrology sites calculate.": "Sol, Luna y Ascendente según tu fecha, hora y lugar de nacimiento, como calculan los grandes sitios de astrología.",
    "Human Design": "Diseño Humano",
    "◇ Human Design": "◇ Diseño Humano",
    "Type, authority, and profile reveal how you're built to connect and decide.": "Tipo, autoridad y perfil revelan cómo estás diseñado para conectar y decidir.",
    "Chinese year": "Año chino",
    "🐉 Chinese year": "🐉 Año chino",
    "Animal and element from your birth year add another layer of compatibility.": "El animal y elemento de tu año de nacimiento añaden otra capa de compatibilidad.",
    "Create your profile": "Crea tu perfil",
    "Display name": "Nombre visible",
    "Age": "Edad",
    "Location": "Ubicación",
    "Gender": "Género",
    "About you": "Sobre ti",
    "Photo URL": "URL de foto",
    "Looking for": "Busco",
    "Interests": "Intereses",
    "Back": "Atrás",
    "Continue": "Continuar",
    "Save profile": "Guardar perfil",
    "Birth date": "Fecha de nacimiento",
    "Birth time": "Hora de nacimiento",
    "Needed for Moon & Rising": "Necesario para Luna y Ascendente",
    "Birth place": "Lugar de nacimiento",
    "Calculate chart from date, time & place": "Calcular carta con fecha, hora y lugar",
    "Human Design type": "Tipo de Diseño Humano",
    "Authority": "Autoridad",
    "Profile line": "Línea de perfil",
    "Preferred zodiac signs": "Signos zodiacales preferidos",
    "Preferred Human Design types": "Tipos de Diseño Humano preferidos",
    "Preferred Chinese animals": "Animales chinos preferidos",
    "Preferred Chinese elements": "Elementos chinos preferidos",
    "Match preferences": "Preferencias de match",
    "Curate who appears in Discover and who scores highest for you.": "Elige quién aparece en Descubrir y quién obtiene mayor afinidad contigo.",
    "Save preferences": "Guardar preferencias",
    "Quick filters": "Filtros rápidos",
    "Edit preferences": "Editar preferencias",
    "Western chart": "Carta occidental",
    "Edit profile": "Editar perfil",
  },
};

export function getLanguage() {
  return localStorage.getItem(STORAGE_KEY) || "en";
}

export function setLanguage(language) {
  localStorage.setItem(STORAGE_KEY, language);
}

export function t(text) {
  const language = getLanguage();
  return TEXT[language]?.[text] || text;
}

export function applyLanguage() {
  const language = LANGUAGES.find((item) => item.code === getLanguage()) || LANGUAGES[0];
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.dir;
  document.title = t("Cosmic Dating — Dating aligned with your cosmic self");
  const footerText = document.getElementById("footer-text");
  if (footerText) footerText.textContent = t("Find connection through stars, design, and ancient wisdom.");
  const picker = document.getElementById("language-select");
  if (picker) picker.value = language.code;
}

export function translatePage(root = document.body) {
  const language = getLanguage();
  if (language === "en") return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const trimmed = node.nodeValue.trim();
    if (!trimmed) return;
    const translated = TEXT[language]?.[trimmed];
    if (translated) {
      node.nodeValue = node.nodeValue.replace(trimmed, translated);
    }
  });

  root.querySelectorAll?.("[placeholder], [title], [aria-label]").forEach((el) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && TEXT[language]?.[value]) el.setAttribute(attr, TEXT[language][value]);
    });
  });
}

export function initLanguageSwitcher(onChange) {
  const picker = document.getElementById("language-select");
  if (!picker) return;
  picker.innerHTML = LANGUAGES
    .map((language) => `<option value="${language.code}">${language.label}</option>`)
    .join("");
  picker.value = getLanguage();
  picker.addEventListener("change", () => {
    setLanguage(picker.value);
    onChange();
  });
}
