"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { keepOnSubmit } from "./keepForm";

export function AuthForm({ mode, providers = [], oauthError }: { mode: "login" | "signup"; providers?: string[]; oauthError?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <form onSubmit={keepOnSubmit(action)} className="card mx-auto max-w-sm space-y-4">
      <h1 className="flex items-baseline gap-1.5">
        {mode === "login" ? "Welcome back" : <>Join <Logo size={24} /></>}
      </h1>
      {oauthError && <p className="text-sm text-red-700" role="alert">{oauthError}</p>}
      {providers.length > 0 && (
        <div className="space-y-2">
          {providers.includes("google") && (
            <a href="/api/auth/google/start" className="btn-ghost w-full">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </a>
          )}
          {providers.includes("facebook") && (
            <a href="/api/auth/facebook/start" className="btn w-full bg-[#1877F2] text-white hover:bg-[#166fe5]">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="#fff"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>
              Continue with Facebook
            </a>
          )}
          <p className="text-center text-xs text-ink/50">or with email</p>
        </div>
      )}
      {mode === "signup" && (
        <div>
          <label className="field-label" htmlFor="displayName">Nickname</label>
          <input className="input" id="displayName" name="displayName" required maxLength={40} />
          <p className="hint">Shown to your swap partner after the swap. Not your real name.</p>
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" required minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {mode === "signup" && <p className="hint">At least 8 characters.</p>}
      </div>
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      {mode === "signup" && (
        <p className="text-xs text-ink/60">BXprise is for adults 18+ in the US. By creating an account you agree to the <a href="/how-it-works" target="_blank" className="underline">swap rules</a> and how we handle your data (<a href="/privacy" target="_blank" className="underline">privacy</a>). You&apos;ll confirm your age on the next step.</p>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? (mode === "login" ? "Logging in…" : "Creating account…") : mode === "login" ? "Log in" : "Create account"}</button>
      <p className="text-center text-sm text-ink/60">
        {mode === "login" ? <>New here? <Link className="text-plum underline" href="/signup">Create an account</Link></>
          : <>Have an account? <Link className="text-plum underline" href="/login">Log in</Link></>}
      </p>
    </form>
  );
}
