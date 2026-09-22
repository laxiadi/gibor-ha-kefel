import type { Difficulty, DifficultyConfig, Suit } from "../state/types";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { hearts: 4, timerScale: 1.35, questions: 8, snackUses: 3, star2: 0.42, star3: 0.66 },
  medium: { hearts: 3, timerScale: 1, questions: 10, snackUses: 2, star2: 0.52, star3: 0.74 },
  hard: { hearts: 2, timerScale: 0.8, questions: 12, snackUses: 1, star2: 0.6, star3: 0.82 },
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
