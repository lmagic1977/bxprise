"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { AI_IDENTIFY_DAILY_LIMIT } from "@/lib/config";
import { identifyAvailable, identifyItem } from "@/lib/identify";
import type { Suggestion } from "@/lib/identify-types";

export type IdentifyResult = { error: string } | { suggestion: Suggestion };

export async function identifyPhotos(fd: FormData): Promise<IdentifyResult> {
  const user = await requireOnboardedUser();
  if (!identifyAvailable()) return { error: "AI identification isn't switched on yet." };
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.actorId, user.id), eq(schema.auditLog.action, "ai.identify"), gt(schema.auditLog.createdAt, new Date(Date.now() - 864e5))));
  if (n >= AI_IDENTIFY_DAILY_LIMIT) return { error: "Daily AI limit reached — fill the form by hand." };
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
  if (files.length === 0) return { error: "Add photos first." };
  const images = await Promise.all(
    files.map(async (f) => ({ mediaType: f.type || "image/jpeg", data: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );
  try {
    const suggestion = await identifyItem(images, String(fd.get("note") ?? "").slice(0, 300));
    await audit(user.id, "ai.identify", "user", user.id, { title: suggestion.title, confidence: suggestion.confidence });
    return { suggestion };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
