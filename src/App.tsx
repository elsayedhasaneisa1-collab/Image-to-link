import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  UploadCloud, Link2, Copy, Check, Download, Trash2, Image as ImageIcon,
  ShieldCheck, Zap, Database, Server, X, Search, QrCode, ExternalLink,
  ClipboardPaste, Globe, Settings2, Sparkles, Eye, HardDrive, Lock,
  MousePointerClick, Infinity as InfinityIcon, FileImage, ChevronDown,
  RefreshCw, Share2, Code2, Braces, FileCode2, Wand2, Layers, ArrowDown,
  BadgeCheck, Timer, Gauge
} from "lucide-react";
import {
  processFile, formatBytes, getHashImage, dataUrlToBlob, downloadBlob,
  extFromMime, type ProcessedImage, type ImgFormat
} from "./lib/imageUtils";
import { dbAdd, dbGetAll, dbDelete, dbClear, dbEstimate } from "./lib/db";
import { cn } from "./utils/cn";

/* ---------------- QR component ---------------- */
function QrImg({ text, size = 132 }: { text: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: "#09090b", light: "#ffffff" } })
      .then((u) => alive && setSrc(u))
      .catch(() => {});
    return () => { alive = false; };
  }, [text, size]);
  if (!src) return <div className="bg-white rounded-xl animate-pulse" style={{ width: size, height: size }} />;
  return <img src={src} alt="QR" style={{ width: size, height: size }} className="rounded-xl bg-white p-1" />;
}

/* ---------------- Toast ---------------- */
function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-pop">
      <div className="flex items-center gap-2.5 bg-[#c8ff2e] text-zinc-950 font-semibold text-sm px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(200,255,46,.35)]">
        <BadgeCheck className="w-5 h-5" /> {msg}
      </div>
    </div>
  );
}

/* ---------------- Viewer Mode (when opening a shared link) ---------------- */
function Viewer({ dataUrl }: { dataUrl: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const blob = useMemo(() => dataUrlToBlob(dataUrl), [dataUrl]);
  const size = blob.size;
  const mime = blob.type || "image/png";
  const link = window.location.href;

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); } catch {}
  };

  const goHome = () => { window.location.hash = ""; window.location.reload(); };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <header className="flex items-center justify-between px-5 md:px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c8ff2e] flex items-center justify-center text-zinc-950"><Link2 className="w-5 h-5" /></div>
          <span className="font-bold text-lg">رابطي</span>
          <span className="hidden sm:inline text-[11px] font-mono-latin bg-white/10 px-2 py-1 rounded-full">SHARED IMAGE</span>
        </div>
        <button onClick={goHome} className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full transition">
          <UploadCloud className="w-4 h-4" /> ارفع صورتك أنت كمان
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div className="checker rounded-3xl border border-white/10 p-3 max-w-4xl w-full flex items-center justify-center overflow-hidden">
          <img src={dataUrl} alt="صورة مشتركة" className="max-h-[62vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl animate-pop" />
        </div>

        <div className="w-full max-w-4xl bg-zinc-900/80 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-400 mb-1">معلومات الصورة</p>
            <p className="font-mono-latin text-sm truncate" dir="ltr">{mime} • {formatBytes(size)}</p>
            <p className="text-xs text-zinc-500 mt-1">الصورة موجودة داخل الرابط نفسه — بدون أي سيرفر</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => downloadBlob(blob, `rabti-image.${extFromMime(mime)}`)} className="flex items-center gap-2 bg-[#c8ff2e] text-zinc-950 font-bold px-5 py-2.5 rounded-full hover:brightness-110 transition">
              <Download className="w-4 h-4" /> تحميل
            </button>
            <button onClick={() => copy(link, "link")} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-5 py-2.5 rounded-full transition text-sm">
              {copied === "link" ? <Check className="w-4 h-4 text-[#c8ff2e]" /> : <Copy className="w-4 h-4" />} نسخ الرابط
            </button>
            <button onClick={() => copy(dataUrl, "data")} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-5 py-2.5 rounded-full transition text-sm">
              {copied === "data" ? <Check className="w-4 h-4 text-[#c8ff2e]" /> : <Code2 className="w-4 h-4" />} نسخ Data URL
            </button>
            <a href={dataUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-5 py-2.5 rounded-full transition text-sm">
              <ExternalLink className="w-4 h-4" /> فتح الأصل
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <ShieldCheck className="w-4 h-4 text-[#c8ff2e]" /> تم إنشاء هذا الرابط مجاناً وبدون أي جهة خارجية — الصورة مشفّرة داخل الرابط
        </div>
      </main>
    </div>
  );
}

