import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { categoryLabel } from "@/lib/config";
import { ItemStatus } from "@/components/Status";

export default async function Queue() {
  const rows = await db
    .select({ item: schema.items, owner: schema.users.displayName })
    .from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.ownerId))
    .where(inArray(schema.items.status, ["pending_review", "needs_info", "valuation_ready"]))
    .orderBy(asc(schema.items.createdAt));
  return (
    <div className="space-y-3">
      <h1>Item review</h1>
      {rows.length === 0 && <p className="card text-ink/60">Queue is empty.</p>}
      {rows.map(({ item, owner }) => (
        <Link key={item.id} href={`/admin/items/${item.id}`} className="card flex items-center justify-between hover:border-plum">
          <span><b>#{item.id} {item.title}</b> <span className="text-sm text-ink/60">· {categoryLabel(item.category)} · {owner} · {item.createdAt.toLocaleDateString("en-US")}</span></span>
          <ItemStatus s={item.status} />
        </Link>
      ))}
    </div>
  );
}
