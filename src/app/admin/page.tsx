import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { housekeeping } from "@/lib/exchange";

export default async function AdminHome() {
  await housekeeping();
  const items = await db.select({ k: schema.items.status, n: sql<number>`count(*)::int` }).from(schema.items).groupBy(schema.items.status);
  const exs = await db.select({ k: schema.exchanges.status, n: sql<number>`count(*)::int` }).from(schema.exchanges).groupBy(schema.exchanges.status);
  const [users] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
  const [open] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.disputes).where(sql`status = 'open'`);
  const Box = ({ title, rows }: { title: string; rows: { k: string; n: number }[] }) => (
    <div className="card">
      <h2>{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">{rows.length ? rows.map((r) => <li key={r.k} className="flex justify-between"><span>{r.k}</span><b>{r.n}</b></li>) : <li className="text-ink/50">none yet</li>}</ul>
    </div>
  );
  return (
    <div className="space-y-4">
      <h1>Admin</h1>
      <p className="text-sm text-ink/70">{users.n} users · {open.n} open reports</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Box title="Items by status" rows={items} />
        <Box title="Swaps by status" rows={exs} />
      </div>
    </div>
  );
}
