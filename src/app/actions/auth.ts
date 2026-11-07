"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  createSession,
  destroySession,
  hashPassword,
  isAdminEmail,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { CATEGORIES } from "@/lib/config";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; ok?: string } | undefined;

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = credentials.extend({ displayName: z.string().trim().min(2, "Pick a nickname (2+ characters).").max(40) }).safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
    displayName: fd.get("displayName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, displayName } = parsed.data;
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (exists) return { error: "An account with this email already exists." };
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: isAdminEmail(email) ? "admin" : "user",
    })
    .returning();
  await audit(user.id, "user.signup", "user", user.id);
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Email or password is incorrect." };
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email));
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "Email or password is incorrect." };
  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  addressName: z.string().trim().min(2, "Enter the name for the shipping label."),
  addressLine1: z.string().trim().min(3, "Enter your street address."),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter your city."),
  state: z.string().trim().length(2, "Use the 2-letter state code.").toUpperCase(),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  bio: z.string().trim().max(300).optional(),
  interests: z.string().trim().max(300).optional(),
  exclusions: z.string().trim().max(300).optional(),
});

export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const onboarding = fd.get("onboarding") === "1";
  if (onboarding && (fd.get("age") !== "on" || fd.get("rules") !== "on"))
    return { error: "Please confirm you are 18+ and agree to the swap rules." };
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const wanted = fd.getAll("wanted").map(String).filter((c) => CATEGORIES.some((x) => x.id === c));
  await db
    .update(schema.users)
    .set({
      ...parsed.data,
      wantedCategories: wanted,
      ...(onboarding ? { ageConfirmed: true, rulesAcceptedAt: new Date() } : {}),
    })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  if (onboarding) redirect("/dashboard");
  return { ok: "Saved." };
}
