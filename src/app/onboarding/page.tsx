import { requireUser } from "@/lib/auth";
import { CATEGORIES, PLATFORMS } from "@/lib/config";
import { ProfileForm } from "@/components/ProfileForm";

export default async function Page() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1>Set up your swaps</h1>
        <p className="mt-1 text-ink/70">Tell us what you'd love to unbox — and what you never want to see.</p>
      </div>
      <ProfileForm user={user} categories={CATEGORIES.map(({ id, label }) => ({ id, label }))} platforms={PLATFORMS.map(({ id, label }) => ({ id, label }))} onboarding />
    </div>
  );
}
