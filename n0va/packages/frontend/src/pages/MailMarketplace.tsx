import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Plus, X, Store, Star, Download, Trash2, CheckCheck, Trophy, ScrollText, DollarSign,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function MailMarketplace() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("all");
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "ai_agents", price: "9" });
  const [rating, setRating] = useState<Record<string, number>>({});

  const loadAll = useCallback(async () => {
    const [d, p, pr] = await Promise.all([
      api.adsMarketingModule.mailMarketplaceDashboard().catch(() => null),
      api.adsMarketingModule.mailMarketplacePending().catch(() => null),
      api.adsMarketingModule.mailMarketplacePrograms().catch(() => null),
    ]);
    setDash(unwrap(d));
    const pR = unwrap(p);
    setPending(Array.isArray(pR) ? pR : pR?.listings || []);
    const prR = unwrap(pr);
    setPrograms(Array.isArray(prR) ? prR : prR?.programs || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function submitListing() {
    if (!form.title.trim()) {
      addToast("warning", "Title required", "Give your listing a title.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceSubmit({ ...form, price: Number(form.price) || 0 }));
      addToast("success", "Listing submitted", r?.summary || "");
      setShowSubmit(false);
      setForm({ title: "", description: "", category: "ai_agents", price: "9" });
      await loadAll();
    } catch (e: any) {
      addToast("error", "Submit failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function install(listingId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceInstall(listingId));
      addToast("success", "Installed", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Install failed", e?.message);
    }
  }

  async function uninstall(listingId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceUninstall(listingId));
      addToast("success", "Uninstalled", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Uninstall failed", e?.message);
    }
  }

  async function rate(listingId: string, value: number) {
    if (!value) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceRate(listingId, value));
      addToast("success", "Rated", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Rating failed", e?.message);
    }
  }

  async function approve(listingId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceApprove(listingId));
      addToast("success", "Approved", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Approve failed", e?.message);
    }
  }

  async function reject(listingId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceReject(listingId, "quality guidelines"));
      addToast("success", "Rejected", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Reject failed", e?.message);
    }
  }

  async function join(programId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailMarketplaceJoinProgram(programId));
      addToast("success", "Program joined", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Join failed", e?.message);
    }
  }

  const catalog = (dash?.catalog || []).filter((l: any) => category === "all" || l.category === category);
  const installed = dash?.installed || [];
  const rev = dash?.revenue || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Store className="w-6 h-6 text-n0va-400" /> Marketplace</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Agents, integrations, themes and templates"}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowSubmit(true)}><Plus className="w-3 h-3" /> Submit listing</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.catalog?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Listings live</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.installedCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Installed</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white flex items-center gap-1"><DollarSign className="w-4 h-4 text-emerald-400" />{rev.devEarnings || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Developer earnings</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{pending.length}</p>
              <p className="text-xs text-gray-500 mt-1">Pending review</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-n0va-400" /> Catalog</h3>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCategory("all")} className={`text-[10px] px-2 py-1 rounded-full border ${category === "all" ? "border-n0va-500 bg-n0va-500/15 text-n0va-300" : "border-gray-800 text-gray-500"}`}>All</button>
                {(dash?.categories || []).map((c: any) => (
                  <button key={c.id} onClick={() => setCategory(c.id)} className={`text-[10px] px-2 py-1 rounded-full border ${category === c.id ? "border-n0va-500 bg-n0va-500/15 text-n0va-300" : "border-gray-800 text-gray-500"}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {catalog.map((l: any) => (
                <div key={l.listingId} className="border border-gray-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{l.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{l.category} · by {l.devId}</p>
                    </div>
                    {l.featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">FEATURED</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2">{l.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{l.rating || "new"}</span>
                    <span>{l.installs} installs</span>
                    <span className="ml-auto text-white font-semibold">{l.price === 0 ? "Free" : `$${l.price}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {l.installed ? (
                      <button className="text-gray-600 hover:text-red-400 text-[11px] flex items-center gap-1" onClick={() => uninstall(l.listingId)}><Trash2 className="w-3 h-3" /> Uninstall</button>
                    ) : (
                      <button className="btn-secondary text-[11px] flex items-center gap-1" onClick={() => install(l.listingId)}><Download className="w-3 h-3" /> Install</button>
                    )}
                    {l.installed && (
                      <select className="text-[10px] bg-gray-800 border border-gray-700 rounded px-1 py-1 ml-auto" value={rating[l.listingId] || ""} onChange={(e) => rate(l.listingId, Number(e.target.value))}>
                        <option value="">Rate…</option>
                        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}★</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CheckCheck className="w-4 h-4 text-n0va-400" /> Installed</h3>
              <div className="space-y-2">
                {installed.map((i: any) => (
                  <div key={i.listingId} className="border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-sm text-white truncate">{i.title}</span>
                    <span className="text-[10px] text-gray-500 ml-auto shrink-0">{i.usageToday} uses today</span>
                    <span className="text-[10px] text-emerald-400 shrink-0">${i.price}/mo</span>
                  </div>
                ))}
                {!installed.length && <p className="text-xs text-gray-600">Nothing installed yet.</p>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-n0va-400" /> Developer programs</h3>
              <div className="space-y-2">
                {programs.map((p: any) => (
                  <div key={p.id} className="border border-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{p.name}</span>
                      <button className="btn-secondary text-[10px] ml-auto shrink-0" onClick={() => join(p.id)}>Join</button>
                    </div>
                    <p className="text-[10px] text-gray-500">{p.requirement} · <span className="text-emerald-400">{p.benefit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-n0va-400" /> Revenue</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-gray-800 rounded-lg p-2"><p className="text-lg font-bold text-white">{rev.listings || 0}</p><p className="text-[10px] text-gray-500">Listings</p></div>
                <div className="border border-gray-800 rounded-lg p-2"><p className="text-lg font-bold text-white">${rev.grossRevenue || 0}</p><p className="text-[10px] text-gray-500">Gross</p></div>
                <div className="border border-gray-800 rounded-lg p-2"><p className="text-lg font-bold text-emerald-400">${rev.devEarnings || 0}</p><p className="text-[10px] text-gray-500">You earn</p></div>
              </div>
              <div className="space-y-1.5">
                {(rev.byCategory || []).map((c: any) => (
                  <div key={c.category} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400 w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-n0va-500 rounded-full" style={{ width: `${Math.min(100, c.listings * 20)}%` }} />
                    </div>
                    <span className="text-gray-500 shrink-0">{c.listings} · ${c.revenue}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ScrollText className="w-4 h-4 text-n0va-400" /> Marketplace activity</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(dash?.recentLog || []).map((l: any) => (
                  <p key={l.entryId} className="text-[10px] text-gray-500 truncate"><span className="text-n0va-300">{l.category}</span> — {l.detail}</p>
                ))}
                {!dash?.recentLog?.length && <p className="text-[11px] text-gray-600">No marketplace events yet.</p>}
              </div>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white">Pending review</h3>
              {pending.map((p: any) => (
                <div key={p.listingId} className="border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm text-white truncate">{p.title}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">{p.category} · ${p.price} · {p.devId}</span>
                  <div className="flex gap-1.5 ml-auto shrink-0">
                    <button className="text-[11px] text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded" onClick={() => approve(p.listingId)}>Approve</button>
                    <button className="text-[11px] text-red-400 border border-red-500/30 px-2 py-1 rounded" onClick={() => reject(p.listingId)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showSubmit && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-n0va-400" /> Submit listing</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowSubmit(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Title</label>
                <input className="input" placeholder="My awesome mail tool" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea className="input" rows={3} placeholder="What does it do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {(dash?.categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Price ($/mo)</label>
                  <input type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowSubmit(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={submitListing}>Submit for review</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}