"use client";
import { useActionState, useRef, useState } from "react";
import { identifyPhotos } from "@/app/actions/ai";
import type { Suggestion } from "@/lib/identify-types";
import { createItem } from "@/app/actions/items";
import { PhotoInput } from "./PhotoInput";
import { keepOnSubmit } from "./keepForm";

type Opt = { id: string; label: string };
export type Prefill = Partial<{
  title: string; category: string; brand: string; platform: string; condition: string; description: string; functionNote: string;
  weightLb: number; weightOzPart: number; d1: number; d2: number; d3: number; repooledFrom: number;
}>;

export function ItemForm({ categories, conditions, platforms, bundleHints, limits, prefill = {}, aiEnabled = false }: {
  categories: Opt[]; conditions: Opt[]; platforms: Opt[]; bundleHints: Record<string, string>;
  limits: { lb: number; dims: number[] }; prefill?: Prefill; aiEnabled?: boolean;
}) {
  const [state, action, pending] = useActionState(createItem, undefined);
  const [category, setCategory] = useState(prefill.category ?? "");
  const [platform, setPlatform] = useState(prefill.platform ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const [ai, setAi] = useState<Suggestion | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [errSeen, setErrSeen] = useState<unknown>(null); // the error object the person has since edited past

  async function runAi() {
    const form = formRef.current!;
    const photos = form.querySelector<HTMLInputElement>('input[name="photos"]')?.files;
    if (!photos || photos.length === 0) { setAiError("Add photos first."); return; }
    const fd = new FormData();
    Array.from(photos).slice(0, 3).forEach((f) => fd.append("photos", f));
    fd.append("note", (form.elements.namedItem("title") as HTMLInputElement).value);
    setAiBusy(true); setAiError(null);
    const r = await identifyPhotos(fd);
    setAiBusy(false);
    if ("error" in r) { setAiError(r.error); return; }
    const s = r.suggestion;
    setAi(s);
    if (!s.identified) return;
    const set = (name: string, v: string | number | null | undefined) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el && v != null && v !== "") el.value = String(v);
    };
    set("title", s.title); set("brand", s.brand);
    if (s.category) setCategory(s.category);
    if (s.platform) setPlatform(s.platform);
    if (s.packedWeightOz) { set("weightLb", Math.floor(s.packedWeightOz / 16)); set("weightOzPart", s.packedWeightOz % 16); }
    if (s.packedDimsIn) { set("d1", s.packedDimsIn[0]); set("d2", s.packedDimsIn[1]); set("d3", s.packedDimsIn[2]); }
  }
  return (
    <form ref={formRef} onSubmit={keepOnSubmit(action)} onChange={() => setErrSeen(state)} className="space-y-6">
      {ai && <input type="hidden" name="aiSuggestion" value={JSON.stringify(ai)} />}
      {prefill.repooledFrom && <input type="hidden" name="repooledFrom" value={prefill.repooledFrom} />}
      <section className="card space-y-4">
        <h2>Photos</h2>
        <PhotoInput name="photos" label="3–6 photos from different angles, including all parts" />
        <p className="hint">Only our team sees these until the swap is done. Location data is removed.</p>
        {aiEnabled && (
          <div className="rounded-xl border border-plum/30 bg-plum-soft/50 p-3 text-sm">
            <button type="button" onClick={runAi} disabled={aiBusy} className="btn-primary !py-1.5">{aiBusy ? "Looking it up…" : "✨ Identify with AI"}</button>
            <p className="hint">AI names the item, fills in packed size & weight, and looks up recent used prices. Check everything before you submit.</p>
            {aiError && <p className="mt-2 text-red-700">{aiError}</p>}
            {ai && (
              <div className="mt-3 space-y-1">
                {ai.identified ? (
                  <p><b>{ai.title}</b>{ai.brand ? ` · ${ai.brand}` : ""} <span className="pill bg-white">{ai.confidence} confidence</span></p>
                ) : <p>AI couldn&apos;t tell what this is — please fill the form by hand.</p>}
                {ai.packedWeightOz || ai.packedDimsIn ? <p className="text-ink/70">Packed size & weight filled in (product box + packing allowance). Please check against your actual box.</p>
                  : ai.identified && <p className="text-ink/70">Couldn&apos;t find the box size — please measure.</p>}
                {ai.usedPriceLowUsd != null && ai.usedPriceHighUsd != null ? (
                  <p>Recent used prices: <b>${ai.usedPriceLowUsd}–${ai.usedPriceHighUsd}</b> <span className="text-ink/60">(our team sets the final value)</span></p>
                ) : ai.identified && <p className="text-ink/70">No reliable sold prices found — our team will value it.</p>}
                {ai.notes && <p className="text-orange-800">Note: {ai.notes}</p>}
                {ai.sources.length > 0 && (
                  <p className="text-xs text-ink/60">Sources: {ai.sources.slice(0, 4).map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline">{i ? ", " : ""}{s.title.slice(0, 40)}</a>)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

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
            <select className="input" id="platform" name="platform" required value={platform} onChange={(e) => setPlatform(e.target.value)}>
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

      {state?.error && errSeen !== state && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="btn-accent" disabled={pending}>{pending ? "Uploading…" : "Submit & pay postage"}</button>
    </form>
  );
}
