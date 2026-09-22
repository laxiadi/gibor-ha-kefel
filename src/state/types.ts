export type Difficulty = "easy" | "medium" | "hard";
export type Operation = "mul" | "div" | "mixed";
export type AnswerMode = "numpad" | "choices";
export type Theme = "webs" | "towers" | "fortress" | "storm" | "caves" | "neon" | "shadow";
export type Suit = "classic" | "future" | "stealth" | "venom";

export interface DifficultyConfig {
  hearts: number;
  timerScale: number;
  questions: number;
  snackUses: number;
  star2: number;
  star3: number;
}

export interface Stage {
  id: string;
  name: string;
  worldId: string;
  operation: Operation;
  tables: number[];
  questions: number;
  seconds: number;
  hearts: number;
  reward: number;
  boss?: boolean;
}

export interface World {
  id: string;
  name: string;
  subtitle: string;
  theme: Theme;
  stages: Stage[];
}

export interface FactStats {
  seen: number;
  correct: number;
  wrong: number;
  firstTry: number;
  timesMs: number[];
  recent: number[];
}

export interface StageProgress {
  stars: number;
  cleared: boolean;
  attempts: number;
  bestScore: number;
}

export interface Settings {
  mute: boolean;
  slowMode: boolean;
  reduceMotion: boolean;
  difficulty: Difficulty;
  answerMode: AnswerMode;
}

export interface GameState {
  version: 4;
  playerName: string;
  nameAsked: boolean;
  silk: number;
  lifetimeSilk: number;
  facts: Record<string, FactStats>;
  settings: Settings;
  worldProgress: Record<string, StageProgress>;
  highScores: { overall: number; tables: Record<string, number> };
  pantry: Record<string, number>;
  inventory: Record<string, { owned: boolean; variants: string[] }>;
  equipped: Record<string, string | null>;
  unlockedSuits: Suit[];
  activeSuit: Suit;
  opMode: Operation;
  lastStageId: string | null;
  tables11_12Unlocked: boolean;
  finaleSeen: boolean;
  roundsCompleted: number;
}

export interface Question {
  operation: "mul" | "div";
  a: number;
  b: number;
  answer: number;
  prompt: string;
  factKey: string;
  choices: number[];
}

export interface Session {
  kind: "stage" | "practice" | "weak" | "city";
  stageId?: string;
  mission: string;
  tables: number[];
  operation: Operation;
  total: number;
  index: number;
  hearts: number;
  maxHearts: number;
  score: number;
  streak: number;
  correct: number;
  firstTry: number;
  silk: number;
  attempts: number;
  startedAt: number;
  questionStartedAt: number;
  seconds: number;
  deadline: number;
  totalDeadline?: number;
  timer?: number;
  question: Question;
  misses: string[];
  snackUses: number;
  maxSnackUses: number;
  frozenUntil: number;
  transitioning: boolean;
}
