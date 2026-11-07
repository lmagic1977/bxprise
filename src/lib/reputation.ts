import { eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { BASE_REPUTATION, REPUTATION_POINTS, TIERS, type TierId } from "./config";

export type Reputation = { score: number; completed: number; fraud: number; tier: TierId };

export async function getReputation(userId: number, tx?: Tx): Promise<Reputation> {
  const q = tx ?? db;
  const [agg] = await q
    .select({
      points: sql<number>`coalesce(sum(${schema.reputationEvents.points}),0)::int`,
      completed: sql<number>`count(*) filter (where ${schema.reputationEvents.kind} = 'completed')::int`,
      fraud: sql<number>`count(*) filter (where ${schema.reputationEvents.kind} = 'fraud_confirmed')::int`,
    })
    .from(schema.reputationEvents)
    .where(eq(schema.reputationEvents.userId, userId));
  const score = Math.max(0, Math.min(100, BASE_REPUTATION + agg.points));
  return { score, completed: agg.completed, fraud: agg.fraud, tier: tierFor(score, agg.completed, agg.fraud) };
}

export function tierFor(score: number, completed: number, fraud: number): TierId {
  let tier: TierId = "starter";
  for (const t of TIERS) {
    if (completed >= t.minCompleted && score >= t.minScore && (t.id === "starter" || fraud === 0)) tier = t.id;
  }
  return tier;
}

export async function getReputations(userIds: number[]) {
  const map = new Map<number, Reputation>();
  for (const id of userIds) map.set(id, await getReputation(id));
  return map;
}

export async function addReputation(
  userId: number,
  kind: keyof typeof REPUTATION_POINTS,
  exchangeId: number | null,
  tx?: Tx,
) {
  await (tx ?? db)
    .insert(schema.reputationEvents)
    .values({ userId, kind, exchangeId, points: REPUTATION_POINTS[kind] })
    .onConflictDoNothing();
}

export const tierOfValue = (midCents: number): TierId | null =>
  TIERS.find((t) => midCents >= t.minCents && midCents <= t.maxCents)?.id ?? null;

export const tierRank = (t: TierId) => TIERS.findIndex((x) => x.id === t);

