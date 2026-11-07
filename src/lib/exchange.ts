import "server-only";
import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { audit } from "./audit";
import {
  ACCEPT_WINDOW_HOURS,
  REVIEW_AUTO_PUBLISH_DAYS,
  SHIP_WINDOW_DAYS,
  SUSPEND_AFTER_FRAUD,
  conditionLabel,
  categoryLabel,
  platformLabel,
  NEEDS_PLATFORM,
} from "./config";
import { postageCents, type Pack } from "./postage";
import { addReputation, getReputation, getReputations, tierOfValue, tierRank } from "./reputation";

const { exchanges, exchangeParties: parties, items, itemLocks, valuations, payments, users, reviews, disputes } =
  schema;

export const packOf = (it: typeof items.$inferSelect): Pack => ({
  weightOz: it.weightOz,
  dims: [it.lengthIn, it.widthIn, it.heightIn],
});

export async function latestValuation(itemId: number, tx?: Tx) {
  const [v] = await (tx ?? db)
    .select()
    .from(valuations)
    .where(eq(valuations.itemId, itemId))
    .orderBy(desc(valuations.version))
    .limit(1);
  return v ?? null;
}

async function testPayment(
  tx: Tx,
  v: { userId: number; itemId?: number; exchangeId?: number; kind: string; amountCents: number; key: string },
) {
  await tx
    .insert(payments)
    .values({
      userId: v.userId,
      itemId: v.itemId,
      exchangeId: v.exchangeId,
      kind: v.kind,
      amountCents: v.amountCents,
      idempotencyKey: v.key,
      provider: "test",
    })
    .onConflictDoNothing();
}

export async function chargePostage(tx: Tx, userId: number, itemId: number, amountCents: number) {
  await testPayment(tx, { userId, itemId, kind: "postage_charge", amountCents, key: `charge:item:${itemId}` });
}

export async function refundPostage(tx: Tx, userId: number, itemId: number, amountCents: number, why: string) {
  if (amountCents <= 0) return;
  await testPayment(tx, {
    userId,
    itemId,
    kind: "postage_refund",
    amountCents,
    key: `refund:item:${itemId}:${why}`,
  });
}

async function releaseLocks(tx: Tx, exchangeId: number) {
  await tx.delete(itemLocks).where(eq(itemLocks.exchangeId, exchangeId));
}

// Lazy housekeeping, run on page loads: expire unanswered proposals and
// publish reviews whose blind window has passed.
export async function housekeeping() {
  const now = new Date();
  const stale = await db
    .select({ id: exchanges.id })
    .from(exchanges)
    .where(and(eq(exchanges.status, "proposed"), lt(exchanges.acceptDeadline, now)));
  for (const s of stale) await cancelExchange(s.id, null, "Not accepted by both sides in time");

  const cutoff = new Date(now.getTime() - REVIEW_AUTO_PUBLISH_DAYS * 864e5);
  const pending = await db
    .select({ id: exchanges.id })
    .from(exchanges)
    .where(and(eq(exchanges.status, "completed"), isNull(exchanges.reviewsPublishedAt), lt(exchanges.completedAt, cutoff)));
  for (const p of pending) await publishReviews(p.id);
}

export async function cancelExchange(exchangeId: number, actorId: number | null, reason: string) {
  await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, exchangeId)).for("update");
    if (!ex || !["proposed", "draft"].includes(ex.status)) return;
    const ps = await tx.select().from(parties).where(eq(parties.exchangeId, exchangeId));
    await tx.update(exchanges).set({ status: "cancelled", cancelReason: reason }).where(eq(exchanges.id, exchangeId));
    await releaseLocks(tx, exchangeId);
    for (const p of ps) {
      await tx
        .update(items)
        .set({ status: "in_pool" })
        .where(and(eq(items.id, p.sendItemId), eq(items.status, "proposed")));
    }
    await audit(actorId, "exchange.cancel", "exchange", exchangeId, { reason }, tx);
  });
}

// ---------- Matching ----------

type PoolItem = typeof items.$inferSelect & {
  val: typeof valuations.$inferSelect;
  owner: typeof users.$inferSelect;
};

function excluded(owner: typeof users.$inferSelect, other: typeof items.$inferSelect) {
  const words = (owner.exclusions ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2);
  const text = `${other.title} ${other.brand ?? ""} ${other.description} ${categoryLabel(other.category)}`.toLowerCase();
  return words.some((w) => text.includes(w));
}

