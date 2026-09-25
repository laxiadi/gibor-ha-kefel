import { describe, expect, it } from "vitest";
import { ALL_STAGES, WORLDS } from "../config/worlds";
import { mergeCloudProgress, rankingScore, rankingStats } from "../leaderboard/cloud";
import { createDefaultState, exportSave, importSave, migrateState } from "../state/store";
import { createSession, finishStage, isStageUnlocked, makeQuestion, RECENT_MEMORY, speedScore } from "./engine";

describe("campaign data", () => {
  it("contains seven worlds and exactly 46 unique stages", () => {
    expect(WORLDS).toHaveLength(7);
    expect(ALL_STAGES).toHaveLength(46);
    expect(new Set(ALL_STAGES.map((stage) => stage.id)).size).toBe(46);
  });

  it("keeps all operands in the 1–12 range and has one boss per world", () => {
    for (const world of WORLDS) {
      expect(world.stages.filter((stage) => stage.boss)).toHaveLength(1);
      for (const stage of world.stages) {
        expect(stage.tables.every((table) => table >= 1 && table <= 12)).toBe(true);
      }
    }
  });

  it("preserves the original sixteen stage IDs", () => {
    const originalIds = [
      "W1-1", "W1-2", "W1-3", "W1-Boss",
      "W2-1", "W2-2", "W2-3", "W2-Boss",
      "W3-1", "W3-2", "W3-3", "W3-Boss",
      "W4-1", "W4-2", "W4-3", "W4-Boss",
    ];
    expect(originalIds.every((id) => ALL_STAGES.some((stage) => stage.id === id))).toBe(true);
  });
});

describe("save migration and progression", () => {
  it("migrates v3 progress without losing stars, silk, or facts", () => {
    const state = migrateState({
      version: 3,
      silk: 123,
      lifetimeSilk: 456,
      facts: { "6×7": { seen: 5, correct: 4, wrong: 1, firstTry: 3, timesMs: [3000], recent: [1] } },
      worldProgress: { "W1-1": { stars: 3, cleared: true, attempts: 2, bestScore: 900 } },
      settings: { difficulty: "hard", mute: false },
    });
    expect(state.version).toBe(6);
    expect(state.silk).toBe(123);
    expect(state.facts["6×7"]?.correct).toBe(4);
    expect(state.worldProgress["W1-1"]?.stars).toBe(3);
    expect(state.worldProgress["W7-Boss"]).toBeDefined();
    expect(state.facePhoto).toBeNull();
  });

  it("keeps a valid selfie but rejects anything that is not a base64 image", () => {
    const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(migrateState({ version: 5, facePhoto: photo }).facePhoto).toBe(photo);
    expect(migrateState({ version: 5, facePhoto: "https://example.com/a.jpg" }).facePhoto).toBeNull();
    expect(migrateState({ version: 5, facePhoto: 'data:image/svg+xml,<svg onload="x"/>' }).facePhoto).toBeNull();
    expect(migrateState({ version: 5, facePhoto: 42 }).facePhoto).toBeNull();
  });

  it("leaves the selfie out of the recovery code", () => {
    const state = createDefaultState();
    state.facePhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    state.silk = 700;
    expect(importSave(exportSave(state)).facePhoto).toBeNull();
  });

  it("unlocks stages in a single ordered chain", () => {
    const state = createDefaultState();
    expect(isStageUnlocked(state, "W1-1")).toBe(true);
    expect(isStageUnlocked(state, "W1-2")).toBe(false);
    finishStage(state, ALL_STAGES[0]!, 2, 100);
    expect(isStageUnlocked(state, "W1-2")).toBe(true);
  });

  it("walks the complete 46-stage campaign and unlocks every suit", () => {
    const state = createDefaultState();
    for (const stage of ALL_STAGES) {
      expect(isStageUnlocked(state, stage.id)).toBe(true);
      finishStage(state, stage, 2, 500);
    }
    expect(state.worldProgress["W7-Boss"]?.cleared).toBe(true);
    expect(state.unlockedSuits).toEqual(expect.arrayContaining(["classic", "stealth", "future", "venom"]));
  });

  it("backfills suit and table unlocks from completed boss progress", () => {
    const state = migrateState({
      version: 4,
      worldProgress: {
        "W5-Boss": { stars: 2, cleared: true, attempts: 1, bestScore: 500 },
        "W6-Boss": { stars: 3, cleared: true, attempts: 1, bestScore: 700 },
        "W7-Boss": { stars: 2, cleared: true, attempts: 1, bestScore: 900 },
      },
    });
    expect(state.unlockedSuits).toEqual(expect.arrayContaining(["stealth", "future", "venom"]));
    expect(state.tables11_12Unlocked).toBe(true);
  });

  it("creates and restores a 10-character progression code", () => {
    const state = createDefaultState();
    state.silk = 3210;
    state.unlockedSuits.push("future");
    state.ownedGear = ["spider-visor", "bionic-arms", "portal-pack"];
    state.equippedGear = { head: "spider-visor", back: "portal-pack" };
    for (const stage of ALL_STAGES.slice(0, 12)) finishStage(state, stage, 2, 500);

    const code = exportSave(state);
    const restored = importSave(code);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(restored.silk).toBe(3210);
    expect(restored.worldProgress["W3-Boss"]?.cleared).toBe(true);
    expect(restored.unlockedSuits).toContain("future");
    expect(restored.ownedGear).toEqual(expect.arrayContaining(["spider-visor", "bionic-arms", "portal-pack"]));
    expect(restored.equippedGear.back).toBe("portal-pack");
  });

  it("continues to import recovery codes from the eight-item wardrobe", () => {
    const restored = importSave("LV99999FKU");
    expect(restored.silk).toBe(16383);
    expect(restored.ownedGear).toHaveLength(8);
  });
});

