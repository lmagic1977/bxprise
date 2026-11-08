"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { CATEGORIES, CONDITIONS, MAX_PHOTOS, MIN_PHOTOS, NEEDS_PLATFORM, PLATFORMS, TIERS } from "@/lib/config";
import { checkPackLimits, postageCents, sortDims } from "@/lib/postage";
import { saveImage } from "@/lib/storage";
import { chargePostage, latestValuation, refundPostage } from "@/lib/exchange";
import { getReputation, tierOfValue, tierRank } from "@/lib/reputation";
import { audit } from "@/lib/audit";
import type { FormState } from "./auth";
import { suggestionSchema } from "@/lib/identify-types";

const itemSchema = z.object({
  title: z.string().trim().min(3, "Give your item a name.").max(100),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], { message: "Pick a category." }),
  brand: z.string().trim().max(80).optional(),
  platform: z.string().optional(),
  condition: z.enum(CONDITIONS.map((c) => c.id) as [string, ...string[]], { message: "Pick a condition." }),
  description: z.string().trim().min(10, "Describe the item (10+ characters).").max(1000),
  functionNote: z.string().trim().min(3, "Tell us how you checked it works / is complete.").max(500),
  wearNote: z.string().trim().max(300).optional(),
  story: z.string().trim().max(500).optional(),
  weightLb: z.coerce.number().min(0),
  weightOzPart: z.coerce.number().min(0).max(15.99),
  d1: z.coerce.number(),
  d2: z.coerce.number(),
  d3: z.coerce.number(),
});

