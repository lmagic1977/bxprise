import { desc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminPickup } from "@/app/actions/admin";
import { ActionButton } from "@/components/ActionButton";
import { ExchangeStatus } from "@/components/Status";
import { Photos } from "@/components/Photos";
import { usd } from "@/lib/money";

export default async function Swaps() {
  const exs = await db.select().from(schema.exchanges).where(ne(schema.exchanges.status, "draft")).orderBy(desc(schema.exchanges.id)).limit(100);
  const ps = exs.length ? await db.select({ p: schema.exchangeParties, it: schema.items, u: schema.users })
    .from(schema.exchangeParties).innerJoin(schema.items, eq(schema.items.id, schema.exchangeParties.sendItemId))
    .innerJoin(schema.users, eq(schema.users.id, schema.exchangeParties.userId))
    .where(inArray(schema.exchangeParties.exchangeId, exs.map((e) => e.id))) : [];
  return (
    <div className="space-y-3">
      <h1>Swaps</h1>
      {exs.map((e) => (
        <section key={e.id} id={`ex-${e.id}`} className="card space-y-2 text-sm">
          <div className="flex justify-between"><b>Swap #{e.id} · {e.tier}</b><ExchangeStatus s={e.status} /></div>
          {ps.filter((x) => x.p.exchangeId === e.id).map(({ p, it, u }) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream p-2">
              <span>
                {u.displayName} ({u.city}, {u.state} {u.zip}) sends <b>{it.title}</b> · accepted {p.acceptedAt ? "✓" : "–"} · tracking {p.trackingNumber ?? "–"} {p.actualPostageCents != null && `(${usd(p.actualPostageCents)})`} · picked up {p.pickedUpAt ? "✓" : "–"} · received {p.receivedAt ? "✓" : "–"}
              </span>
              {p.packingPhotoId && <Photos ids={[p.packingPhotoId]} size="h-12 w-12" />}
              {e.status === "locked" && !p.pickedUpAt && <ActionButton action={adminPickup.bind(null, p.id)} className="btn-ghost !py-1">Mark carrier scan</ActionButton>}
            </div>
          ))}
          {e.cancelReason && <p className="text-ink/60">Cancelled: {e.cancelReason}</p>}
        </section>
      ))}
    </div>
  );
}
