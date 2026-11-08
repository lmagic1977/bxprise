import { AuthForm } from "@/components/AuthForm";
import { enabledProviders } from "@/lib/oauth";

export default async function Page({ searchParams }: PageProps<"/login">) {
  const err = (await searchParams).oauth_error;
  return <AuthForm mode="login" providers={enabledProviders()} oauthError={typeof err === "string" ? err.slice(0, 200) : undefined} />;
}
