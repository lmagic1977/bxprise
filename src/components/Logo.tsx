export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center font-extrabold tracking-tight text-ink" style={{ fontSize: size, lineHeight: 1 }}>
      <span aria-hidden>B</span>
      <svg viewBox="0 0 32 32" width={size * 1.05} height={size * 1.05} aria-hidden className="mx-[2px] -translate-y-[1px]">
        <rect x="2" y="4" width="28" height="26" rx="5" fill="#f97316" />
        <rect x="2" y="4" width="28" height="7" rx="3" fill="#ea580c" />
        <path d="M10 14 L22 26 M22 14 L10 26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span aria-hidden>prise</span>
      <span className="sr-only">BXprise</span>
    </span>
  );
}
