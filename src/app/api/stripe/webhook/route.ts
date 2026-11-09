import { confirmPostage, stripeSandbox, syncPostageRefund } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = stripeSandbox();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response(null, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response(null, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (event.type === "checkout.session.completed") await confirmPostage(event.data.object);
  if (event.type === "refund.updated" || event.type === "refund.failed") await syncPostageRefund(event.data.object);
  return new Response(null, { status: 204 });
}