// A receiver accepts an item if the category is wanted and, for games, they own the platform.
const wants = (owner: typeof users.$inferSelect, it: typeof items.$inferSelect) =>
  (owner.wantedCategories.length === 0 || owner.wantedCategories.includes(it.category)) &&
  (it.category !== NEEDS_PLATFORM || (!!it.platform && owner.platforms.includes(it.platform)));

export async function runMatching(adminId: number) {
  const rows = await db
    .select({ item: items, owner: users })
    .from(items)
    .innerJoin(users, eq(users.id, items.ownerId))
    .leftJoin(itemLocks, eq(itemLocks.itemId, items.id))
    .where(and(eq(items.status, "in_pool"), isNull(users.suspendedAt), isNull(itemLocks.itemId)));

  const pool: PoolItem[] = [];
  for (const r of rows) {
    const val = await latestValuation(r.item.id);
    if (!val?.acceptedAt) continue; // never match on an unaccepted valuation
    pool.push({ ...r.item, val, owner: r.owner });
  }
  const reps = await getReputations([...new Set(pool.map((p) => p.ownerId))]);
  const score = (p: PoolItem) => reps.get(p.ownerId)!.score;

  // Higher reputation first, then whoever has waited longest.
  pool.sort((a, b) => score(b) - score(a) || +(a.pooledAt ?? 0) - +(b.pooledAt ?? 0));

  const used = new Set<number>();
  const pairedUsers = new Set<string>();
  const pairs: { a: PoolItem; b: PoolItem; tier: string; reason: string }[] = [];

  for (const a of pool) {
    if (used.has(a.id)) continue;
    const tierA = tierOfValue(a.val.midCents);
    if (!tierA) continue;
    const candidates = pool.filter((b) => {
      if (b.id === a.id || used.has(b.id) || b.ownerId === a.ownerId) return false;
      const key = [a.ownerId, b.ownerId].sort().join(":");
      if (pairedUsers.has(key)) return false;
      if (tierOfValue(b.val.midCents) !== tierA) return false;
      const rank = tierRank(tierA);
      if (rank > tierRank(reps.get(a.ownerId)!.tier) || rank > tierRank(reps.get(b.ownerId)!.tier)) return false;
      if (!wants(a.owner, b) || !wants(b.owner, a)) return false;
      if (excluded(a.owner, b) || excluded(b.owner, a)) return false;
      return true;
    });
    // Similar reputation pairs together; then the closest value.
    candidates.sort(
      (x, y) =>
        Math.abs(score(a) - score(x)) - Math.abs(score(a) - score(y)) ||
        Math.abs(a.val.midCents - x.val.midCents) - Math.abs(a.val.midCents - y.val.midCents),
    );
    const b = candidates[0];
    if (!b) continue;
    used.add(a.id);
    used.add(b.id);
    pairedUsers.add([a.ownerId, b.ownerId].sort().join(":"));
    const gap = Math.abs(a.val.midCents - b.val.midCents) / Math.max(a.val.midCents, b.val.midCents);
    pairs.push({
      a,
      b,
      tier: tierA,
      reason: `${tierA} tier · ${categoryLabel(a.category)} ⇄ ${categoryLabel(b.category)} · value gap ${Math.round(gap * 100)}% · reputation ${score(a)} / ${score(b)}`,
    });
  }

  if (pairs.length === 0) return { batchId: null, count: 0, poolSize: pool.length };

  const batchId = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(schema.batches).values({ createdBy: adminId }).returning();
    for (const p of pairs) {
      const [ex] = await tx
        .insert(exchanges)
        .values({ batchId: batch.id, tier: p.tier, matchReason: p.reason, status: "draft" })
        .returning();
      await tx.insert(parties).values([
        { exchangeId: ex.id, userId: p.a.ownerId, sendItemId: p.a.id, valuationId: p.a.val.id },
        { exchangeId: ex.id, userId: p.b.ownerId, sendItemId: p.b.id, valuationId: p.b.val.id },
      ]);
    }
    await audit(adminId, "batch.create", "batch", batch.id, { pairs: pairs.length }, tx);
    return batch.id;
  });
  return { batchId, count: pairs.length, poolSize: pool.length };
}

