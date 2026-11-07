export function Photos({ ids, size = "h-28 w-28" }: { ids: string[]; size?: string }) {
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <a key={id} href={`/api/media/${id}`} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${id}`} alt="" className={`${size} rounded-xl object-cover`} />
        </a>
      ))}
    </div>
  );
}
