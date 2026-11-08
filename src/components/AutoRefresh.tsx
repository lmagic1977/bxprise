"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [on, seconds, router]);
  return (
    <label className="flex items-center gap-2 text-sm text-ink/70">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="accent-plum" />
      Auto-refresh every {seconds}s
    </label>
  );
}
