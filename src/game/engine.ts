import { DIFFICULTIES } from "../config/game";
import { ALL_STAGES } from "../config/worlds";
import type { FactStats, GameState, Operation, Question, Session, Stage } from "../state/types";

export function factKey(a: number, b: number): string {
  return `${a}×${b}`;
}

export function getFact(state: GameState, key: string): FactStats {
  return state.facts[key] ?? { seen: 0, correct: 0, wrong: 0, firstTry: 0, timesMs: [], recent: [] };
}

export function recordFact(
  state: GameState,
  key: string,
  correct: boolean,
  firstTry: boolean,
  elapsed: number,
): void {
  const fact = { ...getFact(state, key) };
  fact.seen += 1;
  if (correct) {
    fact.correct += 1;
    if (firstTry) fact.firstTry += 1;
    fact.timesMs = [...fact.timesMs, elapsed].slice(-20);
  } else {
    fact.wrong += 1;
  }
  fact.recent = [...fact.recent, correct ? (firstTry ? 1 : 0.5) : 0].slice(-8);
  state.facts[key] = fact;
}

export function mastery(state: GameState, key: string): "new" | "bronze" | "silver" | "gold" {
  const fact = getFact(state, key);
  if (!fact.seen) return "new";
  const rate = fact.recent.length
    ? fact.recent.reduce((sum, value) => sum + value, 0) / fact.recent.length
    : fact.correct / fact.seen;
  const sorted = [...fact.timesMs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
  if (fact.firstTry >= 4 && rate >= 0.75 && median < 6000) return "gold";
  if (fact.correct >= 2 && rate >= 0.6) return "silver";
  return "bronze";
}

export function weakFactKeys(state: GameState, limit = 12): string[] {
  return Object.entries(state.facts)
    .filter(([, stats]) => stats.seen > 0)
    .sort(([, a], [, b]) => (b.wrong - a.wrong) || (a.correct / a.seen - b.correct / b.seen))
    .slice(0, limit)
    .map(([key]) => key);
}

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function choices(answer: number): number[] {
  const pool = new Set<number>();
  const spread = Math.max(3, Math.round(answer * 0.15));
  while (pool.size < 3) {
    const candidate = answer + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
    if (candidate > 0 && candidate !== answer && candidate <= 144) pool.add(candidate);
  }
  return shuffled([answer, ...pool]);
}

export function makeQuestion(
  state: GameState,
  tables: number[],
  operation: Operation,
  preferredKeys: string[] = [],
): Question {
  let a: number;
  let b: number;
  const preferred = preferredKeys[Math.floor(Math.random() * preferredKeys.length)];
  if (preferred && Math.random() < 0.7) {
    [a, b] = preferred.split("×").map(Number) as [number, number];
  } else {
    const weighted: Array<{ a: number; b: number; weight: number }> = [];
    for (const table of tables) {
      for (let factor = 1; factor <= 12; factor++) {
        const tier = mastery(state, factKey(table, factor));
        const weight = tier === "new" ? 5 : tier === "bronze" ? 7 : tier === "silver" ? 3 : 1;
        weighted.push({ a: table, b: factor, weight });
      }
    }
    let pick = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    const selected = weighted.find((item) => (pick -= item.weight) <= 0) ?? weighted[0]!;
    a = selected.a;
    b = selected.b;
  }
  const op = operation === "mixed" ? (Math.random() < 0.48 ? "div" : "mul") : operation;
  const answer = op === "mul" ? a * b : a;
  const prompt = op === "mul" ? `${a} × ${b} = ?` : `${a * b} ÷ ${b} = ?`;
  return { operation: op, a, b, answer, prompt, factKey: factKey(a, b), choices: choices(answer) };
}

export function createSession(
  state: GameState,
  options: {
    kind: Session["kind"];
    mission: string;
    tables: number[];
    operation: Operation;
    total: number;
    hearts: number;
    seconds: number;
    stageId?: string;
    preferredKeys?: string[];
  },
): Session {
  const config = DIFFICULTIES[state.settings.difficulty];
  const seconds = Math.max(5, Math.round(options.seconds * config.timerScale));
  const question = makeQuestion(state, options.tables, options.operation, options.preferredKeys);
  const now = performance.now();
  return {
    ...options,
    index: 0,
    hearts: options.hearts,
    maxHearts: options.hearts,
    score: 0,
    streak: 0,
    correct: 0,
    firstTry: 0,
    silk: 0,
    attempts: 0,
    startedAt: now,
    questionStartedAt: now,
    seconds,
    deadline: now + seconds * 1000,
    question,
    misses: [],
    snackUses: 0,
    maxSnackUses: config.snackUses,
    frozenUntil: 0,
    transitioning: false,
  };
}

export function speedScore(elapsed: number, streak: number): { points: number; silk: number } {
  const factor = elapsed < 2500 ? 1 : elapsed < 4500 ? 0.72 : elapsed < 8000 ? 0.4 : 0.16;
  const multiplier = streak >= 10 ? 5 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
  return {
    points: Math.max(10, Math.round(100 * factor * multiplier)),
    silk: factor >= 0.7 ? 5 : factor >= 0.4 ? 2 : 1,
  };
}

export function computeStars(state: GameState, session: Session): number {
  const config = DIFFICULTIES[state.settings.difficulty];
  const accuracy = session.correct / Math.max(1, session.total);
  const hearts = Math.max(0, session.hearts) / session.maxHearts;
  const score = accuracy * 0.8 + hearts * 0.2;
  if (accuracy >= 0.9 && score >= config.star3) return 3;
  if (accuracy >= 0.7 && score >= config.star2) return 2;
  if (accuracy >= 0.4) return 1;
  return 0;
}

export function isStageUnlocked(state: GameState, stageId: string): boolean {
  const index = ALL_STAGES.findIndex((stage) => stage.id === stageId);
  if (index <= 0) return true;
  const previous = ALL_STAGES[index - 1]!;
  return (state.worldProgress[previous.id]?.stars ?? 0) >= 2;
}

export function finishStage(state: GameState, stage: Stage, stars: number, score: number): void {
  const old = state.worldProgress[stage.id] ?? { stars: 0, cleared: false, attempts: 0, bestScore: 0 };
  state.worldProgress[stage.id] = {
    stars: Math.max(old.stars, stars),
    cleared: old.cleared || stars >= 2,
    attempts: old.attempts + 1,
    bestScore: Math.max(old.bestScore, score),
  };
  if (stage.id === "W5-Boss" && !state.unlockedSuits.includes("stealth")) state.unlockedSuits.push("stealth");
  if (stage.id === "W6-Boss" && !state.unlockedSuits.includes("future")) state.unlockedSuits.push("future");
  if (stage.id === "W7-Boss" && !state.unlockedSuits.includes("venom")) state.unlockedSuits.push("venom");
}
