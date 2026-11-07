import { CATEGORIES, MAX_DIMS_IN, MAX_WEIGHT_LB, TIERS, ACCEPT_WINDOW_HOURS, SHIP_WINDOW_DAYS, REVIEW_AUTO_PUBLISH_DAYS, MAX_WAIT_DAYS_BEFORE_REFUND } from "@/lib/config";
import { usd } from "@/lib/money";

export const metadata = { title: "How it works · BXprise" };

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-relaxed">
      <h1>How BXprise works</h1>
      <p>BXprise is a blind swap for fun. You trade something you no longer use for a surprise from someone with similar interests. It is about the unboxing, not about getting an exact equal.</p>

      <h2>1. What you can send</h2>
      <ul className="list-disc pl-5">
        <li>Open categories: {CATEGORIES.map((c) => c.label).join(", ")}.</li>
        <li>Complete, clean and fully working. Describe any wear honestly.</li>
        <li>Packed weight up to {MAX_WEIGHT_LB} lb; box up to {MAX_DIMS_IN.join(" × ")} inches.</li>
        <li>Books, discs and games: discs must play without skipping or errors; cartridges must be genuine. Games are only matched with people who own that platform. Low-value books and discs can be bundled into one box.</li>
        <li>Not accepted: pirated or burned copies, vinyl records, anything with batteries or a plug, liquids, food, medicine, fragile items, weapons, recalled or counterfeit goods.</li>
      </ul>

      <h2>2. Value and tiers</h2>
      <p>Our team gives each item a value range. You confirm it before your item joins the pool. Values are a guide for matching, not an appraisal or a promise of resale value.</p>
      <ul className="list-disc pl-5">
        {TIERS.map((t) => <li key={t.id}><b>{t.label}</b> — {usd(t.minCents)} to {usd(t.maxCents)}. {t.minCompleted ? `Unlocks after ${t.minCompleted} completed swaps with a good reputation.` : "Open to everyone."}</li>)}
      </ul>

      <h2>3. Postage</h2>
      <p>You pay postage for the box you send, when you submit your item. We charge the farthest-zone price up front; once you're matched we buy the real label and refund the difference. If you withdraw, or nothing matches within {MAX_WAIT_DAYS_BEFORE_REFUND} days, we refund your postage in full.</p>

      <h2>4. The blind match</h2>
      <p>Matching runs in weekly batches. You'll see only the category, value range and condition of what's coming, never photos or the exact item. Both of you have {ACCEPT_WINDOW_HOURS} hours to accept. Once both accept, labels are created and you have {SHIP_WINDOW_DAYS} days to drop off your box. Please photograph what you pack before sealing it.</p>

      <h2>5. Unboxing, reviews and reputation</h2>
      <p>After you receive your box you rate the swap: did it match the description, and was it packed well? Reviews are double-blind — both are revealed when both are in, or after {REVIEW_AUTO_PUBLISH_DAYS} days. Your reputation goes up with on-time, as-described swaps and unlocks higher tiers. How much you liked the surprise is shared with us to improve matching, but never counts against the sender.</p>

      <h2>6. If something goes wrong</h2>
      <ul className="list-disc pl-5">
        <li><b>It matched the description but isn't your thing:</b> no refund — that's the game. You can put it straight back in the pool.</li>
        <li><b>It didn't match the description:</b> report it with photos. If we confirm it, the sender loses reputation and can be suspended.</li>
        <li><b>Your box never arrived:</b> choose to have your partner return your item (the sender of the lost box pays return postage), let it go, or claim on shipping insurance (coming soon).</li>
      </ul>

      <h2>7. Privacy</h2>
      <p>Your item is visible only to our team until the swap is complete. Your address is used only for shipping labels; your partner will see it on the package. Please hide labels and personal details if you share unboxing photos.</p>
    </article>
  );
}
