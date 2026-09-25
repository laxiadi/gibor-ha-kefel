import { GEAR } from "../config/game";
import { ALL_STAGES } from "../config/worlds";
import type { GameState, GearId, GearSlot, StageProgress, Suit } from "./types";

const KEYS = ["webHeroTimes.v6", "webHeroTimes.v5", "webHeroTimes.v4", "webHeroTimes.v3", "webHeroTimes.v2", "webHeroTimes.v1"];
const SAFE_PHOTO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 400_000;
const GEAR_IDS: GearId[] = GEAR.map((item) => item.id);
const GEAR_BY_SLOT = Object.fromEntries(
  (["head", "chest", "wrists", "back"] as GearSlot[])
    .map((slot) => [slot, GEAR.filter((item) => item.slot === slot).map((item) => item.id)]),
) as Record<GearSlot, GearId[]>;
const GEAR_SLOTS: GearSlot[] = ["head", "chest", "wrists", "back"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let memorySave: string | null = null;
let storageBlocked = false;

function defaultProgress(): Record<string, StageProgress> {
  return Object.fromEntries(
    ALL_STAGES.map((stage) => [stage.id, { stars: 0, cleared: false, attempts: 0, bestScore: 0 }]),
  );
}

export function createDefaultState(): GameState {
  return {
    version: 6,
    playerName: "",
    nameAsked: false,
    facePhoto: null,
    silk: 0,
    lifetimeSilk: 0,
    facts: {},
    settings: {
      mute: false,
      slowMode: false,
      reduceMotion: false,
      difficulty: "medium",
    },
    worldProgress: defaultProgress(),
    highScores: { overall: 0, tables: {} },
    pantry: { banana: 1, cookie: 1 },
    inventory: {},
    equipped: {},
    ownedGear: [],
    equippedGear: {},
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
  delete (settings as Record<string, unknown>).answerMode;
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
  const ownedGear = Array.isArray(source.ownedGear)
    ? source.ownedGear.filter((id): id is GearId => GEAR_IDS.includes(id as GearId))
    : [];
  const equippedGear: GameState["equippedGear"] = {};
  if (source.equippedGear && typeof source.equippedGear === "object") {
    for (const slot of GEAR_SLOTS) {
      const id = source.equippedGear[slot];
      if (id && GEAR_BY_SLOT[slot].includes(id) && ownedGear.includes(id)) equippedGear[slot] = id;
    }
  }
  const facePhoto = typeof source.facePhoto === "string"
    && source.facePhoto.length <= MAX_PHOTO_CHARS
    && SAFE_PHOTO.test(source.facePhoto)
    ? source.facePhoto
    : null;
  return {
    ...defaults,
    ...source,
    version: 6,
    playerName: typeof source.playerName === "string" ? source.playerName.slice(0, 20) : "",
    facePhoto,
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
    ownedGear,
    equippedGear,
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
  const value = JSON.stringify({ ...state, version: 6 });
  memorySave = value;
  try {
    localStorage.setItem(KEYS[0]!, value);
    for (const key of KEYS.slice(1)) localStorage.removeItem(key);
    storageBlocked = false;
  } catch {
    // A selfie is the only thing big enough to blow the quota, so retry without it before giving up.
    try {
      localStorage.setItem(KEYS[0]!, JSON.stringify({ ...state, version: 6, facePhoto: null }));
      storageBlocked = false;
    } catch {
      storageBlocked = true;
    }
  }
}

export function isStorageBlocked(): boolean {
  return storageBlocked;
}

export function exportSave(state: GameState): string {
  const completed = Math.min(ALL_STAGES.length, ALL_STAGES.findIndex((stage) => !state.worldProgress[stage.id]?.cleared));
  const completedCount = completed < 0 ? ALL_STAGES.length : completed;
  const suitMask = (["classic", "future", "stealth", "venom"] as Suit[])
    .reduce((mask, suit, index) => mask | (state.unlockedSuits.includes(suit) ? 1 << index : 0), 0);
  const gearMask = GEAR_IDS.reduce((mask, id, index) => mask | (state.ownedGear.includes(id) ? 1 << index : 0), 0);

  let payload = 1n;
  payload = (payload << 6n) | BigInt(completedCount);
  payload = (payload << 14n) | BigInt(Math.min(16383, Math.max(0, Math.round(state.silk))));
  payload = (payload << 4n) | BigInt(suitMask);
  payload = (payload << 20n) | BigInt(gearMask);
  const checksum = Number((payload ^ (payload >> 9n) ^ (payload >> 21n) ^ (payload >> 33n) ^ 0x17n) & 0x1Fn);
  let packed = (payload << 5n) | BigInt(checksum);
  let code = "";
  for (let index = 0; index < 10; index++) {
    code = CODE_ALPHABET[Number(packed & 31n)] + code;
    packed >>= 5n;
  }
  return code;
}

export function importSave(encoded: string): GameState {
  const code = encoded.trim().toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== 10 || [...code].some((character) => !CODE_ALPHABET.includes(character))) {
    // Continue accepting old long backup strings.
    const decoded = decodeURIComponent(escape(atob(encoded.trim())));
    return migrateState(JSON.parse(decoded));
  }
  let packed = 0n;
  for (const character of code) packed = (packed << 5n) | BigInt(CODE_ALPHABET.indexOf(character));
  const modernCode = packed >= (1n << 49n);
  const checksumBits = modernCode ? 5n : 8n;
  const checksumMask = (1n << checksumBits) - 1n;
  const checksum = Number(packed & checksumMask);
  let payload = packed >> checksumBits;
  const expected = modernCode
    ? Number((payload ^ (payload >> 9n) ^ (payload >> 21n) ^ (payload >> 33n) ^ 0x17n) & 0x1Fn)
    : Number((payload ^ (payload >> 11n) ^ (payload >> 23n) ^ 0xA7n) & 0xFFn);
  if (checksum !== expected) throw new Error("Invalid recovery code");

  const take = (bits: bigint): number => {
    const mask = (1n << bits) - 1n;
    const value = Number(payload & mask);
    payload >>= bits;
    return value;
  };
  const equippedBits = modernCode ? 0 : take(8n);
  const gearMask = take(modernCode ? 20n : 8n);
  const suitMask = take(4n);
  const silk = take(14n);
  const completedCount = take(6n);
  if (take(modernCode ? 1n : 2n) !== 1 || completedCount > ALL_STAGES.length) throw new Error("Unsupported recovery code");

  const state = createDefaultState();
  state.silk = silk;
  state.lifetimeSilk = silk;
  for (let index = 0; index < completedCount; index++) {
    const stage = ALL_STAGES[index]!;
    state.worldProgress[stage.id] = { stars: 2, cleared: true, attempts: 1, bestScore: 0 };
  }
  state.lastStageId = ALL_STAGES[Math.min(completedCount, ALL_STAGES.length - 1)]?.id ?? null;
  state.unlockedSuits = (["classic", "future", "stealth", "venom"] as Suit[])
    .filter((_, index) => (suitMask & (1 << index)) !== 0);
  if (!state.unlockedSuits.includes("classic")) state.unlockedSuits.unshift("classic");
  state.ownedGear = GEAR_IDS.filter((_, index) => (gearMask & (1 << index)) !== 0);
  GEAR_SLOTS.forEach((slot, index) => {
    const selected = modernCode
      ? [...GEAR_BY_SLOT[slot]].reverse().find((id) => state.ownedGear.includes(id))
      : GEAR_BY_SLOT[slot][((equippedBits >> (index * 2)) & 3) - 1];
    if (selected && state.ownedGear.includes(selected)) state.equippedGear[slot] = selected;
  });
  state.tables11_12Unlocked = completedCount > ALL_STAGES.findIndex((stage) => stage.id === "W6-Boss");
  state.nameAsked = true;
  return state;
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
