import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { housekeeping } from "@/lib/exchange";
import { getReputation } from "@/lib/reputation";
import { TIERS, categoryLabel } from "@/lib/config";
import { usd } from "@/lib/money";
import { ExchangeStatus, ItemStatus } from "@/components/Status";

export default async function Dashboard() {
  const user = await requireOnboardedUser();
  await housekeeping();
  const rep = await getReputation(user.id);
  const myItems = await db.select().from(schema.items).where(eq(schema.items.ownerId, user.id)).orderBy(desc(schema.items.createdAt));
  const myParties = await db.select().from(schema.exchangeParties).where(eq(schema.exchangeParties.userId, user.id));
  const exs = myParties.length
    ? await db.select().from(schema.exchanges).where(inArray(schema.exchanges.id, myParties.map((p) => p.exchangeId))).orderBy(desc(schema.exchanges.createdAt))
    : [];
  const visible = exs.filter((e) => e.status !== "draft");
  const action = visible.filter((e) => ["proposed", "locked", "in_transit"].includes(e.status));
  const tier = TIERS.find((t) => t.id === rep.tier)!;
  const next = TIERS[TIERS.indexOf(tier) + 1];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Hi, {user.displayName}</h1>
          <p className="text-ink/70">Reputation <b>{rep.score}</b> · {rep.completed} swaps · <b>{tier.label}</b> tier ({usd(tier.minCents)}–{usd(tier.maxCents)})</p>
          {next && <p className="text-xs text-ink/50">{next.label} unlocks after {next.minCompleted} completed swaps with reputation {next.minScore}+.</p>}
          {user.suspendedAt && <p className="mt-2 text-sm text-red-700">Your account is suspended. Contact support.</p>}
        </div>
        <Link href="/items/new" className="btn-accent">+ Add an item to swap</Link>
      </div>

      {action.length > 0 && (
        <section className="space-y-3">
          <h2>Needs your attention</h2>
          {action.map((e) => (
            <Link key={e.id} href={`/exchanges/${e.id}`} className="card flex items-center justify-between hover:border-plum">
              <span>Swap #{e.id}</span>
              <ExchangeStatus s={e.status} />
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2>My items</h2>
        {myItems.length === 0 ? (
          <div className="card text-center text-ink/70">Nothing yet. Add something you'd like to swap — complete, working, and in an open category.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myItems.map((it) => (
              <Link key={it.id} href={`/items/${it.id}`} className="card flex items-start justify-between gap-3 hover:border-plum">
                <div>
                  <p className="font-semibold">{it.title}</p>
                  <p className="text-xs text-ink/60">{categoryLabel(it.category)}</p>
                </div>
                <ItemStatus s={it.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {visible.length > 0 && (
        <section className="space-y-3">
          <h2>Swap history</h2>
          <div className="card divide-y divide-ink/10 !p-0">
            {visible.map((e) => (
              <Link key={e.id} href={`/exchanges/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink/5">
                <span>Swap #{e.id} · {e.createdAt.toLocaleDateString("en-US")}</span>
                <ExchangeStatus s={e.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
