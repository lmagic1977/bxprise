"use client";
import { useActionState, useState } from "react";
import { createItem } from "@/app/actions/items";
import { PhotoInput } from "./PhotoInput";
import { keepOnSubmit } from "./keepForm";

type Opt = { id: string; label: string };
export type Prefill = Partial<{
  title: string; category: string; brand: string; platform: string; condition: string; description: string; functionNote: string;
  weightLb: number; weightOzPart: number; d1: number; d2: number; d3: number; repooledFrom: number;
}>;

export function ItemForm({ categories, conditions, platforms, bundleHints, limits, prefill = {} }: {
  categories: Opt[]; conditions: Opt[]; platforms: Opt[]; bundleHints: Record<string, string>;
  limits: { lb: number; dims: number[] }; prefill?: Prefill;
}) {
  const [state, action, pending] = useActionState(createItem, undefined);
  const [category, setCategory] = useState(prefill.category ?? "");
  return (
    <form onSubmit={keepOnSubmit(action)} className="space-y-6">
      {prefill.repooledFrom && <input type="hidden" name="repooledFrom" value={prefill.repooledFrom} />}
      <section className="card space-y-4">
        <h2>The item</h2>
        <div><label className="field-label" htmlFor="title">Name</label>
          <input className="input" id="title" name="title" required defaultValue={prefill.title} placeholder="e.g. Wingspan + European expansion" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="category">Category</label>
            <select className="input" id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          <div><label className="field-label" htmlFor="brand">Brand / model (optional)</label>
            <input className="input" id="brand" name="brand" defaultValue={prefill.brand} /></div>
        </div>
        {bundleHints[category] && <p className="rounded-xl bg-tangerine-soft p-3 text-sm text-orange-900">{bundleHints[category]}</p>}
        {category === "video_games" && (
          <div><label className="field-label" htmlFor="platform">Platform</label>
            <select className="input" id="platform" name="platform" required defaultValue={prefill.platform ?? ""}>
              <option value="" disabled>Choose…</option>
              {platforms.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <p className="hint">Only people who own this platform will be matched with it.</p></div>
        )}
        <div><label className="field-label" htmlFor="condition">Condition</label>
          <select className="input" id="condition" name="condition" required defaultValue={prefill.condition ?? ""}>
            <option value="" disabled>Choose…</option>
            {conditions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div><label className="field-label" htmlFor="description">Description</label>
          <textarea className="input" id="description" name="description" rows={3} required defaultValue={prefill.description}
            placeholder="What it is, what's included, how much it was used." /></div>
        <div><label className="field-label" htmlFor="functionNote">How did you check it's complete and working?</label>
          <textarea className="input" id="functionNote" name="functionNote" rows={2} required defaultValue={prefill.functionNote}
            placeholder="e.g. Counted all 170 cards and every token; played it last month." /></div>
        <div><label className="field-label" htmlFor="wearNote">Any wear or marks? (optional)</label>
          <input className="input" id="wearNote" name="wearNote" placeholder="e.g. Box corner slightly dented" /></div>
      </section>

      <section className="card space-y-4">
        <h2>Photos</h2>
        <PhotoInput name="photos" label="3–6 photos from different angles, including all parts" />
        <p className="hint">Only our team sees these until the swap is done. Location data is removed.</p>
      </section>

      <section className="card space-y-4">
        <h2>Packed size & weight</h2>
        <p className="hint !mt-0">Measure the box as you'll ship it. Max {limits.lb} lb and {limits.dims.join(" × ")} in.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label" htmlFor="weightLb">Weight (lb)</label>
            <input className="input" id="weightLb" name="weightLb" type="number" min={0} max={limits.lb} step={1} required defaultValue={prefill.weightLb} /></div>
          <div><label className="field-label" htmlFor="weightOzPart">+ oz</label>
            <input className="input" id="weightOzPart" name="weightOzPart" type="number" min={0} max={15.9} step={0.1} defaultValue={prefill.weightOzPart ?? 0} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["d1", "d2", "d3"] as const).map((k, i) => (
            <div key={k}><label className="field-label" htmlFor={k}>{["Length", "Width", "Height"][i]} (in)</label>
              <input className="input" id={k} name={k} type="number" min={0.5} step={0.5} required defaultValue={prefill[k]} /></div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <h2>A note for whoever opens it (optional)</h2>
        <textarea className="input" name="story" rows={3} maxLength={500}
          placeholder="Why you loved it, a tip, or a little hello. Revealed after they unbox — and we'd love a handwritten card in the box too." />
      </section>

      <section className="card space-y-3 text-sm">
        <label className="flex gap-2"><input type="checkbox" name="accessoriesComplete" className="accent-plum" /> All parts and pieces are included.</label>
        <label className="flex gap-2"><input type="checkbox" name="worksConfirm" className="accent-plum" /> It works fully and my description is accurate.</label>
        <p className="text-ink/70">Submitting charges your postage for this box (farthest-zone estimate). You get the difference back once matched, or the full amount if you withdraw.</p>
      </section>

      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="btn-accent" disabled={pending}>{pending ? "Uploading…" : "Submit & pay postage"}</button>
    </form>
  );
}
