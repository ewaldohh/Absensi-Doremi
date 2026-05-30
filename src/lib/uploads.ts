import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "@/lib/tokens";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function saveUpload(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file maksimal 5 MB.");
  }

  const extension = getSafeExtension(file.name);
  const filename = `${prefix}-${Date.now()}-${randomToken(8)}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  return `/uploads/${filename}`;
}

function getSafeExtension(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
  return allowed.has(extension) ? extension : ".bin";
}
