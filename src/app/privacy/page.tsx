export const metadata = { title: "Privacy · BXprise" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-relaxed">
      <h1>Privacy at BXprise</h1>
      <p className="text-sm text-ink/60">Plain-language summary for the BXprise pilot. Last updated November 8, 2026.</p>

      <h2>What we collect</h2>
      <ul className="list-disc pl-5">
        <li><b>Account:</b> email, nickname, and a password (stored only as a one-way hash). If you sign in with Google or Facebook we receive your name, email and an account ID from them — nothing else, and we never post on your behalf.</li>
        <li><b>Shipping address:</b> used only to create shipping labels.</li>
        <li><b>Your items:</b> descriptions, sizes, photos and the notes you write. Photo location data is removed in your browser before upload.</li>
        <li><b>Activity:</b> swaps, reviews, reports, and a log of actions on the site, used to run swaps, prevent abuse and fix problems.</li>
        <li><b>Payments:</b> handled by our payment provider; we never see or store your full card number. (During the pilot test mode, no payments are taken.)</li>
      </ul>

      <h2>Who sees what</h2>
      <ul className="list-disc pl-5">
        <li>Your item photos and details: only you and our team, until a swap is complete; then your swap partner.</li>
        <li>Your address: our team, the shipping carrier, and your swap partner on the package label. Never on your profile.</li>
        <li>Your nickname, short intro and interests: your swap partner, after the swap is complete.</li>
        <li>Homepage &ldquo;Recent boxes&rdquo; feed: the first word of your nickname, your city and state, the category of a box you submitted and when. You can turn this off in your profile.</li>
        <li>We do not sell your personal information.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We use Vercel (hosting and photo storage), Neon (database), and Anthropic (AI that identifies items from photos and writes riddle clues — your photos and item details are sent to it for that purpose only). Shipping and payment providers will be added before real payments start.</p>

      <h2>Your choices</h2>
      <ul className="list-disc pl-5">
        <li>Edit your profile and preferences any time.</li>
        <li>Delete your account: see <a href="/data-deletion" className="text-plum underline">how to delete your data</a>.</li>
      </ul>

      <h2>Keeping records</h2>
      <p>We keep swap, report and payment records as long as needed to handle disputes and meet legal obligations, then delete or anonymize them.</p>
    </article>
  );
}
