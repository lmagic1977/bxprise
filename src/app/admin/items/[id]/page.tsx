import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { cardConditionLabel, cardFormatLabel, categoryLabel, conditionLabel, platformLabel, TIERS } from "@/lib/config";
import { usd } from "@/lib/money";
import { getReputation } from "@/lib/reputation";
import { regenerateRiddle, reviewItem } from "@/app/actions/admin";
import { riddleAvailable } from "@/lib/riddle";
import { ActionButton, ActionForm } from "@/components/ActionButton";
import { Photos } from "@/components/Photos";
import { ItemStatus } from "@/components/Status";

export default async function ReviewItem({ params }: PageProps<"/admin/items/[id]">) {
  const id = Number((await params).id);
  const [row] = await db.select({ it: schema.items, owner: schema.users }).from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.ownerId)).where(eq(schema.items.id, id));
  if (!row) notFound();
  const { it, owner } = row;
  const vals = await db.select().from(schema.valuations).where(eq(schema.valuations.itemId, id)).orderBy(desc(schema.valuations.version));
  const rep = await getReputation(owner.id);
  const ai = vals.length === 0 ? it.aiSuggestion : null;
  const aiMid = ai?.usedPriceLowUsd != null && ai.usedPriceHighUsd != null ? Math.round(((ai.usedPriceLowUsd + ai.usedPriceHighUsd) / 2) * 100) / 100 : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="card space-y-3">
        <div className="flex items-start justify-between"><h1>#{it.id} {it.title}</h1><ItemStatus s={it.status} /></div>
        <p className="text-sm text-ink/60">{categoryLabel(it.category)}{it.platform ? ` (${platformLabel(it.platform)})` : ""}{it.cardFormat ? ` (${cardFormatLabel(it.cardFormat)}${it.cardCondition ? `, ${cardConditionLabel(it.cardCondition)}` : ""})` : ""} · {conditionLabel(it.condition)} · {it.brand ?? "no brand"} · owner {owner.displayName} (rep {rep.score}, {rep.tier}, {rep.completed} swaps)</p>
        <Photos ids={it.photoIds} size="h-36 w-36" />
        <p className="whitespace-pre-line text-sm">{it.description}</p>
        <p className="text-sm"><b>Checked:</b> {it.functionNote}</p>
        {it.wearNote && <p className="text-sm"><b>Wear:</b> {it.wearNote}</p>}
        <p className="text-sm"><b>Packed:</b> {(it.weightOz / 16).toFixed(2)} lb · {it.lengthIn}×{it.widthIn}×{it.heightIn} in · from {it.shipFromZip} · postage held {usd(it.postageHeldCents)}</p>
        {it.aiSuggestion && (() => { const a = it.aiSuggestion; return (
          <div className="rounded-xl border border-plum/30 p-3 text-sm">
            <p><b>AI identification</b> ({a.confidence} confidence{a.searched === false ? ", no web search" : ""}): {a.identified ? <>{a.title}{a.brand ? ` · ${a.brand}` : ""}</> : "not identified"}</p>
            {a.usedPriceLowUsd != null && <p>Used prices: ${a.usedPriceLowUsd}–${a.usedPriceHighUsd} · {a.priceBasis}</p>}
            {a.productDimsIn && <p>Product box: {a.productDimsIn.join(" × ")} in, {a.productWeightOz} oz → owner entered {it.lengthIn}×{it.widthIn}×{it.heightIn} in, {it.weightOz} oz</p>}
            {a.notes && <p className="text-orange-800">AI notes: {a.notes}</p>}
            {a.sources.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{a.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.title}</a></li>)}</ul>}
          </div>); })()}
        <div className="rounded-xl bg-plum-soft p-3 text-sm">
          <p><b>Riddle clue</b> {it.riddle ? <>({it.riddleSource === "ai" ? "AI" : "written by admin"}): <i>{it.riddle}</i></> : <span className="text-ink/60">none yet</span>}</p>
          <div className="mt-2"><ActionButton action={regenerateRiddle.bind(null, id)} className="btn-ghost !py-1">{it.riddle ? "Rewrite with AI" : "Generate with AI"}</ActionButton></div>
          {!riddleAvailable() && <p className="hint">AI is off until ANTHROPIC_API_KEY is set — you can type a clue in the form instead.</p>}
        </div>
        {it.adminNote && <p className="whitespace-pre-line rounded-xl bg-cream p-3 text-sm">{it.adminNote}</p>}
        {vals.length > 0 && (
          <div className="text-sm"><b>Valuation history</b>
            {vals.map((v) => <p key={v.id}>v{v.version}: {usd(v.lowCents)}–{usd(v.highCents)} (ref {usd(v.midCents)}, {v.confidence}) · {v.basis} {v.acceptedAt ? "· accepted" : ""}</p>)}
          </div>
        )}
      </section>
      <section className="card">
        <h2>Decision</h2>
        <p className="hint">Tiers: {TIERS.map((t) => `${t.label} ${usd(t.minCents)}–${usd(t.maxCents)}`).join(" · ")}. Don't invent prices — record where the number came from.</p>
        <ActionForm action={reviewItem.bind(null, id)} submit="Save decision" className="mt-3 space-y-3">
          <select className="input" name="decision" defaultValue="approve">
            <option value="approve">Approve with valuation</option>
            <option value="needs_info">Ask owner for more info</option>
            <option value="reject">Reject (refunds postage)</option>
          </select>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">Low $<input className="input" name="low" type="number" step="0.01" defaultValue={ai?.usedPriceLowUsd ?? undefined} /></label>
            <label className="text-xs">Ref $<input className="input" name="mid" type="number" step="0.01" defaultValue={aiMid ?? undefined} /></label>
            <label className="text-xs">High $<input className="input" name="high" type="number" step="0.01" defaultValue={ai?.usedPriceHighUsd ?? undefined} /></label>
          </div>
          <input className="input" name="basis" defaultValue={ai?.priceBasis ? `AI-suggested: ${ai.priceBasis}` : ""} placeholder="Basis, e.g. 3 recent eBay sold listings, used, complete" />
          {ai?.priceBasis && <p className="hint !mt-0">Prefilled from AI — check the sources before saving.</p>}
          <select className="input" name="confidence" defaultValue="medium">
            <option value="low">Low confidence</option><option value="medium">Medium confidence</option><option value="high">High confidence</option>
          </select>
          <input className="input" name="riddle" maxLength={120} defaultValue={it.riddle ?? ""} placeholder="Riddle clue — leave blank to let AI write one" />
          <p className="hint !mt-0">Describe what it does or how it feels, never what it is. e.g. a padlock → “Something that keeps your things safe.”</p>
          <textarea className="input" name="note" rows={3} placeholder="Note to owner (required for info request / reject)" />
        </ActionForm>
      </section>
    </div>
  );
}
