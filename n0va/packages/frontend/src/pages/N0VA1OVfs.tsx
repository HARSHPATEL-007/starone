import React, { useEffect, useRef, useState } from "react";
import {
  FileText, Upload, Download, RefreshCw, Loader2, Trash2, Search,
  Table, BarChart3, Terminal, Repeat, ArrowRight, HardDrive, Database,
} from "lucide-react";
import { api } from "../api/client";

const unwrap = (r: any) => r?.data ?? r;

function SkeletonCard({ h = 28 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-800/60 p-4"><div style={{ height: h }} className="rounded-md bg-gray-700/60" /></div>;
}

export default function N0VA1OVfs() {
  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: () => {} };
  const toastRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [files, setFiles] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const [upName, setUpName] = useState("");
  const [upSize, setUpSize] = useState(4096);
  const [upContent, setUpContent] = useState("");
  const [offloaded, setOffloaded] = useState(false);

  const [op, setOp] = useState("stats");
  const [p1, setP1] = useState(""); // offset | pattern | query | program | chunkSize
  const [p2, setP2] = useState(""); // length

  const toast = (t: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) toastRef.current(t, type);
    else if (addToast && typeof addToast === "function") addToast(t, type);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f] = await Promise.all([api.adsMarketingModule.n0va1oFiles()]);
      const d = unwrap(f);
      setFiles(Array.isArray(d) ? d : d?.files || []);
      setMeta(Array.isArray(d) ? null : d);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load VFS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const h = () => loadAll();
    window.addEventListener("n0va:refresh-data", h);
    const t = setInterval(() => { if (auto) loadAll(); }, 30000);
    return () => { window.removeEventListener("n0va:refresh-data", h); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const act = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      const d = unwrap(r);
      toast(successMsg || d?.summary || "Done");
      await loadAll();
      return d;
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const selectFile = async (fileId: string) => {
    const f = files.find((x) => x.fileId === fileId);
    setSelected(f);
    try { setDetail(unwrap(await api.adsMarketingModule.n0va1oFile(fileId))); } catch { /* ignore */ }
    setResult(null);
  };

  const runOp = async () => {
    if (!selected) return;
    let d: any = null;
    switch (op) {
      case "stats":
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsSummarizeStats(selected.fileId));
        break;
      case "chunk":
        if (p1 === "" || p2 === "") { toast("Enter offset and length", "error"); return; }
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsChunkRead(selected.fileId, Number(p1), Number(p2)));
        break;
      case "grep":
        if (!p1) { toast("Enter a regex pattern", "error"); return; }
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsGrepSearch(selected.fileId, p1));
        break;
      case "pandas":
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsPandasQuery(selected.fileId, p1));
        break;
      case "awk":
        if (!p1) { toast("Enter an awk program", "error"); return; }
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsAwkProcess(selected.fileId, p1));
        break;
      case "convert":
        if (!p1) { toast("Pick a target format", "error"); return; }
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsConvertFormat(selected.fileId, p1));
        break;
      case "stream":
        d = await act("op", () => api.adsMarketingModule.n0va1oVfsStreamExport(selected.fileId, { chunkSize: Number(p1) || 65536 }));
        break;
    }
    if (d) setResult(unwrap(d));
  };

  const upload = async () => {
    if (!upName) { toast("Enter a filename", "error"); return; }
    const d = await act("upload", () => api.adsMarketingModule.n0va1oPutFile({
      filename: upName,
      sizeBytes: Number(upSize) || 4096,
      content: upContent || undefined,
      offloaded,
    }), "File uploaded");
    if (d) { setUpName(""); setUpContent(""); }
  };

  const delFile = async (fileId: string) => {
    await act(`del`, () => api.adsMarketingModule.n0va1oDeleteFile(fileId), "File removed");
    if (selected?.fileId === fileId) { setSelected(null); setDetail(null); setResult(null); }
  };

  if (loading && !files.length) {
    return <div className="space-y-4"><SkeletonCard h={80} /><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">VFS Explorer</h1>
          <p className="text-sm text-gray-400">Spec §3.3.1 — virtual file store: upload, offload, chunk-read, grep, pandas, awk, convert, stream-export</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800" title="Refresh"><RefreshCw size={16} /></button>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-violet-500" /> Auto 30s
          </label>
        </div>
      </div>

      {loadError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Files", value: meta?.total ?? files.length, icon: <FileText size={16} /> },
          { label: "Offloaded", value: meta?.offloaded ?? 0, icon: <HardDrive size={16} /> },
          { label: "Total bytes", value: `${((meta?.totalBytes ?? 0) / 1024).toFixed(1)} KB`, icon: <Database size={16} /> },
          { label: "Checksums", value: files.filter((f) => f.checksum).length, icon: <BarChart3 size={16} /> },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center gap-2 text-gray-400">{c.icon}<span className="text-xs">{c.label}</span></div>
            <div className="mt-1 text-2xl font-bold text-white">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-200">Upload a file</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs text-gray-400">Filename</label>
            <input value={upName} onChange={(e) => setUpName(e.target.value)} placeholder="revenue.csv" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-gray-400">Size bytes</label>
            <input type="number" value={upSize} onChange={(e) => setUpSize(Number(e.target.value))} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs text-gray-400">Content (inline payload)</label>
            <input value={upContent} onChange={(e) => setUpContent(e.target.value)} placeholder="id,owner&#10;a1,jane" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-gray-400">
            <input type="checkbox" checked={offloaded} onChange={(e) => setOffloaded(e.target.checked)} className="accent-violet-500" /> Offload to vault
          </label>
          <button onClick={upload} disabled={busy === "upload"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
            {busy === "upload" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Files</h2>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {files.map((f: any) => (
              <div key={f.fileId} onClick={() => selectFile(f.fileId)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-800 ${selected?.fileId === f.fileId ? "bg-violet-600/20 ring-1 ring-violet-500/40" : "bg-gray-800/40"}`}>
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate text-gray-200">{f.filename}</span>
                  {f.offloaded && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">vault</span>}
                  {f.checksum && <span className="hidden shrink-0 rounded bg-gray-800 px-1 py-0.5 font-mono text-[10px] text-gray-400 lg:inline">{f.checksum.slice(0, 10)}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500">{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                  <button onClick={(e) => { e.stopPropagation(); delFile(f.fileId); }} className="rounded p-1 text-red-400 hover:bg-red-500/10" title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {files.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No files yet — upload one above.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Operations {selected && <span className="text-gray-500">— {selected.filename}</span>}</h2>
          {!selected ? (
            <p className="py-6 text-center text-sm text-gray-500">Select a file to run operations.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[["stats", "Stats", <BarChart3 key="i" size={13} />], ["chunk", "Chunk read", <ArrowRight key="i" size={13} />], ["grep", "Grep", <Search key="i" size={13} />], ["pandas", "Pandas", <Table key="i" size={13} />], ["awk", "Awk", <Terminal key="i" size={13} />], ["convert", "Convert", <Repeat key="i" size={13} />], ["stream", "Stream", <Download key="i" size={13} />]].map(([id, label, icon]) => (
                  <button key={id as string} onClick={() => { setOp(id as string); setResult(null); }}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${op === id ? "border-violet-500/50 bg-violet-600/20 text-violet-200" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
              {op === "chunk" && (
                <div className="flex flex-wrap gap-2">
                  <input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="offset" type="number" className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
                  <input value={p2} onChange={(e) => setP2(e.target.value)} placeholder="length" type="number" className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
                </div>
              )}
              {op === "grep" && (
                <input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="regex pattern, e.g. jane|john" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              )}
              {op === "pandas" && (
                <input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="query, e.g. mean of col_2" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              )}
              {op === "awk" && (
                <input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="program, e.g. { print $1 } or { sum $2 }" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              )}
              {op === "convert" && (
                <select value={p1} onChange={(e) => setP1(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                  <option value="">Pick target format…</option>
                  {["csv", "json", "md", "html", "txt"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              )}
              {op === "stream" && (
                <input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="chunk size (min 4096, default 65536)" type="number" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
              )}
              <button onClick={runOp} disabled={busy === "op"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
                {busy === "op" ? <Loader2 size={16} className="animate-spin" /> : <PlayIcon />} Run {op}
              </button>
              {result && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-600/10 p-3">
                  <p className="mb-2 text-sm font-medium text-violet-200">{result.summary || "Result"}</p>
                  <pre className="max-h-48 overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-300">{JSON.stringify(result, null, 1)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Detail — {detail.filename}</h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 lg:grid-cols-4">
            <span>Storage: <b className="text-gray-200">{detail.storage || "inline"}</b></span>
            <span>Offloaded: <b className="text-gray-200">{detail.offloaded ? "yes" : "no"}</b></span>
            <span>Checksum: <b className="font-mono text-gray-200">{detail.checksum || "—"}</b></span>
            <span>Size: <b className="text-gray-200">{detail.sizeBytes} B</b></span>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return <span className="mr-1 inline-block"><Download size={13} className="rotate-180" /></span>;
}
