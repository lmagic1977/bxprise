import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { enabledProviders, facebook, google, type Provider } from "@/lib/oauth";

export async function GET(_req: Request, ctx: RouteContext<"/api/auth/[provider]/start">) {
  const provider = (await ctx.params).provider as Provider;
  if (!enabledProviders().includes(provider)) return new Response("Not available", { status: 404 });
  const state = generateState();
  const store = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  store.set(`oauth_state_${provider}`, state, opts);
  let url: URL;
  if (provider === "google") {
    const verifier = generateCodeVerifier();
    store.set("oauth_verifier_google", verifier, opts);
    url = google().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
    url.searchParams.set("prompt", "select_account");
  } else {
    url = facebook().createAuthorizationURL(state, ["email", "public_profile"]);
  }
  return Response.redirect(url.toString(), 302);
}
