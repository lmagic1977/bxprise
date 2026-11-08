import "server-only";
import { Facebook, Google } from "arctic";

export type Provider = "google" | "facebook";

const base = () => (process.env.APP_URL ?? "https://bxprise.com").replace(/\/$/, "");
const redirect = (p: Provider) => `${base()}/api/auth/${p}/callback`;

export function enabledProviders(): Provider[] {
  const out: Provider[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) out.push("google");
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) out.push("facebook");
  return out;
}

export const google = () => new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirect("google"));
export const facebook = () => new Facebook(process.env.FACEBOOK_APP_ID!, process.env.FACEBOOK_APP_SECRET!, redirect("facebook"));

export type Profile = { id: string; email: string | null; emailVerified: boolean; name: string };
