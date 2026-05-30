import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { randomToken } from "@/lib/tokens";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_BUCKET = "attendance-evidence";

export async function saveUpload(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file maksimal 5 MB.");
  }

  const extension = getSafeExtension(file.name);
  const filename = `${prefix}-${Date.now()}-${randomToken(8)}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return uploadToSupabase(file, bytes, prefix, filename);
  }

  if (process.env.VERCEL) {
    throw new Error("Supabase Storage belum dikonfigurasi untuk upload bukti.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);

  return `/uploads/${filename}`;
}

async function uploadToSupabase(file: File, bytes: Buffer, prefix: string, filename: string) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const objectPath = `${prefix}/${filename}`;
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false
    }
  });

  const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`Upload bukti gagal: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

function getSafeExtension(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
  return allowed.has(extension) ? extension : ".bin";
}
