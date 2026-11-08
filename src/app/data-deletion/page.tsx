export const metadata = { title: "Delete your data · BXprise" };

export default function DataDeletion() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-relaxed">
      <h1>How to delete your BXprise data</h1>
      <p>This applies however you signed up — email, Google or Facebook.</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Log in and open <a href="/profile" className="text-plum underline">Profile</a>.</li>
        <li>At the bottom, choose <b>Request account deletion</b>.</li>
        <li>We finish any swap that is already shipping, then delete your account, photos, address and preferences within 30 days.</li>
      </ol>
      <p>We keep only what we must for open disputes or legal reasons (for example, a record that a swap happened), with your personal details removed.</p>
      <p>Signed in with Facebook? You can also remove BXprise from Facebook → Settings → Apps and websites. That stops future sign-ins; follow the steps above to delete the data we hold.</p>
    </article>
  );
}
