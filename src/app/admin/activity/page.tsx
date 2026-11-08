import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { AutoRefresh } from "@/components/AutoRefresh";

const LABEL: Record<string, string> = {
  "user.signup": "signed up",
  "user.login": "logged in",
  "user.profile": "updated profile",
  "item.create": "uploaded an item",
  "item.withdraw": "withdrew an item",
  "item.pause": "paused an item",
  "item.resume": "resumed an item",
  "item.add_info": "replied with more info",
  "item.needs_info": "asked owner for info",
  "item.reject": "rejected an item",
  "valuation.create": "set a valuation",
  "valuation.accept": "accepted valuation → pool",
  "valuation.dispute": "asked for a re-check",
  "ai.identify": "used AI identify",
  "riddle.generate": "generated a riddle",
  "batch.create": "ran matching",
  "batch.publish": "published a batch",
  "batch.discard": "discarded a batch",
  "proposal.accept": "accepted a match",
  "exchange.cancel": "match cancelled",
  "exchange.lock": "swap locked (both accepted)",
  "shipment.pickup": "carrier scan recorded",
  "receipt.confirm": "confirmed receipt",
  "review.submit": "submitted a review",
  "dispute.open": "opened a report",
  "dispute.resolve": "resolved a report",
};

function link(entity: string, id: string | null) {
  if (!id) return null;
  if (entity === "item") return `/admin/items/${id}`;
  if (entity === "exchange") return `/admin/exchanges#ex-${id}`;
  if (entity === "batch") return "/admin/matching";
  if (entity === "dispute") return "/admin/disputes";
  return null;
}

const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

function summary(data: unknown) {
  if (!data || typeof data !== "object") return "";
  return Object.entries(data as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ")
    .slice(0, 160);
}

export default async function Activity({ searchParams }: PageProps<"/admin/activity">) {
  const q = String((await searchParams).q ?? "").trim();
  const rows = await db
    .select({ a: schema.auditLog, name: schema.users.displayName, email: schema.users.email })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
    .where(q ? or(ilike(schema.users.email, `%${q}%`), ilike(schema.users.displayName, `%${q}%`), ilike(schema.auditLog.action, `%${q}%`)) : undefined)
    .orderBy(desc(schema.auditLog.id))
    .limit(200);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1>Recent activity</h1><p className="text-sm text-ink/60">Every action on the site, newest first (Pacific time).</p></div>
        <AutoRefresh />
      </div>
      <form className="flex gap-2">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Filter by user, email or action" />
        <button className="btn-ghost !py-1.5">Filter</button>
        {q && <Link href="/admin/activity" className="btn-ghost !py-1.5">Clear</Link>}
      </form>
      <div className="card divide-y divide-ink/10 !p-0 text-sm">
        {rows.length === 0 && <p className="p-4 text-ink/60">No activity yet.</p>}
        {rows.map(({ a, name, email }) => {
          const href = link(a.entity, a.entityId);
          return (
            <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2">
              <span className="w-36 shrink-0 font-mono text-xs text-ink/50">{fmt.format(a.createdAt)}</span>
              <span className="font-semibold">{name ?? "System"}</span>
              <span className="text-ink/50">{email ?? ""}</span>
              <span>{LABEL[a.action] ?? a.action}</span>
              {href ? <Link href={href} className="text-plum underline">{a.entity} #{a.entityId}</Link> : a.entityId && <span className="text-ink/60">{a.entity} #{a.entityId}</span>}
              {a.data != null && <span className="w-full pl-36 text-xs text-ink/50">{summary(a.data)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
