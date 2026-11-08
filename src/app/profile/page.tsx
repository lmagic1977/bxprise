import { requireUser } from "@/lib/auth";
import { CATEGORIES, PLATFORMS } from "@/lib/config";
import { ProfileForm } from "@/components/ProfileForm";
import { ActionButton } from "@/components/ActionButton";
import { requestDeletion } from "@/app/actions/auth";

export default async function Page() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1>Profile & preferences</h1>
      <ProfileForm user={user} categories={CATEGORIES.map(({ id, label }) => ({ id, label }))} platforms={PLATFORMS.map(({ id, label }) => ({ id, label }))} onboarding={!user.rulesAcceptedAt} />
      <section className="card space-y-2 text-sm">
        <h2>Delete your account</h2>
        {user.deletionRequestedAt ? <p>Deletion requested on {user.deletionRequestedAt.toLocaleDateString("en-US")}. We&apos;ll finish any shipping swap first.</p> : (
          <ActionButton action={requestDeletion} className="btn-danger" confirm="Request deletion of your BXprise account and data?">Request account deletion</ActionButton>
        )}
      </section>
    </div>
  );
}
