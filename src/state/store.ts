import { ALL_STAGES } from "../config/worlds";
import type { GameState, StageProgress, Suit } from "./types";

const KEYS = ["webHeroTimes.v4", "webHeroTimes.v3", "webHeroTimes.v2", "webHeroTimes.v1"];
let memorySave: string | null = null;
let storageBlocked = false;

function defaultProgress(): Record<string, StageProgress> {
  return Object.fromEntries(
    ALL_STAGES.map((stage) => [stage.id, { stars: 0, cleared: false, attempts: 0, bestScore: 0 }]),
  );
}

export function createDefaultState(): GameState {
  return {
    version: 4,
    playerName: "",
    nameAsked: false,
    silk: 0,
    lifetimeSilk: 0,
    facts: {},
    settings: {
      mute: false,
      slowMode: false,
      reduceMotion: false,
      difficulty: "medium",
      answerMode: "numpad",
    },
    worldProgress: defaultProgress(),
    highScores: { overall: 0, tables: {} },
    pantry: { banana: 1, cookie: 1 },
    inventory: {},
    equipped: {},
    unlockedSuits: ["classic"],
    activeSuit: "classic",
    opMode: "mul",
    lastStageId: null,
    tables11_12Unlocked: false,
    finaleSeen: false,
    roundsCompleted: 0,
  };
}

function number(value: unknown, fallback = 0): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function migrateState(raw: unknown): GameState {
  const defaults = createDefaultState();
  if (!raw || typeof raw !== "object") return defaults;
  const source = raw as Partial<GameState> & Record<string, unknown>;
  const progress = defaultProgress();
  for (const stage of ALL_STAGES) {
    const old = source.worldProgress?.[stage.id];
    if (!old) continue;
    progress[stage.id] = {
      stars: Math.min(3, Math.max(0, number(old.stars))),
      cleared: Boolean(old.cleared),
      attempts: Math.max(0, number(old.attempts)),
      bestScore: Math.max(0, number(old.bestScore)),
    };
  }
  const settings = { ...defaults.settings, ...(source.settings ?? {}) };
  if (!["easy", "medium", "hard"].includes(settings.difficulty)) settings.difficulty = "medium";
  if (!["numpad", "choices"].includes(settings.answerMode)) settings.answerMode = "numpad";
  const activeSuit: Suit = ["classic", "future", "stealth", "venom"].includes(String(source.activeSuit))
    ? (source.activeSuit as Suit)
    : "classic";
  const unlocked: Suit[] = Array.isArray(source.unlockedSuits)
    ? source.unlockedSuits.filter((s): s is Suit => ["classic", "future", "stealth", "venom"].includes(String(s)))
    : ["classic"];
  if (!unlocked.includes("classic")) unlocked.unshift("classic");
  const bossUnlocks: Array<[string, Suit]> = [
    ["W5-Boss", "stealth"],
    ["W6-Boss", "future"],
    ["W7-Boss", "venom"],
  ];
  for (const [stageId, suit] of bossUnlocks) {
    if ((progress[stageId]?.stars ?? 0) >= 2 && !unlocked.includes(suit)) unlocked.push(suit);
  }
  return {
    ...defaults,
    ...source,
    version: 4,
    playerName: typeof source.playerName === "string" ? source.playerName.slice(0, 20) : "",
    silk: Math.max(0, number(source.silk)),
    lifetimeSilk: Math.max(0, number(source.lifetimeSilk, number(source.silk))),
    facts: source.facts && typeof source.facts === "object" ? source.facts : {},
    settings,
    worldProgress: progress,
    highScores: {
      overall: Math.max(0, number(source.highScores?.overall)),
      tables: source.highScores?.tables ?? {},
    },
    pantry: source.pantry ?? defaults.pantry,
    inventory: source.inventory ?? {},
    equipped: source.equipped ?? {},
    unlockedSuits: [...new Set(unlocked)],
    activeSuit: unlocked.includes(activeSuit) ? activeSuit : "classic",
    opMode: ["mul", "div", "mixed"].includes(String(source.opMode)) ? source.opMode! : "mul",
    lastStageId: typeof source.lastStageId === "string" ? source.lastStageId : null,
    tables11_12Unlocked: Boolean(source.tables11_12Unlocked || progress["W6-Boss"]?.cleared),
    roundsCompleted: Math.max(0, number(source.roundsCompleted)),
  };
}

export function loadState(): GameState {
  for (const key of KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        memorySave = value;
        return migrateState(JSON.parse(value));
      }
    } catch {
      storageBlocked = true;
    }
  }
  if (memorySave) {
    try {
      return migrateState(JSON.parse(memorySave));
    } catch {
      // Fall through to a clean save.
    }
  }
  return createDefaultState();
}

export function saveState(state: GameState): void {
  const value = JSON.stringify({ ...state, version: 4 });
  memorySave = value;
  try {
    localStorage.setItem(KEYS[0]!, value);
    for (const key of KEYS.slice(1)) localStorage.removeItem(key);
    storageBlocked = false;
  } catch {
    storageBlocked = true;
  }
}

export function isStorageBlocked(): boolean {
  return storageBlocked;
}

export function exportSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(encoded: string): GameState {
  const decoded = decodeURIComponent(escape(atob(encoded.trim())));
  return migrateState(JSON.parse(decoded));
}

export function clearSave(): void {
  for (const key of KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      storageBlocked = true;
    }
  }
  memorySave = null;
}
