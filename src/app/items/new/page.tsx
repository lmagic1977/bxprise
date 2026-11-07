import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOnboardedUser } from "@/lib/auth";
import { BUNDLE_HINT, CATEGORIES, CONDITIONS, MAX_DIMS_IN, MAX_WEIGHT_LB, PLATFORMS } from "@/lib/config";
import { ItemForm, type Prefill } from "@/components/ItemForm";

export default async function NewItem({ searchParams }: PageProps<"/items/new">) {
  const user = await requireOnboardedUser();
  const from = Number((await searchParams).from);
  let prefill: Prefill = {};
  if (from) {
    // Re-pooling something you received: copy its details, but new photos are required.
    const [mine] = await db.select().from(schema.exchangeParties)
      .where(and(eq(schema.exchangeParties.exchangeId, from), eq(schema.exchangeParties.userId, user.id)));
    const [theirs] = mine ? (await db.select().from(schema.exchangeParties).where(eq(schema.exchangeParties.exchangeId, from))).filter((p) => p.userId !== user.id) : [];
    if (mine?.receivedAt && theirs) {
      const [it] = await db.select().from(schema.items).where(eq(schema.items.id, theirs.sendItemId));
      prefill = {
        title: it.title, category: it.category, brand: it.brand ?? undefined, platform: it.platform ?? undefined, condition: it.condition,
        description: it.description, functionNote: "",
        weightLb: Math.floor(it.weightOz / 16), weightOzPart: Math.round((it.weightOz % 16) * 10) / 10,
        d1: it.lengthIn, d2: it.widthIn, d3: it.heightIn, repooledFrom: from,
      };
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1>{prefill.repooledFrom ? "Put your surprise back in the pool" : "Add an item to swap"}</h1>
        {prefill.repooledFrom && <p className="mt-1 text-ink/70">We've copied the details. Please re-check the condition, take fresh photos, and confirm it works.</p>}
      </div>
      <ItemForm
        categories={CATEGORIES.map(({ id, label }) => ({ id, label }))}
        conditions={CONDITIONS.map(({ id, label }) => ({ id, label }))}
        platforms={PLATFORMS.map(({ id, label }) => ({ id, label }))}
        bundleHints={BUNDLE_HINT}
        limits={{ lb: MAX_WEIGHT_LB, dims: [...MAX_DIMS_IN] }}
        prefill={prefill}
      />
    </div>
  );
}
