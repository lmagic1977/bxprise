import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { put, get } from "@vercel/blob";
import { db, schema } from "@/db";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), ".uploads");
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;

// Stores an uploaded photo privately. Returns the media id; the file is only
// ever served through /api/media/[id], which checks who is asking.
export async function saveImage(file: File, ownerId: number, kind: "item" | "packing") {
  if (!ALLOWED.includes(file.type)) throw new Error("Photos must be JPEG, PNG or WebP.");
  if (file.size > MAX_BYTES) throw new Error("A photo is too large (max 3 MB after resizing).");
  const id = randomUUID();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const pathname = `${kind}/${ownerId}/${id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (useBlob) {
    await put(pathname, bytes, { access: "private", contentType: file.type, addRandomSuffix: false });
  } else {
    const full = path.join(LOCAL_DIR, pathname);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }
  await db.insert(schema.media).values({ id, ownerId, pathname, contentType: file.type, kind });
  return id;
}

export async function readImage(pathname: string): Promise<ReadableStream | Buffer | null> {
  if (useBlob) {
    const res = await get(pathname, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return res.stream;
  }
  try {
    return await readFile(path.join(LOCAL_DIR, pathname));
  } catch {
    return null;
  }
}
