import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, isAdminEmail } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enabledProviders, facebook, google, type Profile, type Provider } from "@/lib/oauth";

const back = (req: Request, path: string) => Response.redirect(new URL(path, req.url).toString(), 302);
const fail = (req: Request, reason: string) => back(req, `/login?oauth_error=${encodeURIComponent(reason)}`);

async function profileFor(provider: Provider, code: string, verifier: string | undefined): Promise<Profile> {
  if (provider === "google") {
    const tokens = await google().validateAuthorizationCode(code, verifier ?? "");
    const c = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
    return { id: c.sub, email: c.email?.toLowerCase() ?? null, emailVerified: !!c.email_verified, name: c.name ?? "" };
  }
  const tokens = await facebook().validateAuthorizationCode(code);
  const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokens.accessToken())}`);
  if (!res.ok) throw new Error("facebook profile");
  const p = (await res.json()) as { id: string; name?: string; email?: string };
  // Facebook only returns an email it has confirmed.
  return { id: p.id, email: p.email?.toLowerCase() ?? null, emailVerified: !!p.email, name: p.name ?? "" };
}

export async function GET(req: Request, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const provider = (await ctx.params).provider as Provider;
  if (!enabledProviders().includes(provider)) return new Response("Not available", { status: 404 });
  const url = new URL(req.url);
  const store = await cookies();
  const expected = store.get(`oauth_state_${provider}`)?.value;
  const verifier = store.get("oauth_verifier_google")?.value;
  store.delete(`oauth_state_${provider}`);
  store.delete("oauth_verifier_google");
  if (url.searchParams.get("error")) return fail(req, "Sign-in was cancelled.");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return fail(req, "Sign-in expired. Please try again.");

  let p: Profile;
  try {
    p = await profileFor(provider, code, verifier);
  } catch {
    return fail(req, "Couldn't sign you in. Please try again.");
  }

  const { users, oauthAccounts } = schema;
  // 1) Known identity → that user.
  const [linked] = await db.select().from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, p.id)));
  let userId = linked?.userId;
  let isNew = false;

  if (!userId) {
    if (!p.email || !p.emailVerified)
      return fail(req, `Your ${provider === "google" ? "Google" : "Facebook"} account didn't share a verified email. Sign up with email instead.`);
    // 2) Same verified email as an existing account → link it.
    const [byEmail] = await db.select().from(users).where(eq(users.email, p.email));
    if (byEmail) {
      userId = byEmail.id;
    } else {
      // 3) New member.
      const [u] = await db.insert(users).values({
        email: p.email,
        passwordHash: null,
        displayName: (p.name.split(" ")[0] || "Swapper").slice(0, 40),
        role: isAdminEmail(p.email) ? "admin" : "user",
      }).returning();
      userId = u.id;
      isNew = true;
      await audit(u.id, "user.signup", "user", u.id, { via: provider });
    }
    await db.insert(oauthAccounts).values({ provider, providerUserId: p.id, userId }).onConflictDoNothing();
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  await createSession(user.id);
  await audit(user.id, "user.login", "user", user.id, { via: provider });
  if (isNew || !user.rulesAcceptedAt) return back(req, "/onboarding");
  return back(req, user.role === "admin" ? "/admin" : "/dashboard");
}
