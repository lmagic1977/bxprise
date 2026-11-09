import type { FeedRow } from "@/lib/feed";

export function RecentBoxes({ rows }: { rows: FeedRow[] }) {
  if (!rows.length) return null;
  const scrolls = rows.length > 4;
  const hasExamples = rows.some((r) => r.example);
  const line = (r: FeedRow, duplicate: boolean) => (
    <li key={(duplicate ? "d" : "") + r.key} aria-hidden={duplicate || undefined}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-ink/5 px-4 py-2.5 text-xs sm:grid-cols-[1fr_1.4fr_1.4fr_auto] sm:text-sm ${duplicate ? "feed-duplicate" : ""}`}>
      <b className="order-1 break-words uppercase tracking-wide">{r.name}</b>
      <span className="order-3 break-words text-ink/70 sm:order-2">{r.place}</span>
      <span className="order-4 text-right font-semibold text-plum sm:order-3 sm:text-left">{r.category}</span>
      <span className="order-2 flex items-center justify-end gap-2 sm:order-4">
        {r.example && <span className="rounded-full bg-tangerine-soft px-2 py-0.5 text-[11px] text-orange-900">Example</span>}
        {r.at && <span className="whitespace-nowrap tabular-nums text-ink/70">{r.at}</span>}
      </span>
    </li>
  );
  return (
    <section className="feed-section card !p-0 overflow-hidden" aria-labelledby="recent-boxes-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 id="recent-boxes-title" className="!text-base">Recent boxes</h2>
        {scrolls && <label className="feed-control inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink/70">
          <input type="checkbox" className="feed-pause accent-plum" /> Pause scrolling
        </label>}
      </div>
      <p className="px-4 pb-2 text-xs text-ink/70">{hasExamples ? "Example entries are fictional. Times shown in Pacific." : "Times shown in Pacific."}</p>
      <div className={`relative ${scrolls ? "feed-window h-56 overflow-hidden" : ""}`}>
        <ul className={scrolls ? "feed-track" : ""}>
          {rows.map((r) => line(r, false))}
          {scrolls && rows.map((r) => line(r, true))}
        </ul>
      </div>
    </section>
  );
}
