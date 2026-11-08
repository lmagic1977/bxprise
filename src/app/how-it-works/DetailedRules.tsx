"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function DetailedRules({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function revealLinkedRule() {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target && ref.current?.contains(target)) {
        ref.current.open = true;
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    }
    revealLinkedRule();
    window.addEventListener("hashchange", revealLinkedRule);
    return () => window.removeEventListener("hashchange", revealLinkedRule);
  }, []);

  return (
    <details ref={ref} className="group rounded-2xl border border-ink/15 bg-white shadow-sm">
      <summary className="cursor-pointer rounded-2xl px-5 py-5 font-semibold marker:text-plum hover:bg-plum-soft/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum">
        Detailed rules &amp; FAQs
        <span className="mt-1 block pl-4 text-sm font-normal text-ink/60">
          Item requirements, value tiers, postage, matching, reviews, problems and privacy
        </span>
      </summary>
      <div className="space-y-6 border-t border-ink/10 p-5 sm:p-6 [&_h2]:scroll-mt-6">
        {children}
      </div>
    </details>
  );
}
