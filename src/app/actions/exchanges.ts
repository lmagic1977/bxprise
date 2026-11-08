"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { TEST_MODE } from "@/lib/config";
import { saveImage } from "@/lib/storage";
import {
  confirmReceipt,
  markPickedUp,
  openDispute,
  respondToProposal,
  submitReview,
} from "@/lib/exchange";
import type { FormState } from "./auth";

const path = (id: number) => `/exchanges/${id}`;

async function myParty(exchangeId: number) {
  const user = await requireOnboardedUser();
  const [p] = await db
    .select()
    .from(schema.exchangeParties)
    .where(and(eq(schema.exchangeParties.exchangeId, exchangeId), eq(schema.exchangeParties.userId, user.id)));
  if (!p) throw new Error("Not your exchange.");
  return { user, p };
}

function wrap(fn: () => Promise<unknown>, exchangeId: number, ok: string): Promise<FormState> {
  return fn()
    .then(() => {
      revalidatePath(path(exchangeId));
      return { ok };
    })
    .catch((e: Error) => ({ error: e.message }));
}

export async function respond(exchangeId: number, accept: boolean): Promise<FormState> {
  const { user } = await myParty(exchangeId);
  return wrap(() => respondToProposal(exchangeId, user.id, accept), exchangeId, accept ? "Accepted!" : "Declined. Your item is back in the pool.");
}

export async function uploadPackingPhoto(exchangeId: number, _: FormState, fd: FormData): Promise<FormState> {
  const { user, p } = await myParty(exchangeId);
  const f = fd.get("photo");
  if (!(f instanceof File) || f.size === 0) return { error: "Choose a photo." };
  try {
    const id = await saveImage(f, user.id, "packing");
    await db.update(schema.exchangeParties).set({ packingPhotoId: id }).where(eq(schema.exchangeParties.id, p.id));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(path(exchangeId));
  return { ok: "Packing photo saved." };
}

// Only available while no real carrier is connected.
export async function simulatePickup(exchangeId: number): Promise<FormState> {
  if (!TEST_MODE) return { error: "Not available." };
  const { user, p } = await myParty(exchangeId);
  return wrap(() => markPickedUp(p.id, user.id), exchangeId, "Simulated carrier scan recorded.");
}

export async function receive(exchangeId: number): Promise<FormState> {
  const { user } = await myParty(exchangeId);
  return wrap(() => confirmReceipt(exchangeId, user.id), exchangeId, "Enjoy your surprise!");
}

const reviewSchema = z.object({
  matches: z.enum(["yes", "no"], { message: "Tell us if it matched the description." }),
  packaging: z.coerce.number().int().min(1).max(5),
  enjoyment: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export async function review(exchangeId: number, _: FormState, fd: FormData): Promise<FormState> {
  const { user } = await myParty(exchangeId);
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const r = parsed.data;
  return wrap(
    () => submitReview(exchangeId, user.id, { matchesDescription: r.matches === "yes", packaging: r.packaging, enjoyment: r.enjoyment, comment: r.comment ?? "" }),
    exchangeId,
    "Thanks! Reviews are revealed when both are in.",
  );
}

const disputeSchema = z.object({
  reason: z.enum(["not_as_described", "lost", "damaged", "other"]),
  details: z.string().trim().min(10, "Describe what happened (10+ characters).").max(1000),
  lostOption: z.enum(["return", "let_go", "insurance"]).optional(),
});

export async function report(exchangeId: number, _: FormState, fd: FormData): Promise<FormState> {
  const { user } = await myParty(exchangeId);
  const parsed = disputeSchema.safeParse(Object.fromEntries([...fd].filter(([, v]) => v !== "")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.reason === "lost" && !parsed.data.lostOption) return { error: "Choose what you'd like to happen." };
  return wrap(() => openDispute(exchangeId, user.id, parsed.data), exchangeId, "Report sent. Our team will follow up.");
}

export async function guess(exchangeId: number, _: FormState, fd: FormData): Promise<FormState> {
  const { p } = await myParty(exchangeId);
  if (p.receivedAt) return { error: "Too late — you've already opened it!" };
  const g = String(fd.get("guess") ?? "").trim().slice(0, 100);
  if (g.length < 2) return { error: "Type your guess." };
  await db.update(schema.exchangeParties).set({ guess: g }).where(eq(schema.exchangeParties.id, p.id));
  revalidatePath(path(exchangeId));
  return { ok: "Guess locked in. We'll reveal it when you open the box." };
}
