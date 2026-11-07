"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { discardBatch, markPickedUp, publishBatch, refundPostage, resolveDispute, runMatching } from "@/lib/exchange";
import { toCents } from "@/lib/money";
import type { FormState } from "./auth";

const valSchema = z.object({
  low: z.coerce.number().positive(),
  high: z.coerce.number().positive(),
  mid: z.coerce.number().positive(),
  basis: z.string().trim().min(5, "Say where the value comes from."),
  confidence: z.enum(["low", "medium", "high"]),
});

export async function reviewItem(itemId: number, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const decision = fd.get("decision");
  const note = String(fd.get("note") ?? "").trim();
  const [it] = await db.select().from(schema.items).where(eq(schema.items.id, itemId));
  if (!it) return { error: "Not found." };

  if (decision === "needs_info" || decision === "reject") {
    if (!note) return { error: "Write a note for the owner." };
    await db.transaction(async (tx) => {
      await tx.update(schema.items).set({ status: decision === "reject" ? "rejected" : "needs_info", adminNote: note }).where(eq(schema.items.id, itemId));
      if (decision === "reject") await refundPostage(tx, it.ownerId, itemId, it.postageHeldCents, "rejected");
      await audit(admin.id, `item.${decision}`, "item", itemId, { note }, tx);
    });
  } else {
    const p = valSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { error: p.error.issues[0].message };
    const { low, high, mid, basis, confidence } = p.data;
    if (!(low <= mid && mid <= high)) return { error: "Need low ≤ reference ≤ high." };
    const [prev] = await db.select().from(schema.valuations).where(eq(schema.valuations.itemId, itemId)).orderBy(desc(schema.valuations.version)).limit(1);
    await db.transaction(async (tx) => {
      await tx.insert(schema.valuations).values({
        itemId, version: (prev?.version ?? 0) + 1, lowCents: toCents(low), highCents: toCents(high), midCents: toCents(mid),
        basis, confidence, createdBy: admin.id,
      });
      await tx.update(schema.items).set({ status: "valuation_ready", adminNote: note || null }).where(eq(schema.items.id, itemId));
      await audit(admin.id, "valuation.create", "item", itemId, { low, high, mid, confidence }, tx);
    });
  }
  revalidatePath("/admin/items");
  redirect("/admin/items");
}

export async function createBatch(): Promise<FormState> {
  const admin = await requireAdmin();
  const r = await runMatching(admin.id);
  revalidatePath("/admin/matching");
  return r.count
    ? { ok: `Draft batch #${r.batchId}: ${r.count} pairs from ${r.poolSize} items in the pool. Review below, then publish.` }
    : { error: `No valid pairs among ${r.poolSize} items in the pool.` };
}

export async function publish(batchId: number): Promise<FormState> {
  const admin = await requireAdmin();
  const n = await publishBatch(batchId, admin.id);
  revalidatePath("/admin/matching");
  return { ok: `Published ${n} proposals.` };
}

export async function discard(batchId: number): Promise<FormState> {
  const admin = await requireAdmin();
  await discardBatch(batchId, admin.id);
  revalidatePath("/admin/matching");
  return { ok: "Discarded." };
}

export async function adminPickup(partyId: number): Promise<FormState> {
  const admin = await requireAdmin();
  await markPickedUp(partyId, admin.id);
  revalidatePath("/admin/exchanges");
  return { ok: "Recorded." };
}

export async function resolve(disputeId: number, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const resolution = String(fd.get("resolution") ?? "").trim();
  if (resolution.length < 5) return { error: "Write the resolution." };
  const fraud = Number(fd.get("fraudUserId")) || null;
  await resolveDispute(disputeId, admin.id, resolution, fraud);
  revalidatePath("/admin/disputes");
  return { ok: "Resolved." };
}
