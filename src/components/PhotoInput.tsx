"use client";
import { useRef, useState } from "react";

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

export function PhotoInput({ name, multiple = true, max = 6, label }: { name: string; multiple?: boolean; max?: number; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max);
    setBusy(true);
    const out = await Promise.all(files.map((f) => resize(f)));
    const dt = new DataTransfer();
    out.forEach((f) => dt.items.add(f));
    if (ref.current) ref.current.files = dt.files;
    setPreviews(out.map((f) => URL.createObjectURL(f)));
    setBusy(false);
  }

  return (
    <div>
      <label className="field-label" htmlFor={name}>{label}</label>
      <input ref={ref} id={name} name={name} type="file" accept="image/*" multiple={multiple} onChange={onChange}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-plum-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-plum" />
      {busy && <p className="hint">Preparing photos…</p>}
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
