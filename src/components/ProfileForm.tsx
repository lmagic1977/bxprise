"use client";
import { useActionState } from "react";
import { saveProfile } from "@/app/actions/auth";

type Cat = { id: string; label: string };
type U = {
  displayName: string; addressName: string | null; addressLine1: string | null; addressLine2: string | null;
  city: string | null; state: string | null; zip: string | null; bio: string | null; interests: string | null;
  exclusions: string | null; wantedCategories: string[]; platforms: string[];
};

export function ProfileForm({ user, categories, platforms, onboarding }: { user: U; categories: Cat[]; platforms: Cat[]; onboarding?: boolean }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const v = (k: keyof U) => (user[k] as string | null) ?? "";
  return (
    <form action={action} className="space-y-6">
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <section className="card space-y-4">
        <h2>What you'd like to get</h2>
        <fieldset>
          <legend className="field-label">Categories you're happy to receive</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-plum has-[:checked]:bg-plum-soft">
                <input type="checkbox" name="wanted" value={c.id} defaultChecked={user.wantedCategories.includes(c.id)} className="accent-plum" />
                {c.label}
              </label>
            ))}
          </div>
          <p className="hint">Leave all unticked to receive any open category.</p>
        </fieldset>
        <fieldset>
          <legend className="field-label">Game platforms you own</legend>
          <div className="flex flex-wrap gap-2">
            {platforms.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-plum has-[:checked]:bg-plum-soft">
                <input type="checkbox" name="platforms" value={c.id} defaultChecked={user.platforms.includes(c.id)} className="accent-plum" />
                {c.label}
              </label>
            ))}
          </div>
          <p className="hint">You'll only receive video games for platforms you tick here. Tick none to never receive games.</p>
        </fieldset>
        <div>
          <label className="field-label" htmlFor="interests">Your interests</label>
          <input className="input" id="interests" name="interests" defaultValue={v("interests")} placeholder="e.g. cozy co-op games, amigurumi, Sonny Angels" />
        </div>
        <div>
          <label className="field-label" htmlFor="exclusions">Never send me…</label>
          <input className="input" id="exclusions" name="exclusions" defaultValue={v("exclusions")} placeholder="comma-separated, e.g. wool, horror, 1000-piece" />
          <p className="hint">Matches are never made against these words, even in a blind swap.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2>About you</h2>
        <div>
          <label className="field-label" htmlFor="displayName">Nickname</label>
          <input className="input" id="displayName" name="displayName" defaultValue={v("displayName")} required />
        </div>
        <div>
          <label className="field-label" htmlFor="bio">Short intro (shown to partners after a completed swap)</label>
          <textarea className="input" id="bio" name="bio" rows={2} defaultValue={v("bio")} maxLength={300} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2>Shipping address</h2>
        <p className="hint !mt-0">Used only to make shipping labels. Never shown on your profile. Your partner will see it on the package label.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="field-label" htmlFor="addressName">Name on label</label><input className="input" id="addressName" name="addressName" defaultValue={v("addressName")} required /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="addressLine1">Street address</label><input className="input" id="addressLine1" name="addressLine1" defaultValue={v("addressLine1")} required /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="addressLine2">Apt, suite (optional)</label><input className="input" id="addressLine2" name="addressLine2" defaultValue={v("addressLine2")} /></div>
          <div><label className="field-label" htmlFor="city">City</label><input className="input" id="city" name="city" defaultValue={v("city")} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label" htmlFor="state">State</label><input className="input uppercase" id="state" name="state" maxLength={2} defaultValue={v("state")} required /></div>
            <div><label className="field-label" htmlFor="zip">ZIP</label><input className="input" id="zip" name="zip" inputMode="numeric" maxLength={5} defaultValue={v("zip")} required /></div>
          </div>
        </div>
      </section>

      {onboarding && (
        <section className="card space-y-3 text-sm">
          <label className="flex gap-2"><input type="checkbox" name="age" className="accent-plum" /> I am 18 or older and live in the United States.</label>
          <label className="flex gap-2"><input type="checkbox" name="rules" className="accent-plum" />
            <span>I agree to the <a href="/how-it-works" target="_blank" className="text-plum underline">swap rules</a>: items must be complete and working, I pay my own postage, and not liking a surprise is not grounds for a refund.</span>
          </label>
        </section>
      )}

      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{onboarding ? "Start swapping" : "Save"}</button>
    </form>
  );
}