export async function publishBatch(batchId: number, adminId: number) {
  const drafts = await db
    .select()
    .from(exchanges)
    .where(and(eq(exchanges.batchId, batchId), eq(exchanges.status, "draft")));
  let published = 0;
  for (const ex of drafts) {
    const ok = await db.transaction(async (tx) => {
      const ps = await tx.select().from(parties).where(eq(parties.exchangeId, ex.id));
      // Re-check both items are still available; the lock PK prevents doubles.
      const its = await tx.select().from(items).where(inArray(items.id, ps.map((p) => p.sendItemId))).for("update");
      if (its.length !== 2 || its.some((i) => i.status !== "in_pool")) return false;
      const ins = await tx
        .insert(itemLocks)
        .values(ps.map((p) => ({ itemId: p.sendItemId, exchangeId: ex.id })))
        .onConflictDoNothing()
        .returning();
      if (ins.length !== 2) throw new Error("rollback");
      await tx.update(items).set({ status: "proposed" }).where(inArray(items.id, ps.map((p) => p.sendItemId)));
      await tx
        .update(exchanges)
        .set({ status: "proposed", acceptDeadline: new Date(Date.now() + ACCEPT_WINDOW_HOURS * 36e5) })
        .where(eq(exchanges.id, ex.id));
      return true;
    }).catch(() => false);
    if (ok) published++;
    else await db.update(exchanges).set({ status: "cancelled", cancelReason: "Item no longer available at publish" }).where(eq(exchanges.id, ex.id));
  }
  await db.update(schema.batches).set({ status: "published", publishedAt: new Date() }).where(eq(schema.batches.id, batchId));
  await audit(adminId, "batch.publish", "batch", batchId, { published });
  return published;
}

export async function discardBatch(batchId: number, adminId: number) {
  await db
    .update(exchanges)
    .set({ status: "cancelled", cancelReason: "Batch discarded" })
    .where(and(eq(exchanges.batchId, batchId), eq(exchanges.status, "draft")));
  await db.update(schema.batches).set({ status: "discarded" }).where(eq(schema.batches.id, batchId));
  await audit(adminId, "batch.discard", "batch", batchId);
}

// ---------- Proposal responses ----------

export async function respondToProposal(exchangeId: number, userId: number, accept: boolean) {
  if (!accept) {
    await db
      .update(parties)
      .set({ declinedAt: new Date() })
      .where(and(eq(parties.exchangeId, exchangeId), eq(parties.userId, userId)));
    await cancelExchange(exchangeId, userId, "Declined by one side");
    return;
  }
  await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, exchangeId)).for("update");
    if (!ex || ex.status !== "proposed") throw new Error("This proposal is no longer open.");
    if (ex.acceptDeadline && ex.acceptDeadline < new Date()) throw new Error("This proposal has expired.");
    const ps = await tx.select().from(parties).where(eq(parties.exchangeId, exchangeId));
    const mine = ps.find((p) => p.userId === userId);
    if (!mine) throw new Error("Not your exchange.");
    await tx.update(parties).set({ acceptedAt: new Date() }).where(eq(parties.id, mine.id));
    await audit(userId, "proposal.accept", "exchange", exchangeId, null, tx);
    const bothAccepted = ps.every((p) => p.id === mine.id || p.acceptedAt);
    if (bothAccepted) await lockExchange(tx, exchangeId, ps);
  });
}

