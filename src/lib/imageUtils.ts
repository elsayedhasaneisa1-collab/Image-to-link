export type ImgFormat = "webp" | "jpeg" | "png" | "original";

export interface ProcessedImage {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string; // mime
  dataUrl: string; // full data url
  shareLink: string; // origin + #i=...
  blob: Blob;
  createdAt: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/** Convert Blob -> dataURL */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** dataURL -> Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Compress an image file via canvas */
export async function compressImage(
  file: File | Blob,
  opts: { maxDimension: number; quality: number; format: ImgFormat }
): Promise<{ blob: Blob; width: number; height: number; mime: string }> {
  const bitmap = await createImageBitmap(file as Blob);
  const { width: iw, height: ih } = bitmap;
  const scale = Math.min(1, opts.maxDimension / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  let mime = "image/webp";
  if (opts.format === "jpeg") mime = "image/jpeg";
  else if (opts.format === "png") mime = "image/png";
  else if (opts.format === "original") {
    mime = (file as File).type || "image/png";
    if (!mime.startsWith("image/")) mime = "image/png";
    // gif / svg keep as-is via direct blob (no canvas re-encode to preserve animation)
    if (mime === "image/gif" || mime === "image/svg+xml") {
      return { blob: file as Blob, width: iw, height: ih, mime };
    }
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("فشل الضغط"))), mime, opts.quality / 100)
  );
  return { blob, width: w, height: h, mime };
}

/** Encode dataUrl into URL-safe payload for hash */
export function encodeForHash(dataUrl: string): string {
  const base64 = dataUrl.split(",")[1] || "";
  const mime = dataUrl.match(/data:(.*?);/)?.[1] || "image/png";
  const payload = `${mime}|${base64}`;
  // url-safe base64
  return btoa(unescape(encodeURIComponent(payload)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeFromHash(hashValue: string): string | null {
  try {
    let b64 = hashValue.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const payload = decodeURIComponent(escape(atob(b64)));
    const sep = payload.indexOf("|");
    if (sep === -1) return null;
    const mime = payload.slice(0, sep);
    const base64 = payload.slice(sep + 1);
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export function buildShareLink(dataUrl: string): string {
  const payload = encodeForHash(dataUrl);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#i=${payload}`;
}

export function getHashImage(): string | null {
  const m = window.location.hash.match(/#i=([A-Za-z0-9\-_]+)/);
  if (!m) return null;
  return decodeFromHash(m[1]);
}

export async function processFile(
  file: File,
  opts: { maxDimension: number; quality: number; format: ImgFormat }
): Promise<ProcessedImage> {
  const { blob, width, height, mime } = await compressImage(file, opts);
  const dataUrl = await blobToDataUrl(blob);
  const shareLink = buildShareLink(dataUrl);
  return {
    id: uid(),
    name: file.name || "صورة",
    originalSize: file.size,
    compressedSize: blob.size,
    width,
    height,
    format: mime,
    dataUrl,
    shareLink,
    blob,
    createdAt: Date.now(),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function extFromMime(mime: string): string {
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "png";
}
