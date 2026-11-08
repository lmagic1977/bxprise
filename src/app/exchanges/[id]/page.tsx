import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { exchangeForUser, housekeeping } from "@/lib/exchange";
import { SHIP_WINDOW_DAYS, TEST_MODE, categoryLabel } from "@/lib/config";
import { usd } from "@/lib/money";
import { guess, receive, report, respond, review, simulatePickup, uploadPackingPhoto } from "@/app/actions/exchanges";
import { ActionButton, ActionForm } from "@/components/ActionButton";
import { ExchangeStatus } from "@/components/Status";
import { Photos } from "@/components/Photos";
import { PhotoInput } from "@/components/PhotoInput";

const Step = ({ done, children }: { done: boolean; children: React.ReactNode }) => (
  <li className="flex items-start gap-2"><span className={done ? "text-green-600" : "text-ink/30"}>{done ? "✓" : "○"}</span><span>{children}</span></li>
);

export default async function ExchangePage({ params }: PageProps<"/exchanges/[id]">) {
  const user = await requireOnboardedUser();
  await housekeeping();
  const id = Number((await params).id);
  const d = await exchangeForUser(id, user.id);
  if (!d) notFound();
  const { ex, mine, theirs, myItem, blind, reveal, myReview, riddle, riddleTeaser } = d;
  const s = ex.status;
  const shipBy = ex.lockedAt ? new Date(ex.lockedAt.getTime() + SHIP_WINDOW_DAYS * 864e5) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-ink/60">← My swaps</Link>
          <h1 className="mt-1">Swap #{ex.id}</h1>
        </div>
        <ExchangeStatus s={s} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card space-y-1">
          <p className="text-xs uppercase tracking-wide text-ink/50">You send</p>
          <p className="font-semibold">{myItem.title}</p>
          <p className="text-sm text-ink/60">{categoryLabel(myItem.category)}</p>
        </section>
        <section className="card space-y-1 border-tangerine bg-tangerine-soft/40">
          <p className="text-xs uppercase tracking-wide text-ink/50">You get</p>
          {reveal ? (
            <p className="font-semibold">{reveal.item.title}</p>
          ) : (
            <>
              <p className="text-2xl">🎁 A mystery box</p>
              <p className="text-sm">{blind.category} · {blind.condition}</p>
              <p className="text-sm">Value {usd(blind.valueRange[0])} – {usd(blind.valueRange[1])}</p>
            </>
          )}
        </section>
      </div>

      {s === "proposed" && (
        <section className="card space-y-3">
          <h2>You've got a match!</h2>
          <p className="text-sm text-ink/70">Accept by <b>{ex.acceptDeadline?.toLocaleString("en-US")}</b>. Once you both accept, labels are created and you'll have {SHIP_WINDOW_DAYS} days to drop off your box. If either side declines or time runs out, both items go back in the pool.</p>
          <ul className="space-y-1 text-sm">
            <Step done={!!mine.acceptedAt}>You {mine.acceptedAt ? "accepted" : "haven't answered yet"}</Step>
            <Step done={!!theirs.acceptedAt}>Your partner {theirs.acceptedAt ? "accepted" : "hasn't answered yet"}</Step>
          </ul>
          {!mine.acceptedAt && (
            <div className="flex gap-3">
              <ActionButton action={respond.bind(null, id, true)} className="btn-accent">Accept the swap</ActionButton>
              <ActionButton action={respond.bind(null, id, false)} className="btn-ghost" confirm="Decline this match? Your item goes back in the pool.">Decline</ActionButton>
            </div>
          )}
        </section>
      )}

      {riddle && !reveal && (
        <section className="card space-y-3 border-plum bg-plum-soft/60">
          <p className="text-xs uppercase tracking-wide text-plum">Your Plus-tier clue</p>
          <p className="text-xl font-semibold italic">“{riddle}”</p>
          {mine.guess ? (
            <p className="text-sm">Your guess: <b>{mine.guess}</b> — find out when you open it.</p>
          ) : (
            <ActionForm action={guess.bind(null, id)} submit="Lock in my guess" className="flex flex-wrap items-start gap-2">
              <input className="input max-w-xs" name="guess" maxLength={100} placeholder="What do you think it is?" />
            </ActionForm>
          )}
        </section>
      )}
      {riddleTeaser && !reveal && (
        <p className="rounded-xl bg-ink/5 p-3 text-sm text-ink/70">🔒 Your partner&apos;s box comes with a riddle clue. Reach the Plus tier to see clues while your box travels.</p>
      )}

      {["locked", "in_transit", "disputed"].includes(s) && (
        <section className="card space-y-4">
          <h2>Shipping</h2>
          <div className="rounded-xl bg-cream p-3 text-sm">
            <p>Label: <b>{mine.labelCarrier}</b> · tracking <span className="font-mono">{mine.trackingNumber}</span> {TEST_MODE && <span className="pill bg-amber-100 text-amber-900">test label</span>}</p>
            <p>Actual postage {usd(mine.actualPostageCents ?? 0)} · difference refunded to your card.</p>
            {shipBy && !mine.pickedUpAt && <p>Drop off by <b>{shipBy.toLocaleDateString("en-US")}</b>.</p>}
          </div>
          <ul className="space-y-1 text-sm">
            <Step done={!!mine.packingPhotoId}>Photo of what you packed (before sealing)</Step>
            <Step done={!!mine.pickedUpAt}>Your box scanned by the carrier</Step>
            <Step done={!!theirs.pickedUpAt}>Partner's box scanned by the carrier</Step>
            <Step done={!!mine.receivedAt}>You received your box</Step>
          </ul>
          {!mine.packingPhotoId && !mine.pickedUpAt && (
            <ActionForm action={uploadPackingPhoto.bind(null, id)} submit="Save packing photo">
              <PhotoInput name="photo" multiple={false} max={1} label="Packing photo — only our team sees it unless there's a problem" />
            </ActionForm>
          )}
          {TEST_MODE && !mine.pickedUpAt && s === "locked" && (
            <ActionButton action={simulatePickup.bind(null, id)} className="btn-ghost">Simulate carrier scan (test mode)</ActionButton>
          )}
          {s === "in_transit" && !mine.receivedAt && (
            <ActionButton action={receive.bind(null, id)} className="btn-accent">I got my box!</ActionButton>
          )}
        </section>
      )}

      {reveal && (
        <section className="card space-y-3 border-plum">
          <h2>🎉 Your surprise: {reveal.item.title}</h2>
          <Photos ids={reveal.item.photoIds} size="h-24 w-24" />
          <p className="text-sm">{reveal.item.description}</p>
          {riddle && <p className="text-sm">The clue was <i>“{riddle}”</i>{mine.guess ? <> — you guessed <b>{mine.guess}</b>.</> : "."}</p>}
          {reveal.item.story && <blockquote className="rounded-xl bg-plum-soft p-3 text-sm italic">“{reveal.item.story}”</blockquote>}
          <p className="text-sm">From <b>{reveal.sender.displayName}</b>{reveal.sender.interests ? ` · into ${reveal.sender.interests}` : ""}</p>
          {reveal.sender.bio && <p className="text-sm text-ink/70">{reveal.sender.bio}</p>}
          {reveal.theirReview && (
            <p className="text-sm text-ink/70">Their review of your box: {reveal.theirReview.matchesDescription ? "as described" : "not as described"} · packaging {reveal.theirReview.packaging}/5{reveal.theirReview.comment ? ` · “${reveal.theirReview.comment}”` : ""}</p>
          )}
          {["completed", "resolved"].includes(s) && (
            <Link href={`/items/new?from=${id}`} className="btn-ghost">Not your thing? Put it back in the pool</Link>
          )}
        </section>
      )}

      {mine.receivedAt && !myReview && (
        <section className="card space-y-3">
          <h2>Rate this swap</h2>
          <ActionForm action={review.bind(null, id)} submit="Submit review">
            <fieldset className="text-sm">
              <legend className="field-label">Did it match the description?</legend>
              <label className="mr-4"><input type="radio" name="matches" value="yes" className="accent-plum" /> Yes</label>
              <label><input type="radio" name="matches" value="no" className="accent-plum" /> No</label>
            </fieldset>
            <label className="block text-sm"><span className="field-label">Packaging (1–5)</span>
              <input className="input" type="number" name="packaging" min={1} max={5} defaultValue={5} /></label>
            <label className="block text-sm"><span className="field-label">How much did you enjoy the surprise? (1–5, private — never affects the sender)</span>
              <input className="input" type="number" name="enjoyment" min={1} max={5} defaultValue={4} /></label>
            <textarea className="input" name="comment" rows={2} placeholder="A note for the sender (optional)" />
          </ActionForm>
        </section>
      )}
      {myReview && <p className="text-sm text-ink/60">You reviewed this swap. {ex.reviewsPublishedAt ? "Reviews are now visible." : "Reviews are revealed once both are in."}</p>}

      {["locked", "in_transit", "completed"].includes(s) && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Report a problem</summary>
          <ActionForm action={report.bind(null, id)} submit="Send report" className="mt-3 space-y-3">
            <select className="input" name="reason" defaultValue="">
              <option value="" disabled>What happened?</option>
              <option value="not_as_described">It didn't match the description</option>
              <option value="lost">My box never arrived</option>
              <option value="damaged">It arrived damaged</option>
              <option value="other">Something else</option>
            </select>
            <textarea className="input" name="details" rows={3} placeholder="Tell us what happened. Photos help — keep the box and packing." />
            <fieldset className="space-y-1 text-sm">
              <legend className="field-label">If your box was lost, what would you like?</legend>
              <label className="block"><input type="radio" name="lostOption" value="return" className="accent-plum" /> My partner returns my item (the sender of the lost box pays return postage)</label>
              <label className="block"><input type="radio" name="lostOption" value="let_go" className="accent-plum" /> Let it go</label>
              <label className="block"><input type="radio" name="lostOption" value="insurance" className="accent-plum" /> Claim on shipping insurance (coming soon)</label>
            </fieldset>
          </ActionForm>
        </details>
      )}
      {d.disputes.length > 0 && (
        <section className="card text-sm">
          {d.disputes.map((x) => <p key={x.id}>Report #{x.id}: {x.reason.replaceAll("_", " ")} — {x.status}{x.resolution ? ` · ${x.resolution}` : ""}</p>)}
        </section>
      )}
      {s === "cancelled" && <p className="card text-sm">This match was cancelled: {ex.cancelReason}. Your item is back in the pool.</p>}
    </div>
  );
}
