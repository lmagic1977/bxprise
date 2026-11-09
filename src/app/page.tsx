import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CATEGORIES, MAX_DIMS_IN, MAX_WEIGHT_LB, TIERS } from "@/lib/config";
import { usd } from "@/lib/money";
import { exampleBoxes, recentBoxes } from "@/lib/feed";
import { RecentBoxes } from "@/components/RecentBoxes";

const steps = [
  { title: "Pack it", copy: "Pick a good item and snap a few photos.", position: "left top" },
  { title: "Get it valued", copy: "Pay postage and confirm your box’s value range.", position: "right top" },
  { title: "Swap blind", copy: "Both accept the match, then both ship.", position: "left bottom" },
  { title: "Unbox it", copy: "Open your surprise and rate the swap.", position: "right bottom" },
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
  const feed = await recentBoxes().catch(() => exampleBoxes());
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 py-6 md:grid-cols-2">
        <div className="space-y-5">
          <p className="pill bg-tangerine-soft text-orange-800">Pilot · US only</p>
          <h1 className="!text-4xl md:!text-5xl">Swap a box.<br />Get a surprise.</h1>
          <p className="text-lg text-ink/70">
            Send something you no longer use. Get a mystery box back from someone who shares your interests. Your postage is your ticket — the surprise is the fun.
          </p>
          <div className="flex gap-3">
            <Link href="/signup" className="btn-accent">Start swapping</Link>
            <Link href="/how-it-works" className="btn-ghost">How it works</Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div aria-hidden="true" className="absolute inset-[5%] rounded-full bg-plum-soft" />
          <img
            src="/hero-box-3d.webp"
            alt=""
            width={800}
            height={800}
            fetchPriority="high"
            className="relative h-full w-full object-contain"
          />
        </div>
      </section>

      <RecentBoxes rows={feed} />

      <section aria-labelledby="swap-steps-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 id="swap-steps-title" className="!text-2xl">How it works</h2>
          <Link href="/how-it-works" className="text-sm font-semibold text-plum hover:underline">Read the swap rules →</Link>
        </div>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-5">
          {steps.map(({ title, copy, position }, i) => (
            <li key={title} className="min-w-0">
              <div
                aria-hidden="true"
                className="relative aspect-square overflow-hidden rounded-2xl bg-plum-soft"
                style={{ backgroundImage: "url('/swap-steps.webp')", backgroundSize: "200% 200%", backgroundPosition: position }}
              >
                <span className="absolute top-2.5 left-2.5 rounded-full bg-white px-2 py-1 text-xs font-bold tabular-nums text-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-snug text-ink/70">{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Swap essentials" className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-[#ffebe0] p-5">
          <div aria-hidden="true" className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/70 text-plum">
            <svg viewBox="0 0 32 32" className="size-9" fill="currentColor">
              <rect x="3" y="3" width="12" height="12" rx="4" />
              <rect x="17" y="3" width="12" height="12" rx="4" fill="#f97316" />
              <rect x="3" y="17" width="12" height="12" rx="4" fill="#f97316" />
              <rect x="17" y="17" width="12" height="12" rx="4" />
            </svg>
          </div>
          <h2>Open categories</h2>
          <p className="mt-1 text-sm text-ink/70">Pick something from one of these categories.</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-medium">{category.label.split(" (")[0]}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl bg-plum-soft p-5">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/70">
            <img src="/icon.svg" alt="" width={38} height={38} />
          </div>
          <h2>What can go in a box</h2>
          <p className="mt-1 text-sm text-ink/70">Complete, working items only.</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/75 p-2.5">
              <dt className="text-xs text-ink/70">Max weight</dt>
              <dd className="text-sm font-bold">{MAX_WEIGHT_LB} lb</dd>
            </div>
            <div className="rounded-xl bg-white/75 p-2.5">
              <dt className="text-xs text-ink/70">Max size</dt>
              <dd className="text-sm font-bold">{MAX_DIMS_IN.join(" × ")} in</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink/70">No batteries, liquids, food, fragile or broken items.</p>
        </article>
        <article className="rounded-2xl bg-[#ffebe0] p-5">
          <div aria-hidden="true" className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/70 text-plum">
            <svg viewBox="0 0 32 32" className="size-9" fill="currentColor">
              <rect x="3" y="19" width="7" height="10" rx="2" fill="#f97316" />
              <rect x="12.5" y="12" width="7" height="17" rx="2" />
              <rect x="22" y="4" width="7" height="25" rx="2" fill="#f97316" />
            </svg>
          </div>
          <h2>Value tiers</h2>
          <ul className="mt-3 space-y-2">
            {TIERS.map((tier) => (
              <li key={tier.id} className="rounded-xl bg-white/75 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-bold">
                  <span>{tier.label}</span>
                  <span className="text-plum">{usd(tier.minCents)}–{usd(tier.maxCents)}</span>
                </div>
                <p className="text-xs text-ink/70">{tier.minCompleted ? `Unlocks after ${tier.minCompleted} good swaps` : "Open to everyone"}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
