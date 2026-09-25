import type { Difficulty, DifficultyConfig, GearId, GearSlot, Suit } from "../state/types";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { hearts: 4, timerScale: 1.2, questions: 8, snackUses: 3, star2: 0.42, star3: 0.66 },
  medium: { hearts: 3, timerScale: 1, questions: 10, snackUses: 2, star2: 0.52, star3: 0.74 },
  hard: { hearts: 2, timerScale: 0.72, questions: 12, snackUses: 1, star2: 0.6, star3: 0.82 },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

export const SUITS: Array<{ id: Suit; name: string; description: string; cost: number }> = [
  { id: "classic", name: "החליפה הקלאסית", description: "אדום וכחול, קורים לבנים", cost: 0 },
  { id: "future", name: "ספיידר העתיד", description: "ניאון כחול ושריון קל", cost: 350 },
  { id: "stealth", name: "חליפת הצל", description: "שחור וסגול למשימות חשאיות", cost: 500 },
  { id: "venom", name: "חליפת ונום", description: "סימביוט שחור, עיניים לבנות וקנוקנות", cost: 0 },
];

export interface GearItem {
  id: GearId;
  slot: GearSlot;
  name: string;
  description: string;
  glyph: string;
  cost: number;
  rarity: "starter" | "rare" | "epic";
}

export const GEAR: GearItem[] = [
  { id: "spider-visor", slot: "head", name: "משקף עכביש", description: "עדשות ניאון שמזהות סכנה.", glyph: "🥽", cost: 650, rarity: "starter" },
  { id: "shadow-hood", slot: "head", name: "ברדס הצל", description: "ברדס חשאי עם קווי סימביוט.", glyph: "🥷", cost: 1450, rarity: "rare" },
  { id: "spider-sense-crown", slot: "head", name: "כתר חוש העכביש", description: "מחושי אנרגיה רוטטים כשסכנה מתקרבת.", glyph: "📡", cost: 1850, rarity: "rare" },
  { id: "noir-goggles", slot: "head", name: "משקפי בלש הלילה", description: "עדשות עגולות בסגנון גיבורי הצללים.", glyph: "🕶️", cost: 2350, rarity: "epic" },
  { id: "multiverse-headphones", slot: "head", name: "אוזניות רב־יקום", description: "מוזיקה, תקשורת והבזקי צבע בין ממדים.", glyph: "🎧", cost: 2750, rarity: "epic" },
  { id: "hero-emblem", slot: "chest", name: "סמל גיבור זוהר", description: "סמל חזה שפועם בכל תשובה נכונה.", glyph: "🕷️", cost: 850, rarity: "starter" },
  { id: "nano-armor", slot: "chest", name: "שריון ננו", description: "לוחות שריון עתידניים לגוף.", glyph: "🛡️", cost: 1900, rarity: "rare" },
  { id: "web-cape", slot: "chest", name: "גלימת קורים קלאסית", description: "גלימה קצרה עם דוגמת קורים כסופה.", glyph: "🦸", cost: 1550, rarity: "rare" },
  { id: "symbiote-crest", slot: "chest", name: "סמל סימביוט חי", description: "סמל לבן שמשנה צורה ונושם עם החליפה.", glyph: "🖤", cost: 2900, rarity: "epic" },
  { id: "dimension-jacket", slot: "chest", name: "מעיל קפיצת ממדים", description: "מעיל רחוב צבעוני עם תפרי ניאון.", glyph: "🧥", cost: 2500, rarity: "epic" },
  { id: "web-blasters", slot: "wrists", name: "יורי קורים כפולים", description: "זוג משגרים משודרגים לפרקי היד.", glyph: "🕸️", cost: 1200, rarity: "rare" },
  { id: "holo-gauntlets", slot: "wrists", name: "כפפות הולוגרמה", description: "כפפות אנרגיה כחולות עם הבזק.", glyph: "💠", cost: 2200, rarity: "epic" },
  { id: "electric-cuffs", slot: "wrists", name: "צמידי ברק", description: "טבעות חשמל צהובות שמבזיקות בתנועה.", glyph: "⚡", cost: 1750, rarity: "rare" },
  { id: "impact-gauntlets", slot: "wrists", name: "כפפות הדף", description: "כפפות כבדות לקרבות מול נבלים משוריינים.", glyph: "🥊", cost: 2650, rarity: "epic" },
  { id: "camouflage-cuffs", slot: "wrists", name: "צמידי הסוואה", description: "שוברים את האור סביב הידיים באפקט גליץ׳.", glyph: "🫥", cost: 3050, rarity: "epic" },
  { id: "web-wings", slot: "back", name: "כנפי קורים", description: "כנפי גלישה שקופות מעל העיר.", glyph: "🪽", cost: 1750, rarity: "rare" },
  { id: "bionic-arms", slot: "back", name: "זרועות ביוניות", description: "ארבע זרועות מכניות חכמות שיוצאות מהגב.", glyph: "🦾", cost: 3200, rarity: "epic" },
  { id: "spider-drone-pack", slot: "back", name: "תרמיל רחפני עכביש", description: "שני רחפנים זעירים ששומרים על הגיבור.", glyph: "🛸", cost: 2400, rarity: "rare" },
  { id: "glider-cloak", slot: "back", name: "גלימת דאייה", description: "כנפי בד כהות שנפתחות בקפיצה מגג.", glyph: "🦇", cost: 2850, rarity: "epic" },
  { id: "portal-pack", slot: "back", name: "תרמיל שערים", description: "טבעת ממדית מסתובבת מאחורי הגב.", glyph: "🌀", cost: 3600, rarity: "epic" },
];

export type SnackEffect = "time" | "heart" | "hint" | "freeze" | "skip";

export const SNACKS: Array<{
  id: string;
  name: string;
  glyph: string;
  effect: SnackEffect;
  description: string;
}> = [
  { id: "banana", name: "בננה", glyph: "🍌", effect: "time", description: "עוד 8 שניות" },
  { id: "chocolate", name: "שוקולד", glyph: "🍫", effect: "heart", description: "מחזיר לב" },
  { id: "cookie", name: "עוגייה", glyph: "🍪", effect: "hint", description: "מגלה ספרה" },
  { id: "pretzel", name: "בייגלה", glyph: "🥨", effect: "freeze", description: "עוצר זמן ל־4 שניות" },
  { id: "candy", name: "סוכרייה", glyph: "🍬", effect: "skip", description: "מדלגת בלי כוכב" },
];
