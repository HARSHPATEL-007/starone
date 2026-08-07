import { useEffect, useState, useCallback } from "react";
import { Brain, RefreshCw, Plus, Trash2, Search, Database, Tag, Star, GraduationCap, X } from "lucide-react";
import { api } from "../api/client";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);
const me = () => {
  try { const s = JSON.parse(localStorage.getItem("n0va_user") || "{}"); return s?.userId || "user_001"; } catch { return "user_001"; }
};

const TOPICS = ["preferences", "goals", "contacts", "context", "note"];

export default function AniMemory() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("note");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const d = unwrap(await api.adsMarketingModule.ani.memory().catch(() => null));
    const s = unwrap(await api.adsMarketingModule.ani.memoryStats().catch(() => null));
    setDash({ ...(d || {}), stats: s });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const search = useCallback(async () => {
    if (!q.trim()) return load();
    const s = unwrap(await api.adsMarketingModule.ani.memorySearch(q.trim()).catch(() => null));
    setDash((p: any) => ({ ...(p || {}), memories: s.memories, total: s.total }));
  }, [q, load]);

  const save = useCallback(async () => {
    if (!text.trim()) return;
    await api.adsMarketingModule.ani.saveMemory({ topic, text: text.trim() }).catch(() => null);
    setText("");
    load();
  }, [topic, text, load]);

  const del = useCallback(async (memoryId: string) => {
    await api.adsMarketingModule.ani.deleteMemory(memoryId).catch(() => null);
    load();
  }, [load]);

  const memories = dash?.memories || [];
  const stats = dash?.stats || {};
  const topics = Object.keys(stats?.byTopic || {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-n0va-400" /> ANI Memory</h1>
          <p className="text-gray-500 mt-1 text-sm">Unified memory that powers every ANI reply across modules</p>
        </div>
        <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{stats?.total ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Memory items</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{topics?.length ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Topics</p></div>
            <div className="card !p-4 col-span-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">By topic</p>
              <div className="flex flex-wrap gap-1.5">
                {topics?.length === 0 && <p className="text-xs text-gray-600">No topics yet.</p>}
                {topics?.map((t: string) => (
                  <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-n0va-500/10 border border-n0va-500/20 text-n0va-300 flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{t} · {stats?.byTopic?.[t]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Database className="w-4 h-4 text-n0va-400" /> Memory entries</h2>
              <div className="space-y-2 mb-3">
                {memories.length === 0 && <p className="text-xs text-gray-500">No memories yet — teach ANI something below.</p>}
                {memories.map((m: any) => (
                  <div key={m.memoryId} className="flex items-start gap-2 text-xs p-3 rounded-lg bg-gray-800/40 border border-gray-700">
                    <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300">{m.text}</p>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{m.topic}</span>
                        <span>importance {m.importance ?? 2}</span>
                        <span>{(m.createdAt || "").slice(0, 10)}</span>
                      </p>
                    </div>
                    <button className="text-gray-600 hover:text-red-400 transition-colors" onClick={() => del(m.memoryId)} title="Delete"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Search memory..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
                <button className="btn-secondary" onClick={search}><Search className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4 text-n0va-400" /> Teach ANI</h2>
              <div className="space-y-2">
                <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea className="input min-h-[90px] resize-none" placeholder="What should ANI remember?" value={text} onChange={(e) => setText(e.target.value)} />
                <button className="btn-primary w-full" onClick={save} disabled={!text.trim()}><GraduationCap className="w-4 h-4" /> Save memory</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}