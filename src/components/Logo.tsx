export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-baseline font-black tracking-tight" style={{ fontSize: size, lineHeight: 1, color: "#241238" }}>
      <span aria-hidden="true">B</span>
      <svg viewBox="0 0 100 100" width={size * 1.12} height={size * 1.12} aria-hidden="true" focusable="false" className="mx-[1px] self-center" style={{ overflow: "visible" }}>
<path d="M8 33 Q8 27 14 29 Q50 39 86 29 Q92 27 92 34 V78 Q92 94 77 94 H23 Q8 94 8 78Z" fill="#241238"/>
<path d="M2 19 19 4 Q23 1 28 4 L41 11 Q48 15 48 31 L37 23 18 27 Q14 28 10 26 L3 23 Q0 22 2 19Z" fill="#f97316"/>
<path d="M98 19 81 4 Q77 1 72 4 L59 11 Q52 15 52 31 L63 23 82 27 Q86 28 90 26 L97 23 Q100 22 98 19Z" fill="#f97316"/>
<path d="M23 43 Q38 43 49 55 L40 64 Q33 55 23 55Z M60 66 Q67 75 78 75 V87 Q62 87 51 75Z" fill="#fff"/>
<path d="M26 73 65 43 60 38 Q58 36 62 36 H80 Q84 36 83 40 L80 57 Q79 61 77 58 L72 53 34 83 39 87 Q42 90 38 90 H19 Q15 90 16 86 L20 69 Q21 65 23 69Z" fill="#fff"/>
      </svg>
      <span aria-hidden="true">prise</span>
      <span className="sr-only">BXprise</span>
    </span>
  );
}