/* ---------------- Main App ---------------- */
export default function App() {
  const sharedDataUrl = useMemo(() => getHashImage(), []);
  const [settings, setSettings] = useState({ maxDimension: 1400, quality: 85, format: "webp" as ImgFormat, targetSizeKB: 500 });
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [gallery, setGallery] = useState<ProcessedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [showQr, setShowQr] = useState<Record<string, boolean>>({});
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const refreshGallery = useCallback(async () => {
    try {
      const all = await dbGetAll();
      setGallery(all);
      const est = await dbEstimate();
      setStorage(est);
    } catch {}
  }, []);

  useEffect(() => { refreshGallery(); }, [refreshGallery]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) { showToast("اختر ملفات صور فقط"); return; }
    setProcessing(true);
    const newItems: ProcessedImage[] = [];
    for (const f of imgs) {
      try {
        const p = await processFile(f, settings);
        newItems.push(p);
        await dbAdd(p);
      } catch (e) { console.error(e); }
    }
    setResults((r) => [...newItems, ...r]);
    setProcessing(false);
    refreshGallery();
    if (newItems.length) showToast(`تم إنشاء ${newItems.length} رابط بنجاح`);
  }, [settings, refreshGallery]);

  // paste from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length) handleFiles(e.clipboardData.files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  const copyText = async (text: string, key: string, label = "تم نسخ الرابط") => {
    try { await navigator.clipboard.writeText(text); setCopiedKey(key); showToast(label); setTimeout(() => setCopiedKey(null), 2000); }
    catch { showToast("تعذّر النسخ — انسخ يدوياً"); }
  };

  const removeFromGallery = async (id: string) => {
    await dbDelete(id);
    setGallery((g) => g.filter((x) => x.id !== id));
    setResults((r) => r.filter((x) => x.id !== id));
    showToast("تم حذف الصورة");
  };

  const clearAll = async () => { await dbClear(); setGallery([]); setResults([]); showToast("تم مسح كل الصور"); };

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(urlInput.trim());
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not image");
      const file = new File([blob], urlInput.split("/").pop() || "صورة-من-رابط", { type: blob.type });
      await handleFiles([file]);
      setUrlInput(""); setShowUrlBox(false);
    } catch { showToast("تعذّر جلب الصورة — تحقق من الرابط أو CORS"); }
    setProcessing(false);
  };

  const makeDemo = async () => {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 800;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1200, 800);
    g.addColorStop(0, "#c8ff2e"); g.addColorStop(.5, "#22d3ee"); g.addColorStop(1, "#a78bfa");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = "rgba(9,9,11,.88)"; ctx.beginPath(); ctx.arc(300, 300, 180, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c8ff2e"; ctx.font = "bold 90px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("رابطي", 600, 420);
    ctx.fillStyle = "#fff"; ctx.font = "500 34px sans-serif";
    ctx.fillText("صورة تجريبية — بدون سيرفر", 600, 480);
    c.toBlob(async (b) => {
      if (!b) return;
      const f = new File([b], "صورة-تجريبية.png", { type: "image/png" });
      await handleFiles([f]);
    }, "image/png");
  };

  const filteredGallery = useMemo(() => gallery.filter((g) => g.name.includes(search.trim())), [gallery, search]);
  const totalSize = useMemo(() => gallery.reduce((s, g) => s + g.compressedSize, 0), [gallery]);

  if (sharedDataUrl) return <Viewer dataUrl={sharedDataUrl} />;

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[480px] h-[480px] rounded-full bg-[#c8ff2e]/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-[600px] -right-40 w-[420px] h-[420px] rounded-full bg-cyan-400/10 blur-[140px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/75 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c8ff2e] flex items-center justify-center text-zinc-950 shadow-[0_0_30px_rgba(200,255,46,.4)]"><Link2 className="w-5 h-5" strokeWidth={2.5} /></div>
            <div>
              <p className="font-bold text-lg leading-none">رابطي</p>
              <p className="text-[11px] text-zinc-500 font-mono-latin" dir="ltr">RABTI • FREE LINK</p>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-[#c8ff2e]/15 text-[#c8ff2e] border border-[#c8ff2e]/30 px-3 py-1 rounded-full font-semibold"><InfinityIcon className="w-3.5 h-3.5" /> مجاني 100%</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a href="#upload" className="hover:text-white transition">رفع صورة</a>
            <a href="#gallery" className="hover:text-white transition">معرضي <span className="text-[#c8ff2e] font-mono-latin">({gallery.length})</span></a>
            <a href="#how" className="hover:text-white transition">إزاي بيشتغل؟</a>
          </nav>
          <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-full">
            <HardDrive className="w-4 h-4 text-[#c8ff2e]" />
            <span className="hidden sm:inline text-zinc-400">مستخدم:</span>
            <span className="font-mono-latin font-semibold">{formatBytes(totalSize)}</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-zinc-300 mb-6 animate-fade">
              <span className="w-2 h-2 rounded-full bg-[#c8ff2e] animate-pulse" />
              بدون سيرفر • بدون قاعدة بيانات • بدون تسجيل
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              ارفع صورة.
              <br />
              <span className="text-[#c8ff2e]">خد رابط</span> فوراً.
            </h1>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
              أداة مجانية تماماً بتحوّل أي صورة لرابط قابل للمشاركة — <b className="text-white">كل شيء بيتم في متصفحك</b>،
              الصورة بتتضغط وتتشفّر جوه الرابط نفسه. مفيش رفع لأي سيرفر، مفيش حسابات، مفيش حدود.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { icon: Server, t: "بدون سيرفر" },
                { icon: Database, t: "بدون قاعدة بيانات" },
                { icon: Lock, t: "خصوصية كاملة" },
                { icon: Zap, t: "فوري" },
              ].map((b) => (
                <span key={b.t} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm">
                  <b.icon className="w-4 h-4 text-[#c8ff2e]" /> {b.t}
                </span>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-zinc-500">
              <span className="flex items-center gap-2"><Timer className="w-4 h-4" /> أقل من ثانية</span>
              <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> ضغط ذكي WebP</span>
              <span className="flex items-center gap-2"><Share2 className="w-4 h-4" /> مشاركة فورية</span>
            </div>
          </div>

          {/* Upload card */}
          <div id="upload" className="relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-[#c8ff2e]/40 via-transparent to-cyan-400/30 rounded-[28px] blur-xl opacity-60" />
            <div className="relative bg-zinc-950/90 border border-white/10 rounded-[24px] p-5 md:p-6 shadow-2xl">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-10 text-center transition-all",
                  dragOver ? "border-[#c8ff2e] bg-[#c8ff2e]/10 scale-[1.01]" : "border-white/15 hover:border-[#c8ff2e]/60 hover:bg-white/[.03]"
                )}
              >
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                <div className={cn("mx-auto w-16 h-16 rounded-2xl bg-[#c8ff2e] text-zinc-950 flex items-center justify-center mb-4", dragOver && "animate-pulse-ring")}>
                  {processing ? <RefreshCw className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                </div>
                <p className="text-xl font-bold">{dragOver ? "سيب الصورة هنا!" : "اسحب صورتك هنا"}</p>
                <p className="text-zinc-500 text-sm mt-2">أو اضغط للاختيار • أو الصق بـ <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono-latin text-xs" dir="ltr">Ctrl + V</kbd></p>
                <p className="text-xs text-zinc-600 mt-3">PNG • JPG • WebP • GIF — صور متعددة مسموحة</p>
                <p className="inline-flex items-center gap-1.5 text-xs text-[#c8ff2e] bg-[#c8ff2e]/10 border border-[#c8ff2e]/25 rounded-full px-3 py-1.5 mt-3 font-semibold"><Zap className="w-3.5 h-3.5" /> ضغط تلقائي — الناتج أقل من {settings.targetSizeKB} KB</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm transition">
                  <ImageIcon className="w-4 h-4 text-[#c8ff2e]" /> اختيار صورة
                </button>
                <button onClick={async () => { try { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => x.startsWith("image/")); if (t) { const b = await it.getType(t); await handleFiles([new File([b], "لصق.png", { type: t })]); } } } catch { showToast("اسمح بالوصول للحافظة أو الصق بـ Ctrl+V"); } }} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm transition">
                  <ClipboardPaste className="w-4 h-4 text-[#c8ff2e]" /> لصق
                </button>
                <button onClick={() => setShowUrlBox(!showUrlBox)} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm transition">
                  <Globe className="w-4 h-4 text-[#c8ff2e]" /> من رابط
                </button>
              </div>

              {showUrlBox && (
                <div className="mt-3 flex gap-2 animate-pop">
                  <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchFromUrl()} placeholder="https://example.com/image.jpg" dir="ltr" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#c8ff2e]/60 placeholder:text-zinc-600" />
                  <button onClick={fetchFromUrl} className="bg-[#c8ff2e] text-zinc-950 font-bold px-5 rounded-xl text-sm hover:brightness-110">جلب</button>
                </div>
              )}

              <button onClick={makeDemo} className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-[#c8ff2e] py-1 transition">
                <Wand2 className="w-4 h-4" /> معندكش صورة؟ جرّب بصورة تجريبية
              </button>

              {/* Settings */}
              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Settings2 className="w-4 h-4 text-[#c8ff2e]" /> إعدادات الضغط</span>
                  <span className="text-[11px] text-zinc-500">تُطبّق على الرفع القادم</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#c8ff2e]/[.06] border border-[#c8ff2e]/20 rounded-xl p-3">
                    <div className="flex justify-between text-xs mb-2.5"><span className="text-zinc-300 font-semibold">الحد الأقصى لحجم الصورة</span><span className="font-mono-latin text-[#c8ff2e]">&lt; {settings.targetSizeKB} KB</span></div>
                    <div className="flex gap-2">
                      {[100, 250, 500].map((kb) => (
                        <button key={kb} onClick={() => setSettings({ ...settings, targetSizeKB: kb })} className={cn("flex-1 py-2 rounded-lg text-xs font-mono-latin border transition", settings.targetSizeKB === kb ? "bg-[#c8ff2e] text-zinc-950 border-[#c8ff2e] font-bold" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10")}>
                          {kb} KB
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2">بنقلّل الجودة أولاً ثم الأبعاد تلقائياً لحد ما الصورة تبقى أقل من الحجم المطلوب.</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2"><span className="text-zinc-400">أقصى بُعد</span><span className="font-mono-latin text-[#c8ff2e]">{settings.maxDimension}px</span></div>
                    <input type="range" min={400} max={2400} step={100} value={settings.maxDimension} onChange={(e) => setSettings({ ...settings, maxDimension: +e.target.value })} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2"><span className="text-zinc-400">الجودة</span><span className="font-mono-latin text-[#c8ff2e]">{settings.quality}%</span></div>
                    <input type="range" min={30} max={100} step={5} value={settings.quality} onChange={(e) => setSettings({ ...settings, quality: +e.target.value })} className="w-full" />
                  </div>
                  <div className="flex gap-2">
                    {(["webp", "jpeg", "png", "original"] as ImgFormat[]).map((f) => (
                      <button key={f} onClick={() => setSettings({ ...settings, format: f })} className={cn("flex-1 py-2 rounded-xl text-xs font-mono-latin border transition", settings.format === f ? "bg-[#c8ff2e] text-zinc-950 border-[#c8ff2e] font-bold" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10")}>
                        {f === "original" ? "الأصلي" : f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-y border-white/10 py-3 overflow-hidden bg-white/[.02]" dir="ltr">
        <div className="flex whitespace-nowrap animate-marquee gap-0 w-max">
          {[0, 1].map((n) => (
            <span key={n} className="font-mono-latin text-sm text-zinc-500">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="mx-6">FREE • NO SERVER • NO DATABASE • NO SIGN-UP • INSTANT LINK • 100% PRIVATE •</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3"><Sparkles className="w-6 h-6 text-[#c8ff2e]" /> روابطك جاهزة <span className="text-sm bg-[#c8ff2e] text-zinc-950 px-2.5 py-0.5 rounded-full font-mono-latin">{results.length}</span></h2>
            <button onClick={() => setResults([])} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1"><X className="w-4 h-4" /> إخفاء</button>
          </div>
          <div className="space-y-5">
            {results.map((item, idx) => {
              const saved = item.originalSize > 0 ? Math.max(0, Math.round((1 - item.compressedSize / item.originalSize) * 100)) : 0;
              const isLong = item.shareLink.length > 600000;
              const isOpen = expanded[item.id];
              return (
                <article key={item.id} className="bg-zinc-900/70 border border-white/10 rounded-3xl overflow-hidden animate-pop" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="grid md:grid-cols-[280px_1fr]">
                    <div className="checker p-3 flex items-center justify-center min-h-[200px]">
                      <img src={item.dataUrl} alt={item.name} className="max-h-56 w-auto max-w-full object-contain rounded-xl shadow-lg" />
                    </div>
                    <div className="p-5 md:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold truncate">{item.name}</h3>
                          <p className="text-xs text-zinc-500 font-mono-latin mt-1" dir="ltr">{item.width}×{item.height} • {item.format} • {formatBytes(item.compressedSize)} {saved > 0 && <span className="text-[#c8ff2e]">(−{saved}%)</span>}</p>
                        </div>
                        <span className="shrink-0 text-[11px] bg-[#c8ff2e]/15 text-[#c8ff2e] border border-[#c8ff2e]/30 px-2.5 py-1 rounded-full font-semibold">{item.compressedSize < 500 * 1024 ? "أقل من 500 KB ✓" : "رابط جاهز ✓"}</span>
                      </div>

                      {isLong && <p className="mt-3 text-xs bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-xl px-3 py-2">⚠ الرابط طويل ({formatBytes(item.shareLink.length)}) — قلّل الجودة أو البُعد للحصول على رابط أقصر.</p>}

                      <div className="mt-4 flex gap-2">
                        <div className="flex-1 flex items-center bg-zinc-950 border border-white/10 rounded-xl overflow-hidden">
                          <Link2 className="w-4 h-4 text-[#c8ff2e] mr-3 shrink-0" />
                          <input readOnly value={item.shareLink} dir="ltr" onFocus={(e) => e.target.select()} className="flex-1 bg-transparent py-3 px-2 text-xs font-mono-latin outline-none truncate" />
                        </div>
                        <button onClick={() => copyText(item.shareLink, item.id)} className="shrink-0 flex items-center gap-2 bg-[#c8ff2e] text-zinc-950 font-bold px-5 rounded-xl hover:brightness-110 transition text-sm">
                          {copiedKey === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedKey === item.id ? "اتنسخ!" : "نسخ الرابط"}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => downloadBlob(item.blob, item.name.replace(/\.[^.]+$/, "") + "." + extFromMime(item.format))} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full transition"><Download className="w-3.5 h-3.5" /> تحميل الصورة</button>
                        <a href={item.shareLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full transition"><Eye className="w-3.5 h-3.5" /> معاينة الرابط</a>
                        <button onClick={() => setShowQr((s) => ({ ...s, [item.id]: !s[item.id] }))} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full transition"><QrCode className="w-3.5 h-3.5" /> QR</button>
                        <button onClick={() => setExpanded((s) => ({ ...s, [item.id]: !s[item.id] }))} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full transition"><ChevronDown className={cn("w-3.5 h-3.5 transition", isOpen && "rotate-180")} /> صيغ أخرى</button>
                        <button onClick={() => removeFromGallery(item.id)} className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 px-3.5 py-2 rounded-full transition"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                      </div>

                      {showQr[item.id] && (
                        <div className="mt-4 flex items-center gap-4 bg-white/[.03] border border-white/10 rounded-2xl p-4 animate-pop">
                          <QrImg text={item.shareLink} />
                          <div>
                            <p className="font-semibold text-sm">امسح الكود بكاميرا موبايلك</p>
                            <p className="text-xs text-zinc-500 mt-1">الكود بيفتح نفس الرابط مباشرة — بدون أي تطبيق</p>
                          </div>
                        </div>
                      )}

                      {isOpen && (
                        <div className="mt-4 grid sm:grid-cols-3 gap-2 animate-pop">
                          <button onClick={() => copyText(`![${item.name}](${item.shareLink})`, item.id + "md", "اتنسخ Markdown")} className="text-right bg-zinc-950 border border-white/10 rounded-xl p-3 hover:border-[#c8ff2e]/50 transition">
                            <Braces className="w-4 h-4 text-[#c8ff2e] mb-1.5" /><p className="text-xs font-bold">Markdown</p><p className="text-[11px] text-zinc-500 font-mono-latin truncate" dir="ltr">![]()</p>
                          </button>
                          <button onClick={() => copyText(`<img src="${item.shareLink}" alt="${item.name}" />`, item.id + "html", "اتنسخ HTML")} className="text-right bg-zinc-950 border border-white/10 rounded-xl p-3 hover:border-[#c8ff2e]/50 transition">
                            <FileCode2 className="w-4 h-4 text-[#c8ff2e] mb-1.5" /><p className="text-xs font-bold">HTML</p><p className="text-[11px] text-zinc-500 font-mono-latin truncate" dir="ltr">&lt;img src="" /&gt;</p>
                          </button>
                          <button onClick={() => copyText(item.dataUrl, item.id + "data", "اتنسخ Data URL")} className="text-right bg-zinc-950 border border-white/10 rounded-xl p-3 hover:border-[#c8ff2e]/50 transition">
                            <Code2 className="w-4 h-4 text-[#c8ff2e] mb-1.5" /><p className="text-xs font-bold">Data URL</p><p className="text-[11px] text-zinc-500 font-mono-latin truncate" dir="ltr">data:image/...</p>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section id="gallery" className="max-w-7xl mx-auto px-5 md:px-8 py-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3"><Layers className="w-6 h-6 text-[#c8ff2e]" /> معرضي المحلي</h2>
            <p className="text-sm text-zinc-500 mt-1">صورك محفوظة في متصفحك فقط (IndexedDB) — {formatBytes(totalSize)} مستخدمة{storage.quota ? ` من ${formatBytes(storage.quota)}` : ""} • {gallery.length} صورة</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الصورة..." className="bg-white/5 border border-white/10 rounded-full pr-9 pl-4 py-2.5 text-sm outline-none focus:border-[#c8ff2e]/60 w-56" />
            </div>
            {gallery.length > 0 && <button onClick={clearAll} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2.5 rounded-full hover:bg-red-500/20 transition">مسح الكل</button>}
          </div>
        </div>

        {filteredGallery.length === 0 ? (
          <div className="border border-dashed border-white/15 rounded-3xl py-16 text-center">
            <FileImage className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 font-semibold">لسه مفيش صور هنا</p>
            <p className="text-sm text-zinc-600 mt-1">ارفع أول صورة من الأعلى وهتظهر هنا تلقائياً</p>
            <a href="#upload" className="inline-flex items-center gap-2 mt-5 bg-[#c8ff2e] text-zinc-950 font-bold px-6 py-2.5 rounded-full text-sm hover:brightness-110"><ArrowDown className="w-4 h-4" /> ارفع صورة</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGallery.map((g) => (
              <div key={g.id} className="group bg-zinc-900/70 border border-white/10 rounded-2xl overflow-hidden hover:border-[#c8ff2e]/40 transition animate-pop">
                <div className="checker aspect-square flex items-center justify-center p-2 relative">
                  <img src={g.dataUrl} alt={g.name} className="max-h-full max-w-full object-contain rounded-lg" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button onClick={() => copyText(g.shareLink, g.id)} title="نسخ الرابط" className="w-10 h-10 rounded-full bg-[#c8ff2e] text-zinc-950 flex items-center justify-center hover:scale-110 transition">{copiedKey === g.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                    <button onClick={() => downloadBlob(g.blob, g.name)} title="تحميل" className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-110 transition"><Download className="w-5 h-5" /></button>
                    <a href={g.shareLink} target="_blank" rel="noreferrer" title="فتح الرابط" className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:scale-110 transition"><ExternalLink className="w-5 h-5" /></a>
                    <button onClick={() => removeFromGallery(g.id)} title="حذف" className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold truncate">{g.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono-latin mt-0.5" dir="ltr">{g.width}×{g.height} • {formatBytes(g.compressedSize)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-5 md:px-8 py-16 border-t border-white/10">
        <h2 className="text-3xl md:text-4xl font-bold text-center">إزاي بيشتغل <span className="text-[#c8ff2e]">من غير سيرفر؟</span></h2>
        <p className="text-center text-zinc-500 mt-3 max-w-2xl mx-auto">الفكرة بسيطة وعبقرية: الرابط <b className="text-white">هو</b> الصورة. مفيش حاجة بتتسجل في أي مكان تاني.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { n: "01", icon: MousePointerClick, t: "ارفع الصورة", d: "اسحب، اختر، أو الصق أي صورة. بتتقرأ مباشرة في متصفحك — مفيش أي رفع لخادم." },
            { n: "02", icon: Zap, t: "ضغط وترميز فوري", d: "بتتضغط بـ WebP وتتحول لترميز Base64، وبعدين بتتضغط تاني كرابط آمن للاستخدام في URL." },
            { n: "03", icon: Share2, t: "شارك الرابط", d: "الرابط بيحتوي الصورة كاملة. أي حد يفتحه هيشوف الصورة فوراً — من غير ما تكون موجودة على أي سيرفر." },
          ].map((s) => (
            <div key={s.n} className="relative bg-zinc-900/70 border border-white/10 rounded-3xl p-7 hover:border-[#c8ff2e]/40 hover:-translate-y-1 transition-all">
              <span className="absolute top-5 left-6 font-mono-latin text-5xl font-bold text-white/5" dir="ltr">{s.n}</span>
              <div className="w-12 h-12 rounded-2xl bg-[#c8ff2e] text-zinc-950 flex items-center justify-center mb-5"><s.icon className="w-6 h-6" /></div>
              <h3 className="font-bold text-lg mb-2">{s.t}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4 text-center">
          {[
            { icon: ShieldCheck, t: "خصوصية مطلقة", d: "صورك عمرها ما بتغادر جهازك" },
            { icon: InfinityIcon, t: "بلا حدود", d: "ارفع قد ما عايز، مجاناً للأبد" },
            { icon: Lock, t: "آمن 100%", d: "مفيش حسابات ولا تتبّع ولا إعلانات" },
          ].map((b) => (
            <div key={b.t} className="flex items-center justify-center gap-3 bg-white/[.03] border border-white/10 rounded-2xl py-5 px-4">
              <b.icon className="w-6 h-6 text-[#c8ff2e] shrink-0" />
              <div className="text-right"><p className="font-bold text-sm">{b.t}</p><p className="text-xs text-zinc-500">{b.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#c8ff2e] flex items-center justify-center text-zinc-950"><Link2 className="w-4 h-4" /></div>
            <span className="font-bold text-white">رابطي</span> — صُنع ليشتغل بدون أي جهة خارجية
          </div>
          <p className="font-mono-latin text-xs" dir="ltr">100% CLIENT-SIDE • NO SERVER • NO DATABASE • NO TRACKING</p>
        </div>
      </footer>

      {toast && <Toast msg={toast} />}
    </div>
  );
}
