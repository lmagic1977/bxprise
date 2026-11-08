import Link from "next/link";
import { getUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { logout } from "@/app/actions/auth";

export async function Header() {
  const user = await getUser();
  return (
    <header className="border-b border-ink/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} aria-label="BXprise home">
          <Logo size={24} />
        </Link>
        <nav className="flex items-center gap-1 text-sm [&_a]:rounded-lg [&_a]:px-2 [&_a]:py-2.5 [&_button]:px-2 [&_button]:py-2.5">
          <Link href="/how-it-works" className="hidden sm:inline hover:text-plum">How it works</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-plum">My swaps</Link>
              <Link href="/profile" className="hover:text-plum">Profile</Link>
              {user.role === "admin" && <Link href="/admin" className="font-semibold text-plum">Admin</Link>}
              <form action={logout}>
                <button className="text-ink/60 hover:text-ink">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-plum">Log in</Link>
              <Link href="/signup" className="btn-primary !py-1.5">Join</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
