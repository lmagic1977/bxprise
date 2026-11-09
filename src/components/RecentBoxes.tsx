import type { FeedRow } from "@/lib/feed";

export function RecentBoxes({ rows }: { rows: FeedRow[] }) {
  if (!rows.length) return null;
  const hasExamples = rows.some((r) => r.example);
  const line = (r: FeedRow, dup: boolean) => (
    <li key={(dup ? "d" : "") + r.key} aria-hidden={dup || undefined}
      className="flex items-center gap-2 border-b border-ink/5 px-3 py-2.5 text-xs uppercase tracking-wide sm:gap-3 sm:px-4 sm:text-sm">
      <span className="h-2 w-2 shrink-0 rounded-full bg-tangerine" />
      <b className="w-12 shrink-0 truncate sm:w-20">{r.name}</b>
      <span className="w-24 shrink-0 truncate text-ink/60 sm:w-40">{r.place}</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-plum">{r.category}</span>
      {r.example
        ? <span className="pill shrink-0 bg-ink/5 text-[11px] normal-case text-ink/50">Example</span>
        : <span className="shrink-0 tabular-nums text-ink/50">{r.at}</span>}
    </li>
  );
  return (
    <section className="card !p-0 overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h2 className="!text-base">Recent boxes</h2>
        <span className="text-xs text-ink/50">{hasExamples ? "Examples shown until the pilot fills up" : "Times in Pacific"}</span>
      </div>
      <div className="feed-window relative h-56 overflow-hidden">
        <ul className={rows.length > 4 ? "feed-track" : ""}>
          {rows.map((r) => line(r, false))}
          {rows.length > 4 && rows.map((r) => line(r, true))}
        </ul>
      </div>
    </section>
  );
}