describe("question and scoring engine", () => {
  it("generates valid multiplication and division questions", () => {
    const state = createDefaultState();
    for (const operation of ["mul", "div", "mixed"] as const) {
      for (let i = 0; i < 100; i++) {
        const question = makeQuestion(state, [11, 12], operation);
        expect(question.answer).toBeGreaterThan(0);
        expect(question.a).toBeGreaterThanOrEqual(11);
        expect(question.a).toBeLessThanOrEqual(12);
      }
    }
  });

  it("rewards speed and streaks", () => {
    expect(speedScore(1500, 10).points).toBeGreaterThan(speedScore(7000, 0).points);
  });

  it("avoids consecutive repeats and spreads facts across a rolling window", () => {
    const state = createDefaultState();
    const tables = [2, 3, 4];
    let recentKeys: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < 40; i++) {
      const question = makeQuestion(state, tables, "mul", [], recentKeys);
      if (recentKeys[0]) expect(question.factKey).not.toBe(recentKeys[0]);
      recentKeys = [question.factKey, ...recentKeys].slice(0, RECENT_MEMORY);
      seen.add(question.factKey);
    }

    expect(seen.size).toBeGreaterThanOrEqual(15);
  });

  it("starts at about 25 seconds and gets faster by later worlds and difficulty", () => {
    const state = createDefaultState();
    const first = createSession(state, {
      kind: "stage", stageId: "W1-1", mission: "first", tables: [2], operation: "mul",
      total: 8, hearts: 3, seconds: 9,
    });
    const late = createSession(state, {
      kind: "stage", stageId: "W7-Boss", mission: "late", tables: [12], operation: "mixed",
      total: 8, hearts: 3, seconds: 7,
    });
    expect(first.seconds).toBe(25);
    expect(late.seconds).toBeLessThan(first.seconds);
    state.settings.difficulty = "hard";
    const hard = createSession(state, {
      kind: "stage", stageId: "W1-1", mission: "hard", tables: [2], operation: "mul",
      total: 8, hearts: 2, seconds: 9,
    });
    expect(hard.seconds).toBe(18);
  });
});

describe("cloud leaderboard", () => {
  it("raises ranking score for achievements and owned gear", () => {
    const state = createDefaultState();
    const initial = rankingScore(rankingStats(state));
    state.worldProgress["W1-1"] = { stars: 3, cleared: true, attempts: 1, bestScore: 1200 };
    state.ownedGear.push("bionic-arms");
    state.unlockedSuits.push("future");
    state.roundsCompleted = 4;
    expect(rankingScore(rankingStats(state))).toBeGreaterThan(initial + 4000);
  });

  it("merges cloud achievements while keeping the device-only selfie", () => {
    const local = createDefaultState();
    local.facePhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    local.ownedGear.push("web-blasters");
    const cloud = createDefaultState();
    cloud.facePhoto = null;
    cloud.worldProgress["W1-1"] = { stars: 3, cleared: true, attempts: 2, bestScore: 900 };
    cloud.unlockedSuits.push("future");

    const merged = mergeCloudProgress(local, cloud);
    expect(merged.facePhoto).toBe(local.facePhoto);
    expect(merged.worldProgress["W1-1"]?.stars).toBe(3);
    expect(merged.ownedGear).toContain("web-blasters");
    expect(merged.unlockedSuits).toContain("future");
  });
});
