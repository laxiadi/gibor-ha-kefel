import type { Operation, Stage, Theme, World } from "../state/types";

type StageSeed = [name: string, operation: Operation, tables: number[], questions: number, seconds: number, hearts: number];

function stage(worldId: string, index: number | "Boss", seed: StageSeed, reward: number): Stage {
  const [name, operation, tables, questions, seconds, hearts] = seed;
  return {
    id: `${worldId.toUpperCase()}-${index}`,
    worldId,
    name,
    operation,
    tables,
    questions,
    seconds,
    hearts,
    reward,
    boss: index === "Boss",
  };
}

function world(
  id: string,
  name: string,
  subtitle: string,
  theme: Theme,
  seeds: StageSeed[],
  firstReward: number,
): World {
  return {
    id,
    name,
    subtitle,
    theme,
    stages: seeds.map((seed, i) =>
      stage(id, i === seeds.length - 1 ? "Boss" : i + 1, seed, firstReward + i * 8),
    ),
  };
}

export const WORLDS: World[] = [
  world("w1", "שכונת הקורים", "לוחות 2–5 · התחלה רכה", "webs", [
    ["קפיצה ראשונה", "mul", [2, 5], 8, 14, 4],
    ["גג השלוש", "mul", [3, 4], 9, 12, 3],
    ["סיבוב השכונה", "mul", [2, 3, 4, 5], 10, 11, 3],
    ["בוס: שומר השכונה", "mul", [2, 3, 4, 5], 12, 9, 3],
  ], 25),
  world("w2", "מגדלי המשי", "לוחות 6–8 · עולים גבוה", "towers", [
    ["מדרגות השש", "mul", [5, 6], 9, 12, 3],
    ["מעלית השבע", "mul", [6, 7], 10, 11, 3],
    ["מרפסת השמונה", "mul", [6, 7, 8], 11, 10, 3],
    ["בוס: מגדל השיא", "mul", [4, 5, 6, 7, 8], 14, 8, 2],
  ], 35),
  world("w3", "מבצר הזהב", "לוחות 9–10 · חילוק נפתח", "fortress", [
    ["שער התשע", "mul", [3, 9], 10, 11, 3],
    ["מגדל העשר", "mul", [5, 9, 10], 10, 10, 3],
    ["חפיר החילוק", "div", [2, 3, 4, 5, 9, 10], 11, 12, 3],
    ["בוס: שומר המבצר", "mixed", [6, 7, 8, 9, 10], 14, 9, 2],
  ], 45),
  world("w4", "עיר הסערה", "מעורב ×÷ · לחץ זמן", "storm", [
    ["רוח ראשונה", "mixed", [2, 3, 4, 5, 6], 11, 10, 3],
    ["ברקים", "mixed", [6, 7, 8, 9], 12, 9, 2],
    ["סחרור מלא", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 12, 8, 2],
    ["בוס: מלך הסערה", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 16, 7, 2],
  ], 55),
  world("w5", "מנהרות העכביש", "חילוק עמוק · מתחת לעיר", "caves", [
    ["פתח המנהרה", "div", [2], 10, 13, 4],
    ["מעבר השלוש", "div", [3], 10, 12, 3],
    ["אולם הארבע", "div", [4], 10, 12, 3],
    ["גשר החמש", "div", [5], 11, 11, 3],
    ["סלע השש", "div", [6], 11, 11, 3],
    ["מפל השבע", "div", [7], 11, 10, 3],
    ["בור השמונה", "div", [8], 12, 10, 2],
    ["מערת התשע", "div", [9, 10], 12, 10, 2],
    ["זוגות הפוכים", "mixed", [2, 3, 4, 5, 6, 7, 8, 9, 10], 12, 9, 2],
    ["בוס: מלך המנהרות", "div", [2, 3, 4, 5, 6, 7, 8, 9, 10], 15, 8, 2],
  ], 65),
  world("w6", "מגדלי הניאון", "לוחות 11–12 · מהירות ודיוק", "neon", [
    ["קומה 11", "mul", [11], 10, 12, 3],
    ["קומה 12", "mul", [12], 10, 12, 3],
    ["תאומי האור", "mul", [11, 12], 11, 11, 3],
    ["גשר העשירי", "mixed", [10, 11, 12], 11, 10, 3],
    ["חילוק 11", "div", [11], 11, 12, 3],
    ["חילוק 12", "div", [12], 11, 12, 3],
    ["ערבוב ניאון", "mixed", [11, 12], 12, 9, 2],
    ["ספרינט מגדל", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12, 8, 2],
    ["לפני השיא", "mixed", [6, 7, 8, 9, 10, 11, 12], 13, 8, 2],
    ["בוס: שומר הניאון", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 16, 7, 2],
  ], 80),
  world("w7", "עולם הסימביוט", "העימות האחרון · ונום מחכה", "shadow", [
    ["כניסה לצל", "mixed", [2, 3, 4, 5, 6], 11, 10, 3],
    ["לחץ אפלה", "mixed", [7, 8, 9, 10], 11, 9, 3],
    ["חילוק בלילה", "div", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12, 10, 3],
    ["כפל מהיר", "mul", [11, 12], 12, 8, 2],
    ["מלכודת הפוכים", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12, 8, 2],
    ["מרתון צל", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 14, 8, 2],
    ["דקה אחרונה", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12, 7, 2],
    ["לפני האיחוד", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 13, 7, 2],
    ["התעוררות ונום", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 14, 7, 2],
    ["בוס: ונום", "mixed", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 18, 7, 2],
  ], 100),
];

export const ALL_STAGES = WORLDS.flatMap((item) => item.stages);

export function getStage(id: string): Stage | undefined {
  return ALL_STAGES.find((item) => item.id === id);
}

export function getWorld(id: string): World | undefined {
  return WORLDS.find((item) => item.id === id);
}