export async function createItem(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireOnboardedUser();
  if (user.suspendedAt) return { error: "Your account is suspended." };
  const parsed = itemSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (fd.get("accessoriesComplete") !== "on") return { error: "Only complete items with all parts can be swapped." };
  if (fd.get("worksConfirm") !== "on") return { error: "Please confirm the item works and is as described." };

  const platform = d.category === NEEDS_PLATFORM ? d.platform : null;
  if (d.category === NEEDS_PLATFORM && !PLATFORMS.some((p) => p.id === platform)) return { error: "Pick the game's platform." };
  const weightOz = d.weightLb * 16 + d.weightOzPart;
  const dims = sortDims(d.d1, d.d2, d.d3);
  const packErr = checkPackLimits({ weightOz, dims });
  if (packErr) return { error: packErr };

  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length < MIN_PHOTOS) return { error: `Add at least ${MIN_PHOTOS} photos from different angles.` };
  if (photos.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos.` };

  let photoIds: string[];
  try {
    photoIds = [];
    for (const p of photos) photoIds.push(await saveImage(p, user.id, "item"));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const held = postageCents({ weightOz, dims }, user.zip!);
  let aiSuggestion = null;
  try {
    const raw = String(fd.get("aiSuggestion") ?? "");
    if (raw && raw.length < 20000) aiSuggestion = suggestionSchema.parse(JSON.parse(raw));
  } catch { aiSuggestion = null; }
  const repooledFrom = Number(fd.get("repooledFrom")) || null;
  const itemId = await db.transaction(async (tx) => {
    const [it] = await tx
      .insert(schema.items)
      .values({
        ownerId: user.id,
        title: d.title,
        category: d.category,
        brand: d.brand || null,
        platform,
        condition: d.condition,
        description: d.description,
        functionNote: d.functionNote,
        accessoriesComplete: true,
        wearNote: d.wearNote || null,
        story: d.story || null,
        weightOz,
        lengthIn: dims[0],
        widthIn: dims[1],
        heightIn: dims[2],
        shipFromZip: user.zip!,
        photoIds,
        postageHeldCents: held,
        repooledFromExchangeId: repooledFrom,
        aiSuggestion,
      })
      .returning();
    await chargePostage(tx, user.id, it.id, held);
    await audit(user.id, "item.create", "item", it.id, { held }, tx);
    return it.id;
  });
  redirect(`/items/${itemId}?new=1`);
}

async function ownItem(itemId: number) {
  const user = await requireOnboardedUser();
  const [it] = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, user.id)));
  if (!it) throw new Error("Item not found.");
  return { user, it };
}

export async function acceptValuation(itemId: number, valuationId: number): Promise<FormState> {
  const { user, it } = await ownItem(itemId);
  const v = await latestValuation(itemId);
  if (!v || v.id !== valuationId || it.status !== "valuation_ready")
    return { error: "This valuation has changed. Please review the latest one." };
  const tier = tierOfValue(v.midCents);
  const rep = await getReputation(user.id);
  if (!tier) {
    const max = TIERS.at(-1)!.maxCents;
    return { error: v.midCents < TIERS[0].minCents ? "This item is below the minimum value for swaps. You can withdraw it for a full postage refund." : `Items above ${max / 100} dollars aren't open yet.` };
  }
  if (tierRank(tier) > tierRank(rep.tier))
    return { error: `This item is in the ${TIERS[tierRank(tier)].label} tier, which unlocks after ${TIERS[tierRank(tier)].minCompleted} good swaps.` };
  await db.transaction(async (tx) => {
    await tx.update(schema.valuations).set({ acceptedAt: new Date() }).where(eq(schema.valuations.id, v.id));
    await tx.update(schema.items).set({ status: "in_pool", pooledAt: new Date() }).where(eq(schema.items.id, itemId));
    await audit(user.id, "valuation.accept", "item", itemId, { valuationId: v.id }, tx);
  });
  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}?pooled=1`);
}

export async function requestReview(itemId: number, fd: FormData) {
  const { user, it } = await ownItem(itemId);
  if (it.status !== "valuation_ready") return;
  const note = String(fd.get("note") ?? "").slice(0, 500);
  await db.update(schema.items).set({ status: "pending_review", adminNote: `Owner asked for a re-check: ${note}` }).where(eq(schema.items.id, itemId));
  await audit(user.id, "valuation.dispute", "item", itemId, { note });
  revalidatePath(`/items/${itemId}`);
}

export async function setPaused(itemId: number, paused: boolean) {
  const { user, it } = await ownItem(itemId);
  if (paused && it.status === "in_pool") await db.update(schema.items).set({ status: "paused" }).where(eq(schema.items.id, itemId));
  if (!paused && it.status === "paused") await db.update(schema.items).set({ status: "in_pool" }).where(eq(schema.items.id, itemId));
  await audit(user.id, paused ? "item.pause" : "item.resume", "item", itemId);
  revalidatePath(`/items/${itemId}`);
}

export async function withdrawItem(itemId: number) {
  const { user, it } = await ownItem(itemId);
  if (!["pending_review", "needs_info", "valuation_ready", "in_pool", "paused"].includes(it.status)) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.items).set({ status: "withdrawn" }).where(eq(schema.items.id, itemId));
    await refundPostage(tx, user.id, itemId, it.postageHeldCents, "withdraw");
    await audit(user.id, "item.withdraw", "item", itemId, null, tx);
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function addInfo(itemId: number, _: FormState, fd: FormData): Promise<FormState> {
  const { user, it } = await ownItem(itemId);
  if (it.status !== "needs_info") return { error: "Nothing is needed for this item right now." };
  const reply = String(fd.get("reply") ?? "").trim().slice(0, 500);
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!reply && photos.length === 0) return { error: "Add a reply or a photo." };
  if (it.photoIds.length + photos.length > MAX_PHOTOS + 4) return { error: "Too many photos." };
  const ids = [...it.photoIds];
  try {
    for (const p of photos) ids.push(await saveImage(p, user.id, "item"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  await db
    .update(schema.items)
    .set({ status: "pending_review", photoIds: ids, adminNote: `${it.adminNote ?? ""}\nOwner reply: ${reply}`.trim() })
    .where(eq(schema.items.id, itemId));
  await audit(user.id, "item.add_info", "item", itemId);
  revalidatePath(`/items/${itemId}`);
  return { ok: "Sent back for review." };
}
