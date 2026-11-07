import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { categoryLabel, conditionLabel, platformLabel, TIERS } from "@/lib/config";
import { latestValuation } from "@/lib/exchange";
import { tierOfValue } from "@/lib/reputation";
import { usd } from "@/lib/money";
import { acceptValuation, addInfo, requestReview, setPaused, withdrawItem } from "@/app/actions/items";
import { ActionButton, ActionForm } from "@/components/ActionButton";
import { ItemStatus } from "@/components/Status";
import { Photos } from "@/components/Photos";
import { PhotoInput } from "@/components/PhotoInput";

export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const user = await requireOnboardedUser();
  const id = Number((await params).id);
  const sp = await searchParams;
  const isNew = sp.new === "1";
  const pooled = sp.pooled === "1";
  const [it] = await db.select().from(schema.items).where(and(eq(schema.items.id, id), eq(schema.items.ownerId, user.id)));
  if (!it) notFound();
  const v = await latestValuation(id);
  const pays = await db.select().from(schema.payments).where(eq(schema.payments.itemId, id)).orderBy(desc(schema.payments.createdAt));
  const [lock] = await db.select().from(schema.itemLocks).where(eq(schema.itemLocks.itemId, id));
  const [party] = await db.select().from(schema.exchangeParties).where(eq(schema.exchangeParties.sendItemId, id)).orderBy(desc(schema.exchangeParties.id)).limit(1);
  const exchangeId = lock?.exchangeId ?? party?.exchangeId;
  const tier = v ? tierOfValue(v.midCents) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {pooled && <div className="card border-plum bg-plum-soft text-sm">You&apos;re in the pool! Matching runs weekly — we&apos;ll show you your blind match here and on your dashboard.</div>}
      {isNew && <div className="card border-green-300 bg-green-50 text-sm">Submitted! We'll review it and send you a value range, usually within 2 days.</div>}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-ink/60">← My swaps</Link>
          <h1 className="mt-1">{it.title}</h1>
          <p className="text-sm text-ink/60">{categoryLabel(it.category)}{it.platform ? ` · ${platformLabel(it.platform)}` : ""} · {conditionLabel(it.condition)}</p>
        </div>
        <ItemStatus s={it.status} />
      </div>

      {it.status === "needs_info" && (
        <section className="card space-y-3 border-red-200">
          <h2>We need a bit more</h2>
          <p className="whitespace-pre-line text-sm">{it.adminNote}</p>
          <ActionForm action={addInfo.bind(null, id)} submit="Send back for review">
            <textarea className="input" name="reply" rows={2} placeholder="Your reply" />
            <PhotoInput name="photos" label="Extra photos (optional)" />
          </ActionForm>
        </section>
      )}

      {v && it.status === "valuation_ready" && (
        <section className="card space-y-3 border-tangerine">
          <h2>Your value range</h2>
          <p className="text-3xl font-bold">{usd(v.lowCents)} – {usd(v.highCents)}</p>
          <p className="text-sm text-ink/70">Reference value {usd(v.midCents)} · confidence {v.confidence} · {tier ? `${TIERS.find((t) => t.id === tier)!.label} tier` : "outside open tiers"}</p>
          <p className="text-sm"><span className="text-ink/60">Based on:</span> {v.basis}</p>
          <p className="hint">This is a matching guide, not an appraisal. You'll be matched with items in the same value tier.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton action={acceptValuation.bind(null, id, v.id)} className="btn-accent">Accept & join the pool</ActionButton>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-plum">Think it's off? Ask for a re-check</summary>
            <form action={requestReview.bind(null, id)} className="mt-2 space-y-2">
              <textarea className="input" name="note" rows={2} placeholder="What should we look at again?" />
              <button className="btn-ghost">Request re-check</button>
            </form>
          </details>
        </section>
      )}

      {v?.acceptedAt && (
        <section className="card text-sm">
          Accepted value: <b>{usd(v.lowCents)} – {usd(v.highCents)}</b> (version {v.version}, {v.acceptedAt.toLocaleDateString("en-US")})
        </section>
      )}

      {exchangeId && ["proposed", "locked", "exchanged"].includes(it.status) && (
        <Link href={`/exchanges/${exchangeId}`} className="btn-primary">Go to swap #{exchangeId} →</Link>
      )}

      <section className="card space-y-3">
        <h2>Details</h2>
        <Photos ids={it.photoIds} />
        <p className="whitespace-pre-line text-sm">{it.description}</p>
        <p className="text-sm"><span className="text-ink/60">Checked:</span> {it.functionNote}</p>
        {it.wearNote && <p className="text-sm"><span className="text-ink/60">Wear:</span> {it.wearNote}</p>}
        <p className="text-sm text-ink/60">Packed: {Math.floor(it.weightOz / 16)} lb {Math.round(it.weightOz % 16)} oz · {it.lengthIn} × {it.widthIn} × {it.heightIn} in</p>
        {it.story && <p className="rounded-xl bg-plum-soft p-3 text-sm">Note to recipient: {it.story}</p>}
      </section>

      <section className="card space-y-2 text-sm">
        <h2>Postage</h2>
        {pays.map((p) => (
          <p key={p.id} className="flex justify-between">
            <span>{p.kind === "postage_charge" ? "Charged (farthest-zone estimate)" : "Refunded"} · {p.createdAt.toLocaleDateString("en-US")} {p.provider === "test" && <span className="pill bg-amber-100 text-amber-900">test</span>}</span>
            <span className={p.kind === "postage_refund" ? "text-green-700" : ""}>{p.kind === "postage_refund" ? "−" : ""}{usd(p.amountCents)}</span>
          </p>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        {it.status === "in_pool" && <ActionButton action={async () => { "use server"; await setPaused(id, true); return { ok: "Paused." }; }} className="btn-ghost">Pause matching</ActionButton>}
        {it.status === "paused" && <ActionButton action={async () => { "use server"; await setPaused(id, false); return { ok: "Back in the pool." }; }} className="btn-ghost">Resume matching</ActionButton>}
        {["pending_review", "needs_info", "valuation_ready", "in_pool", "paused"].includes(it.status) && (
          <ActionButton action={async () => { "use server"; await withdrawItem(id); return {}; }} className="btn-danger" confirm="Withdraw this item? Your postage will be refunded in full.">
            Withdraw & refund postage
          </ActionButton>
        )}
      </div>
    </div>
  );
}
