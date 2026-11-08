"use client";
import { useEffect, useRef, useState } from "react";

async function resize(file: File, max = 1600): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) return file;
  // Re-encoding through canvas also drops EXIF, including GPS location.
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

type Shot = { file: File; url: string };

// Phones return one photo per camera shot, so every pick ADDS to the list
// instead of replacing it. The form submits the hidden input named `name`,
// which always holds the full list.
export function PhotoInput({ name, multiple = true, max = 6, label }: { name: string; multiple?: boolean; max?: number; label: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const store = useRef<HTMLInputElement>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const limit = multiple ? max : 1;

  useEffect(() => {
    const dt = new DataTransfer();
    shots.forEach((s) => dt.items.add(s.file));
    if (store.current) store.current.files = dt.files;
  }, [shots]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // let the same photo be picked again after removing it
    if (!picked.length) return;
    setBusy(true);
    const resized = await Promise.all(picked.map((f) => resize(f)));
    setBusy(false);
    setShots((prev) => {
      const base = multiple ? prev : [];
      const room = Math.max(0, limit - base.length);
      return [...base, ...resized.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
  }

  function remove(i: number) {
    setShots((prev) => prev.filter((_, j) => j !== i));
  }

  const full = shots.length >= limit;
  return (
    <div>
      <p className="field-label">{label}</p>
      <input ref={picker} id={name} type="file" accept="image/*" multiple={multiple} onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
      <input ref={store} name={name} type="file" multiple={multiple} className="hidden" tabIndex={-1} aria-hidden />
      <div className="flex flex-wrap gap-2">
        {shots.map((s, i) => (
          <div key={s.url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-xl object-cover" />
            <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-lg leading-none text-white shadow">×</button>
          </div>
        ))}
        {!full && (
          <button type="button" onClick={() => picker.current?.click()} disabled={busy}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-plum/40 bg-plum-soft/40 text-sm font-semibold text-plum">
            <span className="text-2xl leading-none">+</span>
            {busy ? "Adding…" : shots.length ? "Add more" : multiple ? "Add photos" : "Add photo"}
          </button>
        )}
      </div>
      {multiple && <p className="hint">{shots.length} of {limit} photos{shots.length < 3 && name === "photos" ? " — at least 3 needed" : ""}. Take or choose them one at a time or several at once.</p>}
    </div>
  );
}
