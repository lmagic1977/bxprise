import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CATEGORIES, MAX_DIMS_IN, MAX_WEIGHT_LB, TIERS } from "@/lib/config";
import { usd } from "@/lib/money";

const steps = [
  ["Pack up something you love but don't use", "Complete, working, and in one of our open categories. Snap a few photos."],
  ["Get a value and join the pool", "We review it and give a value range. You confirm it, pay your own postage, and wait for the weekly match."],
  ["Swap blind", "You see only the category, value range and condition of what's coming. Both say yes, both ship."],
  ["Unbox the surprise", "Open it, read the sender's note, rate the swap. Didn't click? Put it straight back in the pool."],
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
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
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
            <circle cx="100" cy="100" r="92" fill="#ede9fe" />
            <path d="M40 80 L100 50 L160 80 L160 150 L100 180 L40 150 Z" fill="#f97316" />
            <path d="M40 80 L100 110 L160 80 M100 110 L100 180" stroke="#fff" strokeWidth="4" fill="none" />
            <path d="M58 98 L82 140 M82 98 L58 140" stroke="#1f1534" strokeWidth="7" strokeLinecap="round" />
            <path d="M100 50 L100 20 M85 28 L100 20 L115 28" stroke="#5b21b6" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="150" cy="40" r="6" fill="#5b21b6" /><circle cx="45" cy="45" r="4" fill="#f97316" /><circle cx="170" cy="120" r="4" fill="#5b21b6" />
          </svg>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {steps.map(([t, d], i) => (
          <div key={t} className="card">
            <p className="text-3xl font-black text-tangerine">{i + 1}</p>
            <h2 className="mt-2 !text-base">{t}</h2>
            <p className="mt-1 text-sm text-ink/70">{d}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <h2>Open categories</h2>
          <ul className="mt-2 space-y-1 text-sm">{CATEGORIES.map((c) => <li key={c.id}>• {c.label}</li>)}</ul>
        </div>
        <div className="card">
          <h2>What can go in a box</h2>
          <p className="mt-2 text-sm text-ink/70">Complete and fully working. Packed weight up to {MAX_WEIGHT_LB} lb, box up to {MAX_DIMS_IN.join(" × ")} in. No batteries, liquids, food, fragile or broken items.</p>
        </div>
        <div className="card">
          <h2>Value tiers</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {TIERS.map((t) => (
              <li key={t.id}>• <b>{t.label}</b>: {usd(t.minCents)}–{usd(t.maxCents)} {t.minCompleted ? `(after ${t.minCompleted} good swaps)` : "(everyone)"}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
