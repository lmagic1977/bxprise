"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="card mx-auto max-w-sm space-y-4">
      <h1>{mode === "login" ? "Welcome back" : "Join BXprise"}</h1>
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
      </div>
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{mode === "login" ? "Log in" : "Create account"}</button>
      <p className="text-center text-sm text-ink/60">
        {mode === "login" ? <>New here? <Link className="text-plum underline" href="/signup">Create an account</Link></>
          : <>Have an account? <Link className="text-plum underline" href="/login">Log in</Link></>}
      </p>
    </form>
  );
}
