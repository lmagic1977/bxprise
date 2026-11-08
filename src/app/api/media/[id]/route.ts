import { and, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { readImage } from "@/lib/storage";

// Every photo is private. Who may see one:
// - its owner and admins, always
// - the person who RECEIVED that item, once their exchange is complete
//   (or they have confirmed receipt)
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  const deny = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  if (!user) return deny();
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (!m) return deny();

  let allowed = user.role === "admin" || m.ownerId === user.id;
  if (!allowed) {
    const { items, exchangeParties: p, exchanges } = schema;
    // The sending party row whose item (or packing photo) holds this media.
    const sent = await db
      .select({ exchangeId: p.exchangeId, status: exchanges.status })
      .from(p)
      .innerJoin(items, eq(items.id, p.sendItemId))
      .innerJoin(exchanges, eq(exchanges.id, p.exchangeId))
      .where(or(sql`${items.photoIds} @> ${JSON.stringify([id])}::jsonb`, eq(p.packingPhotoId, id)));
    for (const s of sent) {
      const [mine] = await db
        .select()
        .from(p)
        .where(and(eq(p.exchangeId, s.exchangeId), eq(p.userId, user.id)));
      if (mine && (mine.receivedAt || ["completed", "resolved"].includes(s.status)) && mine.userId !== m.ownerId) {
        allowed = true;
        break;
      }
    }
  }
  if (!allowed) return deny();

  const body = await readImage(m.pathname);
  if (!body) return deny();
  return new Response(body as BodyInit, {
    // no-store: on a shared computer the next person to log in must not get
    // this image from the browser cache without the server checking them.
    headers: { "content-type": m.contentType, "cache-control": "private, no-store", vary: "Cookie" },
  });
}

