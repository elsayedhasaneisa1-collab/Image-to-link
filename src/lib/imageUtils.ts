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

export interface CompressOptions {
  maxDimension: number;
  quality: number;
  format: ImgFormat;
  /** الحد الأقصى لحجم الملف بالكيلوبايت — الافتراضي 500 KB */
  targetSizeKB?: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("فشل الضغط"))), mime, quality)
  );
}

/**
 * ضغط ذكي: يجرّب أعلى جودة ممكنة، ولو الحجم أكبر من المطلوب
 * يقلّل الجودة تدريجياً (binary search) ثم الأبعاد حتى يصبح الملف أقل من الحد المطلوب.
 */
export async function compressImage(
  file: File | Blob,
  opts: CompressOptions
): Promise<{ blob: Blob; width: number; height: number; mime: string }> {
  const bitmap = await createImageBitmap(file as Blob);
  const iw = bitmap.width;
  const ih = bitmap.height;
  const targetKB = Math.max(50, opts.targetSizeKB ?? 500);
  const maxBytes = targetKB * 1024; // نقارن بـ < حتى يكون الناتج أقل من الحد فعلاً

  const sourceMime = (file as File).type || "image/png";
  let mime = "image/webp";
  if (opts.format === "jpeg") mime = "image/jpeg";
  else if (opts.format === "png") mime = "image/png";
  else if (opts.format === "original") {
    // لو الملف الأصلي أصلاً أقل من 500 KB نحتفظ به كما هو (بما في ذلك GIF المتحرك)
    if (file.size < maxBytes) {
      bitmap.close?.();
      return { blob: file as Blob, width: iw, height: ih, mime: sourceMime };
    }
    mime = ["image/jpeg", "image/png", "image/webp"].includes(sourceMime) ? sourceMime : "image/webp";
  }
  if (!["image/webp", "image/jpeg", "image/png"].includes(mime)) mime = "image/webp";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const initialScale = Math.min(1, opts.maxDimension / Math.max(iw, ih));
  let w = Math.max(1, Math.round(iw * initialScale));
  let h = Math.max(1, Math.round(ih * initialScale));
  const maxQuality = Math.max(5, Math.min(100, opts.quality));

  const draw = () => {
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
  };

  try {
    for (let attempt = 0; attempt < 14; attempt++) {
      draw();
      let lastSize = Number.POSITIVE_INFINITY;

      if (mime === "image/png") {
        // PNG لا يتأثر بإعداد الجودة — نختبره ثم نصغّر الأبعاد عند الحاجة
        const blob = await canvasToBlob(canvas, mime, 1);
        lastSize = blob.size;
        if (blob.size < maxBytes) return { blob, width: w, height: h, mime };
      } else {
        // جرّب الجودة المطلوبة أولاً
        const first = await canvasToBlob(canvas, mime, maxQuality / 100);
        lastSize = first.size;
        if (first.size < maxBytes) return { blob: first, width: w, height: h, mime };

        // ابحث عن أعلى جودة تحقق الحجم المطلوب
        let low = 5;
        let high = maxQuality - 1;
        let best: Blob | null = null;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const blob = await canvasToBlob(canvas, mime, mid / 100);
          lastSize = Math.min(lastSize, blob.size);
          if (blob.size < maxBytes) {
            best = blob;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        if (best) return { blob: best, width: w, height: h, mime };
      }

      // الحجم ما زال كبيراً: قلّل الأبعاد بنسبة محسوبة من الحجم الحالي
      if (Math.max(w, h) <= 64) {
        if (mime !== "image/webp") {
          mime = "image/webp"; // أقوى ضغط كمحاولة أخيرة
          continue;
        }
        break;
      }
      const ratio = Math.sqrt(maxBytes / Math.max(lastSize, 1));
      const factor = Math.max(0.42, Math.min(0.88, ratio * 0.9));
      const nw = Math.max(48, Math.round(w * factor));
      const nh = Math.max(48, Math.round(h * factor));
      w = nw === w ? Math.max(48, w - 24) : nw;
      h = nh === h ? Math.max(48, h - 24) : nh;
    }

    // ضمان نهائي: صورة صغيرة WebP — حجمها أقل بكثير من 500 KB
    const finalScale = Math.min(1, 64 / Math.max(iw, ih));
    w = Math.max(1, Math.round(iw * finalScale));
    h = Math.max(1, Math.round(ih * finalScale));
    draw();
    const blob = await canvasToBlob(canvas, "image/webp", 0.25);
    return { blob, width: w, height: h, mime: "image/webp" };
  } finally {
    bitmap.close?.();
  }
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
  opts: CompressOptions
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
