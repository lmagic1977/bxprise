"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { keepOnSubmit } from "./keepForm";

export function ActionButton({
  action, children, className = "btn-primary", confirm,
}: { action: () => Promise<FormState>; children: React.ReactNode; className?: string; confirm?: string }) {
  const [state, run, pending] = useActionState(async () => action(), undefined);
  return (
    <form action={run} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-block">
      <button className={className} disabled={pending}>{pending ? "Working…" : children}</button>
      {state?.error && <p className="mt-1 text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-1 text-sm text-green-700">{state.ok}</p>}
    </form>
  );
}

export function ActionForm({
  action, children, submit, className = "space-y-3",
}: { action: (s: FormState, fd: FormData) => Promise<FormState>; children: React.ReactNode; submit: string; className?: string }) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form onSubmit={keepOnSubmit(run)} className={className}>
      {children}
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Working…" : submit}</button>
    </form>
  );
}
