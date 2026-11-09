const ITEM: Record<string, [string, string]> = {
  awaiting_payment: ["Awaiting payment", "bg-amber-100 text-amber-900"],
  pending_review: ["In review", "bg-amber-100 text-amber-900"],
  needs_info: ["Needs info", "bg-red-100 text-red-800"],
  valuation_ready: ["Value ready — confirm", "bg-tangerine-soft text-orange-800"],
  in_pool: ["In the pool", "bg-plum-soft text-plum"],
  paused: ["Paused", "bg-ink/10 text-ink/70"],
  proposed: ["Match proposed", "bg-tangerine-soft text-orange-800"],
  locked: ["Shipping", "bg-sky-100 text-sky-800"],
  exchanged: ["Swapped", "bg-green-100 text-green-800"],
  withdrawn: ["Withdrawn", "bg-ink/10 text-ink/60"],
  rejected: ["Not accepted", "bg-ink/10 text-ink/60"],
};
const EX: Record<string, [string, string]> = {
  proposed: ["Waiting for both to accept", "bg-tangerine-soft text-orange-800"],
  locked: ["Ship your box", "bg-sky-100 text-sky-800"],
  in_transit: ["On the way", "bg-plum-soft text-plum"],
  completed: ["Completed", "bg-green-100 text-green-800"],
  cancelled: ["Cancelled", "bg-ink/10 text-ink/60"],
  disputed: ["Under review", "bg-red-100 text-red-800"],
  resolved: ["Resolved", "bg-ink/10 text-ink/70"],
  draft: ["Draft", "bg-ink/10 text-ink/60"],
};
export function ItemStatus({ s }: { s: string }) {
  const [l, c] = ITEM[s] ?? [s, "bg-ink/10"];
  return <span className={`pill ${c}`}>{l}</span>;
}
export function ExchangeStatus({ s }: { s: string }) {
  const [l, c] = EX[s] ?? [s, "bg-ink/10"];
  return <span className={`pill ${c}`}>{l}</span>;
}
