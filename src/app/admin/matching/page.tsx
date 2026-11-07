import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { categoryLabel } from "@/lib/config";
import { createBatch, discard, publish } from "@/app/actions/admin";
import { ActionButton } from "@/components/ActionButton";
import { ExchangeStatus } from "@/components/Status";

export default async function Matching() {
  const batches = await db.select().from(schema.batches).orderBy(desc(schema.batches.id)).limit(10);
  const exs = batches.length ? await db.select().from(schema.exchanges).where(inArray(schema.exchanges.batchId, batches.map((b) => b.id))) : [];
  const ps = exs.length ? await db.select({ p: schema.exchangeParties, it: schema.items, u: schema.users.displayName })
    .from(schema.exchangeParties).innerJoin(schema.items, eq(schema.items.id, schema.exchangeParties.sendItemId))
    .innerJoin(schema.users, eq(schema.users.id, schema.exchangeParties.userId))
    .where(inArray(schema.exchangeParties.exchangeId, exs.map((e) => e.id))) : [];
  const [poolCount] = await db.select({ n: schema.items.id }).from(schema.items).where(eq(schema.items.status, "in_pool")).then((r) => [r.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1>Weekly matching</h1><p className="text-sm text-ink/60">{poolCount} items waiting in the pool. Matching only uses hard rules (tier, categories, exclusions); you review every pair before anyone sees it.</p></div>
        <ActionButton action={createBatch} className="btn-accent">Run matching → draft batch</ActionButton>
      </div>
      {batches.map((b) => {
        const list = exs.filter((e) => e.batchId === b.id);
        return (
          <section key={b.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2>Batch #{b.id} · {b.status} · {b.createdAt.toLocaleString("en-US")}</h2>
              {b.status === "draft" && (
                <div className="flex gap-2">
                  <ActionButton action={publish.bind(null, b.id)}>Publish to users</ActionButton>
                  <ActionButton action={discard.bind(null, b.id)} className="btn-ghost">Discard</ActionButton>
                </div>
              )}
            </div>
            {list.map((e) => (
              <div key={e.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <div className="flex justify-between"><b>Swap #{e.id}</b><ExchangeStatus s={e.status} /></div>
                {ps.filter((x) => x.p.exchangeId === e.id).map((x) => (
                  <p key={x.p.id}>{x.u} sends <b>#{x.it.id} {x.it.title}</b> ({categoryLabel(x.it.category)})</p>
                ))}
                <p className="text-xs text-ink/50">{e.matchReason}</p>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
