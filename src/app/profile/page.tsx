import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/config";
import { ProfileForm } from "@/components/ProfileForm";

export default async function Page() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1>Profile & preferences</h1>
      <ProfileForm user={user} categories={CATEGORIES.map(({ id, label }) => ({ id, label }))} onboarding={!user.rulesAcceptedAt} />
    </div>
  );
}
