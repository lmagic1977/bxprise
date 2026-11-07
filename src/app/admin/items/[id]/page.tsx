import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { categoryLabel, conditionLabel, platformLabel, TIERS } from "@/lib/config";
import { usd } from "@/lib/money";
import { getReputation } from "@/lib/reputation";
import { reviewItem } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionButton";
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
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="card space-y-3">
        <div className="flex items-start justify-between"><h1>#{it.id} {it.title}</h1><ItemStatus s={it.status} /></div>
        <p className="text-sm text-ink/60">{categoryLabel(it.category)}{it.platform ? ` (${platformLabel(it.platform)})` : ""} · {conditionLabel(it.condition)} · {it.brand ?? "no brand"} · owner {owner.displayName} (rep {rep.score}, {rep.tier}, {rep.completed} swaps)</p>
        <Photos ids={it.photoIds} size="h-36 w-36" />
        <p className="whitespace-pre-line text-sm">{it.description}</p>
        <p className="text-sm"><b>Checked:</b> {it.functionNote}</p>
        {it.wearNote && <p className="text-sm"><b>Wear:</b> {it.wearNote}</p>}
        <p className="text-sm"><b>Packed:</b> {(it.weightOz / 16).toFixed(2)} lb · {it.lengthIn}×{it.widthIn}×{it.heightIn} in · from {it.shipFromZip} · postage held {usd(it.postageHeldCents)}</p>
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
            <label className="text-xs">Low $<input className="input" name="low" type="number" step="0.01" /></label>
            <label className="text-xs">Ref $<input className="input" name="mid" type="number" step="0.01" /></label>
            <label className="text-xs">High $<input className="input" name="high" type="number" step="0.01" /></label>
          </div>
          <input className="input" name="basis" placeholder="Basis, e.g. 3 recent eBay sold listings, used, complete" />
          <select className="input" name="confidence" defaultValue="medium">
            <option value="low">Low confidence</option><option value="medium">Medium confidence</option><option value="high">High confidence</option>
          </select>
          <textarea className="input" name="note" rows={3} placeholder="Note to owner (required for info request / reject)" />
        </ActionForm>
      </section>
    </div>
  );
}
