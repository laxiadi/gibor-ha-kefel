import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GEAR } from "../config/game";
import { mastery } from "../game/engine";
import { migrateState } from "../state/store";
import type { FactStats, GameState, StageProgress } from "../state/types";

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  stars: number;
  gearCount: number;
  suits: number;
  isMe: boolean;
}

interface RankingStats {
  stars: number;
  cleared: number;
  goldFacts: number;
  silverFacts: number;
  bronzeFacts: number;
  gearValue: number;
  gearCount: number;
  suits: number;
  rounds: number;
  lifetimeSilk: number;
  highScore: number;
}

type CloudProgress = Omit<GameState, "facePhoto">;

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function newerFact(local: FactStats | undefined, cloud: FactStats | undefined): FactStats | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  return local.seen >= cloud.seen ? local : cloud;
}

function strongerStage(local: StageProgress | undefined, cloud: StageProgress | undefined): StageProgress | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  return {
    stars: Math.max(local.stars, cloud.stars),
    cleared: local.cleared || cloud.cleared,
    attempts: Math.max(local.attempts, cloud.attempts),
    bestScore: Math.max(local.bestScore, cloud.bestScore),
  };
}

/** Monotonic achievements are combined; spendable inventory follows the state with more completed rounds. */
export function mergeCloudProgress(local: GameState, rawCloud: unknown): GameState {
  const cloud = migrateState(rawCloud);
  const localIsNewer = local.roundsCompleted > cloud.roundsCompleted;
  const facts = Object.fromEntries(
    [...new Set([...Object.keys(local.facts), ...Object.keys(cloud.facts)])]
      .map((key) => [key, newerFact(local.facts[key], cloud.facts[key])!]),
  );
  const worldProgress = Object.fromEntries(
    [...new Set([...Object.keys(local.worldProgress), ...Object.keys(cloud.worldProgress)])]
      .map((key) => [key, strongerStage(local.worldProgress[key], cloud.worldProgress[key])!]),
  );
  const ownedGear = [...new Set([...local.ownedGear, ...cloud.ownedGear])];
  const unlockedSuits = [...new Set([...local.unlockedSuits, ...cloud.unlockedSuits])];
  const source = localIsNewer ? local : cloud;

  return migrateState({
    ...source,
    facePhoto: local.facePhoto,
    playerName: local.playerName || cloud.playerName,
    nameAsked: local.nameAsked || cloud.nameAsked,
    lifetimeSilk: Math.max(local.lifetimeSilk, cloud.lifetimeSilk),
    facts,
    worldProgress,
    highScores: {
      overall: Math.max(local.highScores.overall, cloud.highScores.overall),
      tables: Object.fromEntries(
        [...new Set([...Object.keys(local.highScores.tables), ...Object.keys(cloud.highScores.tables)])]
          .map((key) => [key, Math.max(local.highScores.tables[key] ?? 0, cloud.highScores.tables[key] ?? 0)]),
      ),
    },
    ownedGear,
    equippedGear: Object.fromEntries(
      Object.entries(source.equippedGear).filter(([, id]) => id && ownedGear.includes(id)),
    ),
    unlockedSuits,
    activeSuit: unlockedSuits.includes(source.activeSuit) ? source.activeSuit : "classic",
    roundsCompleted: Math.max(local.roundsCompleted, cloud.roundsCompleted),
    tables11_12Unlocked: local.tables11_12Unlocked || cloud.tables11_12Unlocked,
    finaleSeen: local.finaleSeen || cloud.finaleSeen,
  });
}

export function rankingStats(state: GameState): RankingStats {
  const tiers = Object.keys(state.facts).map((key) => mastery(state, key));
  return {
    stars: Object.values(state.worldProgress).reduce((sum, stage) => sum + stage.stars, 0),
    cleared: Object.values(state.worldProgress).filter((stage) => stage.cleared).length,
    goldFacts: tiers.filter((tier) => tier === "gold").length,
    silverFacts: tiers.filter((tier) => tier === "silver").length,
    bronzeFacts: tiers.filter((tier) => tier === "bronze").length,
    gearValue: GEAR.filter((item) => state.ownedGear.includes(item.id)).reduce((sum, item) => sum + item.cost, 0),
    gearCount: state.ownedGear.length,
    suits: state.unlockedSuits.length,
    rounds: state.roundsCompleted,
    lifetimeSilk: state.lifetimeSilk,
    highScore: state.highScores.overall,
  };
}

export function rankingScore(stats: RankingStats): number {
  return stats.stars * 100
    + stats.cleared * 150
    + stats.goldFacts * 50
    + stats.silverFacts * 25
    + stats.bronzeFacts * 10
    + stats.gearValue
    + stats.suits * 500
    + stats.rounds * 10
    + Math.floor(stats.lifetimeSilk / 10)
    + Math.floor(stats.highScore / 20);
}

function cloudProgress(state: GameState): CloudProgress {
  const copy = { ...state } as Partial<GameState>;
  delete copy.facePhoto;
  return copy as CloudProgress;
}

export class CloudLeaderboard {
  readonly configured = Boolean(url && anonKey);
  private readonly client: SupabaseClient | null;
  private saveTimer: number | undefined;

  constructor() {
    this.client = this.configured
      ? createClient(url!, anonKey!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
      : null;
  }

  async initialize(local: GameState): Promise<GameState> {
    if (!this.client) return local;
    const { data: sessionData } = await this.client.auth.getSession();
    if (!sessionData.session) {
      const { error } = await this.client.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data, error } = await this.client.rpc("get_my_progress");
    if (error) throw error;
    const merged = data ? mergeCloudProgress(local, data) : local;
    await this.save(merged);
    return merged;
  }

  scheduleSave(state: GameState): void {
    if (!this.client) return;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.save(state).catch(() => undefined), 900);
  }

  async save(state: GameState): Promise<number | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.rpc("submit_player_progress", {
      p_nickname: state.playerName || "גיבור",
      p_stats: rankingStats(state),
      p_progress: cloudProgress(state),
    });
    if (error) throw error;
    return typeof data === "number" ? data : Number(data);
  }

  async topTen(): Promise<LeaderboardEntry[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.rpc("get_top_players");
    if (error) throw error;
    return (data ?? []).map((entry: Record<string, unknown>) => ({
      rank: Number(entry.rank),
      nickname: String(entry.nickname),
      score: Number(entry.score),
      stars: Number(entry.stars),
      gearCount: Number(entry.gear_count),
      suits: Number(entry.suits),
      isMe: Boolean(entry.is_me),
    }));
  }
}
