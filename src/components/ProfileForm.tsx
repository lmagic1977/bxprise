"use client";
import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions/auth";
import { keepOnSubmit } from "./keepForm";

type Cat = { id: string; label: string };
type U = {
  displayName: string; addressName: string | null; addressLine1: string | null; addressLine2: string | null;
  city: string | null; state: string | null; zip: string | null; bio: string | null; interests: string | null;
  exclusions: string | null; wantedCategories: string[]; platforms: string[]; interestTags: string[]; interestOther: Record<string, string>; showInFeed: boolean;
};

export function ProfileForm({ user, categories, platforms, interestTags, onboarding }: {
  user: U; categories: Cat[]; platforms: Cat[]; interestTags: Record<string, string[]>; onboarding?: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const [wanted, setWanted] = useState<string[]>(user.wantedCategories);
  const [tags, setTags] = useState<string[]>(user.interestTags);
  const [otherOpen, setOtherOpen] = useState<string[]>(Object.keys(user.interestOther ?? {}));
  const shown = categories.filter((c) => wanted.length === 0 || wanted.includes(c.id));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const v = (k: keyof U) => (user[k] as string | null) ?? "";
  return (
    <form onSubmit={keepOnSubmit(action)} className="space-y-6">
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <section className="card space-y-4">
        <h2>What you'd like to get</h2>
        <fieldset>
          <legend className="field-label">Categories you're happy to receive</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-plum has-[:checked]:bg-plum-soft">
                <input type="checkbox" name="wanted" value={c.id} checked={wanted.includes(c.id)} onChange={() => setWanted((w) => toggle(w, c.id))} className="accent-plum" />
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
        <fieldset>
          <legend className="field-label">Your interests <span className="font-normal text-ink/50">— tap all that fit</span></legend>
          <div className="space-y-3">
            {shown.map((c) => (
              <div key={c.id}>
                <p className="mb-1 text-xs font-medium text-ink/60">{c.label}</p>
                <div className="flex flex-wrap gap-2">
                  {(interestTags[c.id] ?? []).map((t) => (
                    <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => setTags((x) => toggle(x, t))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${tags.includes(t) ? "border-plum bg-plum text-white" : "border-ink/15 bg-white hover:border-plum/50"}`}>
                      {t}
                    </button>
                  ))}
                  <button type="button" aria-pressed={otherOpen.includes(c.id)} onClick={() => setOtherOpen((x) => toggle(x, c.id))}
                    className={`rounded-full border border-dashed px-3 py-1.5 text-sm transition ${otherOpen.includes(c.id) ? "border-plum bg-plum text-white" : "border-ink/30 bg-white hover:border-plum/50"}`}>
                    Other…
                  </button>
                </div>
                {otherOpen.includes(c.id) && (
                  <input className="input mt-2" name={`other_${c.id}`} defaultValue={user.interestOther?.[c.id] ?? ""} maxLength={100}
                    placeholder={`Other ${c.label.split(" (")[0].toLowerCase()} you like`} autoFocus={!user.interestOther?.[c.id]} />
                )}
              </div>
            ))}
          </div>
          {tags.map((t) => <input key={t} type="hidden" name="interestTags" value={t} />)}

        </fieldset>
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
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="showInFeed" defaultChecked={user.showInFeed} className="accent-plum" />
          <span>Show my first name, city and item category in the homepage &ldquo;Recent boxes&rdquo; feed when I submit a box (never your address, photos or item details).</span>
        </label>
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
