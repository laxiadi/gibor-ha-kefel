import { describe, expect, it } from "vitest";
import { ALL_STAGES, WORLDS } from "../config/worlds";
import { createDefaultState, migrateState } from "../state/store";
import { finishStage, isStageUnlocked, makeQuestion, speedScore } from "./engine";

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
      settings: { difficulty: "hard", answerMode: "choices", mute: false },
    });
    expect(state.version).toBe(4);
    expect(state.silk).toBe(123);
    expect(state.facts["6×7"]?.correct).toBe(4);
    expect(state.worldProgress["W1-1"]?.stars).toBe(3);
    expect(state.worldProgress["W7-Boss"]).toBeDefined();
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
});

describe("question and scoring engine", () => {
  it("generates valid multiplication and division questions", () => {
    const state = createDefaultState();
    for (const operation of ["mul", "div", "mixed"] as const) {
      for (let i = 0; i < 100; i++) {
        const question = makeQuestion(state, [11, 12], operation);
        expect(question.answer).toBeGreaterThan(0);
        expect(question.choices).toContain(question.answer);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.a).toBeGreaterThanOrEqual(11);
        expect(question.a).toBeLessThanOrEqual(12);
      }
    }
  });

  it("rewards speed and streaks", () => {
    expect(speedScore(1500, 10).points).toBeGreaterThan(speedScore(7000, 0).points);
  });
});