async function lockExchange(tx: Tx, exchangeId: number, ps: (typeof parties.$inferSelect)[]) {
  for (const p of ps) {
    const other = ps.find((o) => o.id !== p.id)!;
    const [it] = await tx.select().from(items).where(eq(items.id, p.sendItemId));
    const [to] = await tx.select().from(users).where(eq(users.id, other.userId));
    const actual = postageCents(packOf(it), it.shipFromZip, to.zip ?? undefined);
    await tx
      .update(parties)
      .set({
        actualPostageCents: actual,
        labelCarrier: "TEST",
        trackingNumber: `TEST-${exchangeId}-${p.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      })
      .where(eq(parties.id, p.id));
    await refundPostage(tx, p.userId, it.id, it.postageHeldCents - actual, `diff:ex${exchangeId}`);
    await tx.update(items).set({ status: "locked" }).where(eq(items.id, it.id));
  }
  await tx.update(exchanges).set({ status: "locked", lockedAt: new Date() }).where(eq(exchanges.id, exchangeId));
  await audit(null, "exchange.lock", "exchange", exchangeId, null, tx);
}

// ---------- Fulfillment ----------

export async function markPickedUp(partyId: number, actorId: number) {
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(parties).where(eq(parties.id, partyId)).for("update");
    if (!p || p.pickedUpAt) return; // duplicate scans never advance twice
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, p.exchangeId)).for("update");
    if (ex.status !== "locked") return;
    const now = new Date();
    await tx.update(parties).set({ pickedUpAt: now }).where(eq(parties.id, partyId));
    const late = ex.lockedAt && now.getTime() - ex.lockedAt.getTime() > SHIP_WINDOW_DAYS * 864e5;
    await addReputation(p.userId, late ? "late_pickup" : "on_time_pickup", ex.id, tx);
    if (p.packingPhotoId) await addReputation(p.userId, "packing_photo", ex.id, tx);
    const ps = await tx.select().from(parties).where(eq(parties.exchangeId, ex.id));
    if (ps.every((x) => x.pickedUpAt)) await tx.update(exchanges).set({ status: "in_transit" }).where(eq(exchanges.id, ex.id));
    await audit(actorId, "shipment.pickup", "exchange_party", partyId, null, tx);
  });
}

export async function confirmReceipt(exchangeId: number, userId: number) {
  await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, exchangeId)).for("update");
    if (!ex || ex.status !== "in_transit") throw new Error("Both packages need a carrier scan first.");
    const ps = await tx.select().from(parties).where(eq(parties.exchangeId, exchangeId));
    const mine = ps.find((p) => p.userId === userId);
    if (!mine) throw new Error("Not your exchange.");
    if (!mine.receivedAt) await tx.update(parties).set({ receivedAt: new Date() }).where(eq(parties.id, mine.id));
    const all = ps.every((p) => p.id === mine.id || p.receivedAt);
    const [open] = await tx
      .select({ id: disputes.id })
      .from(disputes)
      .where(and(eq(disputes.exchangeId, exchangeId), eq(disputes.status, "open")));
    if (all && !open) await completeExchange(tx, ex.id, ps);
    await audit(userId, "receipt.confirm", "exchange", exchangeId, null, tx);
  });
}

async function completeExchange(tx: Tx, exchangeId: number, ps: (typeof parties.$inferSelect)[]) {
  await tx.update(exchanges).set({ status: "completed", completedAt: new Date() }).where(eq(exchanges.id, exchangeId));
  for (const p of ps) {
    await tx.update(items).set({ status: "exchanged" }).where(eq(items.id, p.sendItemId));
    await addReputation(p.userId, "completed", exchangeId, tx);
  }
  await releaseLocks(tx, exchangeId);
}

export async function submitReview(
  exchangeId: number,
  userId: number,
  r: { matchesDescription: boolean; packaging: number; enjoyment: number; comment: string },
) {
  const ps = await db.select().from(parties).where(eq(parties.exchangeId, exchangeId));
  const mine = ps.find((p) => p.userId === userId);
  const other = ps.find((p) => p.userId !== userId);
  if (!mine || !other) throw new Error("Not your exchange.");
  if (!mine.receivedAt) throw new Error("Confirm you received the package first.");
  await db
    .insert(reviews)
    .values({ exchangeId, reviewerId: userId, revieweeId: other.userId, ...r })
    .onConflictDoNothing();
  const all = await db.select().from(reviews).where(eq(reviews.exchangeId, exchangeId));
  if (all.length === 2) await publishReviews(exchangeId);
}

// Double-blind: nobody sees a review, and no reputation moves, until both are
// in or the window closes.
export async function publishReviews(exchangeId: number) {
  await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, exchangeId)).for("update");
    if (!ex || ex.reviewsPublishedAt) return;
    const rs = await tx.select().from(reviews).where(eq(reviews.exchangeId, exchangeId));
    for (const r of rs) {
      await addReputation(r.revieweeId, r.matchesDescription ? "review_matches" : "review_mismatch", exchangeId, tx);
    }
    await tx.update(exchanges).set({ reviewsPublishedAt: new Date() }).where(eq(exchanges.id, exchangeId));
  });
}

export async function openDispute(
  exchangeId: number,
  userId: number,
  d: { reason: string; details: string; lostOption?: string },
) {
  await db.transaction(async (tx) => {
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, exchangeId)).for("update");
    if (!ex || !["locked", "in_transit", "completed"].includes(ex.status)) throw new Error("A report can't be filed at this stage.");
    const ps = await tx.select().from(parties).where(eq(parties.exchangeId, exchangeId));
    if (!ps.some((p) => p.userId === userId)) throw new Error("Not your exchange.");
    await tx.insert(disputes).values({ exchangeId, openedBy: userId, ...d });
    if (ex.status !== "completed") await tx.update(exchanges).set({ status: "disputed" }).where(eq(exchanges.id, exchangeId));
    await audit(userId, "dispute.open", "exchange", exchangeId, d, tx);
  });
}

export async function resolveDispute(
  disputeId: number,
  adminId: number,
  resolution: string,
  fraudUserId: number | null,
) {
  await db.transaction(async (tx) => {
    const [d] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).for("update");
    if (!d || d.status !== "open") return;
    await tx
      .update(disputes)
      .set({ status: "resolved", resolution, fraudConfirmedUserId: fraudUserId, resolvedAt: new Date() })
      .where(eq(disputes.id, disputeId));
    const [ex] = await tx.select().from(exchanges).where(eq(exchanges.id, d.exchangeId));
    if (ex.status === "disputed") {
      await tx.update(exchanges).set({ status: "resolved" }).where(eq(exchanges.id, ex.id));
      const ps = await tx.select().from(parties).where(eq(parties.exchangeId, ex.id));
      for (const p of ps) await tx.update(items).set({ status: "exchanged" }).where(eq(items.id, p.sendItemId));
      await releaseLocks(tx, ex.id);
    }
    if (fraudUserId) {
      await addReputation(fraudUserId, "fraud_confirmed", ex.id, tx);
      const rep = await getReputation(fraudUserId, tx);
      if (rep.fraud >= SUSPEND_AFTER_FRAUD) await tx.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, fraudUserId));
    }
    await audit(adminId, "dispute.resolve", "dispute", disputeId, { resolution, fraudUserId }, tx);
  });
}

// ---------- Views ----------

// What one side may see about the other side's item BEFORE the swap is done.
export function blindView(it: typeof items.$inferSelect, v: typeof valuations.$inferSelect) {
  return {
    category: it.platform ? `${categoryLabel(it.category)} · ${platformLabel(it.platform)}` : categoryLabel(it.category),
    valueRange: [v.lowCents, v.highCents] as const,
    condition: conditionLabel(it.condition),
  };
}

export async function exchangeForUser(exchangeId: number, userId: number) {
  const [ex] = await db.select().from(exchanges).where(eq(exchanges.id, exchangeId));
  if (!ex || ex.status === "draft") return null;
  const ps = await db.select().from(parties).where(eq(parties.exchangeId, exchangeId));
  const mine = ps.find((p) => p.userId === userId);
  const theirs = ps.find((p) => p.userId !== userId);
  if (!mine || !theirs) return null;
  const [myItem] = await db.select().from(items).where(eq(items.id, mine.sendItemId));
  const [theirItem] = await db.select().from(items).where(eq(items.id, theirs.sendItemId));
  const [theirVal] = await db.select().from(valuations).where(eq(valuations.id, theirs.valuationId));
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  const [them] = await db.select().from(users).where(eq(users.id, theirs.userId));
  const revealed = ["completed", "resolved"].includes(ex.status) || !!mine.receivedAt;
  const myReview = (
    await db.select().from(reviews).where(and(eq(reviews.exchangeId, exchangeId), eq(reviews.reviewerId, userId)))
  )[0];
  const theirReview = ex.reviewsPublishedAt
    ? (await db.select().from(reviews).where(and(eq(reviews.exchangeId, exchangeId), eq(reviews.reviewerId, theirs.userId))))[0]
    : undefined;
  const ds = await db.select().from(disputes).where(eq(disputes.exchangeId, exchangeId));
  return {
    ex,
    mine,
    theirs: { acceptedAt: theirs.acceptedAt, pickedUpAt: theirs.pickedUpAt, receivedAt: theirs.receivedAt },
    myItem,
    me,
    blind: blindView(theirItem, theirVal),
    // Only after the receiver has the package in hand.
    reveal: revealed
      ? {
          item: theirItem,
          sender: { displayName: them.displayName, bio: them.bio, interests: them.interests },
          theirReview,
        }
      : null,
    myReview,
    disputes: ds,
  };
}

