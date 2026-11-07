import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { resolve } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionButton";
import { Photos } from "@/components/Photos";

const LOST: Record<string, string> = { return: "partner returns item; lost-box sender pays return postage", let_go: "let it go", insurance: "insurance claim" };

export default async function Reports() {
  const ds = await db.select().from(schema.disputes).orderBy(desc(schema.disputes.id)).limit(100);
  const ps = ds.length ? await db.select({ p: schema.exchangeParties, it: schema.items, u: schema.users.displayName })
    .from(schema.exchangeParties).innerJoin(schema.items, eq(schema.items.id, schema.exchangeParties.sendItemId))
    .innerJoin(schema.users, eq(schema.users.id, schema.exchangeParties.userId))
    .where(inArray(schema.exchangeParties.exchangeId, ds.map((d) => d.exchangeId))) : [];
  return (
    <div className="space-y-3">
      <h1>Reports</h1>
      {ds.length === 0 && <p className="card text-ink/60">No reports.</p>}
      {ds.map((d) => {
        const sides = ps.filter((x) => x.p.exchangeId === d.exchangeId);
        return (
          <section key={d.id} className="card space-y-2 text-sm">
            <p><b>#{d.id} · swap #{d.exchangeId} · {d.reason.replaceAll("_", " ")}</b> · {d.status} · opened by {sides.find((s) => s.p.userId === d.openedBy)?.u}</p>
            <p className="whitespace-pre-line">{d.details}</p>
            {d.lostOption && <p>Wants: {LOST[d.lostOption]}</p>}
            {sides.map(({ p, it, u }) => (
              <div key={p.id} className="rounded-xl bg-cream p-2">
                <p>{u} sent <b>{it.title}</b>: {it.description}</p>
                <div className="mt-1 flex gap-2"><Photos ids={it.photoIds} size="h-14 w-14" />{p.packingPhotoId && <Photos ids={[p.packingPhotoId]} size="h-14 w-14" />}</div>
              </div>
            ))}
            {d.status === "open" ? (
              <ActionForm action={resolve.bind(null, d.id)} submit="Resolve">
                <textarea className="input" name="resolution" rows={2} placeholder="Resolution shown to both users" />
                <select className="input" name="fraudUserId" defaultValue="">
                  <option value="">No fraud confirmed</option>
                  {sides.map(({ p, u }) => <option key={p.userId} value={p.userId}>Confirm misrepresentation by {u} (−reputation)</option>)}
                </select>
              </ActionForm>
            ) : <p className="text-ink/60">Resolution: {d.resolution}</p>}
          </section>
        );
      })}
    </div>
  );
}
