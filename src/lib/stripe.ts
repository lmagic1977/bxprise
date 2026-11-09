import "server-only";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { items, payments } = schema;

export function stripeSandbox() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_test_/.test(key) || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  return new Stripe(key, { timeout: 10_000, maxNetworkRetries: 1 });
}

export async function postageCheckout(it: typeof items.$inferSelect) {
  const stripe = stripeSandbox();
  if (!stripe || Date.now() - it.createdAt.getTime() >= 23 * 60 * 60 * 1000) return null;
  const url = new URL(`/items/${it.id}`, process.env.APP_URL ?? "https://bxprise.com").href;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    expires_at: Math.floor(it.createdAt.getTime() / 1000) + 24 * 60 * 60,
    allowed_payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: it.postageHeldCents,
        product_data: { name: "BXprise swap postage" },
      },
      quantity: 1,
    }],
    metadata: { bxprisePostageItem: String(it.id) },
    success_url: `${url}?checkout=returned`,
    cancel_url: url,
  }, { idempotencyKey: `bxprise:postage:item:${it.id}` });
  return session.url;
}

export async function confirmPostage(session: Stripe.Checkout.Session) {
  const rawId = session.metadata?.bxprisePostageItem;
  if (!rawId || !/^\d+$/.test(rawId)) return;
  if (session.livemode || session.mode !== "payment" || session.payment_status !== "paid" || session.currency !== "usd" ||
      typeof session.payment_intent !== "string") throw new Error("Unexpected postage payment.");

  const intentId = session.payment_intent;
  await db.transaction(async (tx) => {
    const [it] = await tx.select().from(items).where(eq(items.id, Number(rawId))).for("update");
    if (!it || it.postageHeldCents !== session.amount_total) throw new Error("Postage payment does not match item.");
    const key = `charge:item:${it.id}`;
    const [charge] = await tx.select().from(payments).where(eq(payments.idempotencyKey, key));
    if (charge?.provider === "stripe" && charge.providerReference === intentId) return;
    if (charge || it.status !== "awaiting_payment") throw new Error("Unexpected payment for item.");
    await tx.insert(payments).values({
      userId: it.ownerId,
      itemId: it.id,
      kind: "postage_charge",
      amountCents: it.postageHeldCents,
      provider: "stripe",
      providerReference: intentId,
      idempotencyKey: key,
    });
    await tx.update(items).set({ status: "pending_review" })
      .where(and(eq(items.id, it.id), eq(items.status, "awaiting_payment")));
  });
}


export async function syncPostageRefund(refund: Stripe.Refund) {
  const key = refund.metadata?.bxprisePostageRefund;
  if (!key) return;
  const stripe = stripeSandbox();
  if (!stripe) throw new Error("Stripe refunds are unavailable.");
  const current = await stripe.refunds.retrieve(refund.id);
  const [payment] = await db.update(payments).set({ status: current.status ?? "pending" })
    .where(and(eq(payments.idempotencyKey, key), eq(payments.providerReference, refund.id)))
    .returning({ id: payments.id });
  if (!payment) throw new Error("Refund has not been recorded yet.");
}
