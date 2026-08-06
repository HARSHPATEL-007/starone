import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, RefreshCw, Users, MessageSquare, AlertTriangle, KeyRound, Download, Ban, CheckCircle2, UserCog,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

export default function ChatAdmin() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("admin");

  const load = useCallback(async () => {
    setError(null);
    const [d, s] = await Promise.all([
      api.adsMarketingModule.chat.adminDashboard().catch((e: any) => (setError(String(e?.message || e)), null)),
      api.adsMarketingModule.chat.adminSettings().catch(() => null),
    ]);
    setDash(unwrap(d));
    setSettings(unwrap(s)?.settings || unwrap(s));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    const r = unwrap(await fn().catch(() => null));
    if (r?.summary) addToast("info", r.summary);
    setBusy(null);
    load();
  }

  async function assignAdmin() {
    if (!userId.trim()) return;
    await act("assign", () => api.adsMarketingModule.chat.assignAdmin({ userId: userId.trim(), role }));
    setUserId("");
  }

  const stats = dash?.stats || {};
  const restrictions = settings?.restrictions || dash?.restrictions || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-n0va-400" /> Chat Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">Admins, workspace settings, member access and audit export</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm" onClick={() => act("export", () => api.adsMarketingModule.chat.exportAudit({}))}>
            <Download className="w-4 h-4 inline mr-1" />Export audit
          </button>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : error ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium">Admin access required</p>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
            <button className="btn-secondary text-xs" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4"><p className="text-2xl font-bold text-white">{stats.messages ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Messages</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-n0va-400">{stats.rooms ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Rooms</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-emerald-400">{stats.active_users ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active users</p></div>
            <div className="card !p-4"><p className="text-2xl font-bold text-red-400">{stats.pending_violations ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Pending violations</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><UserCog className="w-4 h-4 text-n0va-400" /> Administrators <span className="text-[11px] text-gray-500">· {dash?.admins?.length ?? 0}</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <input className="input text-xs" placeholder="user id" value={userId} onChange={(e) => setUserId(e.target.value)} />
                <select className="input text-xs" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                </select>
                <button className="btn-primary text-xs" disabled={!userId.trim()} onClick={assignAdmin}>Assign</button>
              </div>
              <div className="space-y-1.5">
                {(dash?.admins || []).map((a: any) => (
                  <div key={a.userId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-800/40">
                    <KeyRound className="w-3.5 h-3.5 text-n0va-400 shrink-0" />
                    <span className="text-gray-200 truncate flex-1">{a.userId}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded uppercase bg-n0va-900/60 text-n0va-300 border border-n0va-700/40">{a.role}</span>
                    <span className="text-[10px] text-gray-500">by {a.assigned_by}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-n0va-400" /> Workspace restrictions</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">Allowed roles</p><p className="text-gray-200 font-semibold mt-0.5">{(restrictions.allowed_roles || []).join(", ") || "—"}</p></div>
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">Max invites/day</p><p className="text-gray-200 font-semibold mt-0.5">{restrictions.max_invites_per_day ?? "—"}</p></div>
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">DMs</p><p className={`font-semibold mt-0.5 ${restrictions.allow_dms === false ? "text-red-400" : "text-emerald-400"}`}>{restrictions.allow_dms === false ? "blocked" : "allowed"}</p></div>
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">AI features</p><p className={`font-semibold mt-0.5 ${restrictions.allow_ai_features === false ? "text-red-400" : "text-emerald-400"}`}>{restrictions.allow_ai_features === false ? "blocked" : "allowed"}</p></div>
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">Threads</p><p className={`font-semibold mt-0.5 ${restrictions.allow_threads === false ? "text-red-400" : "text-emerald-400"}`}>{restrictions.allow_threads === false ? "blocked" : "allowed"}</p></div>
                <div className="p-2 rounded-lg bg-gray-800/40"><p className="text-gray-500">Rooms whitelist</p><p className="text-gray-200 font-semibold mt-0.5 truncate">{(restrictions.allowed_rooms || []).length || "all"}</p></div>
              </div>
              <button className="btn-secondary text-xs mt-3" onClick={() => act("restrict", () => api.adsMarketingModule.chat.updateAdminSettings({ restrictions: { ...restrictions, allow_ai_features: !restrictions.allow_ai_features } }))}>
                {restrictions.allow_ai_features === false ? "Enable AI features" : "Disable AI features"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}