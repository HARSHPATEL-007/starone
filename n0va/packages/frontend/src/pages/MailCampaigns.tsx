import { useEffect, useState, useCallback } from "react";
import {
  Megaphone, RefreshCw, Plus, X, Rocket, CheckCircle2, XCircle, Pause, Play, Trash2, BarChart3, MessageSquare, ListChecks,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const statusColor: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  pending_approval: "bg-amber-500/15 text-amber-400",
  active: "bg-n0va-500/15 text-n0va-300",
  paused: "bg-orange-500/15 text-orange-400",
  rejected: "bg-red-500/15 text-red-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  sent: "bg-emerald-500/15 text-emerald-400",
};

const emptyForm = { name: "", mailboxId: "", templateId: "", audienceMode: "all", audienceValue: "", abSubject: "", scheduleAt: "" };

export default function MailCampaigns() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statsFor, setStatsFor] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [responses, setResponses] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [d, c, t, mb, l] = await Promise.all([
      api.adsMarketingModule.mailCampaignsDashboard().catch(() => null),
      api.adsMarketingModule.mailCampaigns().catch(() => null),
      api.adsMarketingModule.mailTemplateStats().catch(() => null),
      api.adsMarketingModule.mailMailboxes().catch(() => null),
      api.adsMarketingModule.mailCampaignLog().catch(() => null),
    ]);
    setDash(unwrap(d));
    const cR = unwrap(c);
    setCampaigns(Array.isArray(cR) ? cR : cR?.campaigns || []);
    const tR = unwrap(t);
    setTemplates(Array.isArray(tR) ? tR : tR?.templates || []);
    const mbs = unwrap(mb);
    setMailboxes(Array.isArray(mbs) ? mbs : mbs?.data || []);
    const lR = unwrap(l);
    setLog(Array.isArray(lR) ? lR : lR?.log || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function act(fn: () => Promise<any>, okMsg: string, errMsg: string) {
    setBusy(true);
    try {
      const r = unwrap(await fn());
      addToast("success", okMsg, r?.summary || "");
      await loadAll();
      if (statsFor) closeStats();
    } catch (e: any) {
      addToast("error", errMsg, e?.message);
    } finally {
      setBusy(false);
    }
  }

  function closeStats() {
    setStatsFor(null);
    setStats(null);
    setResponses(null);
  }

  async function showStats(c: any) {
    setStatsFor(c);
    setStats(null);
    setResponses(null);
    const [s, r] = await Promise.all([
      api.adsMarketingModule.mailCampaignStats(c.campaignId).catch(() => null),
      api.adsMarketingModule.mailCampaignResponseHandling(c.campaignId).catch(() => null),
    ]);
    setStats(unwrap(s));
    setResponses(unwrap(r));
  }

  async function createCampaign() {
    if (!form.name.trim() || !form.mailboxId || !form.templateId) {
      addToast("warning", "Missing fields", "Name, mailbox and template are required.");
      return;
    }
    setBusy(true);
    try {
      const audience = form.audienceMode === "all" ? { all: true }
        : form.audienceMode === "groups" ? { groups: form.audienceValue.split(/[,\n]/).map(s => s.trim()).filter(Boolean) }
        : { query: form.audienceValue.trim() };
      const r = unwrap(await api.adsMarketingModule.mailCreateCampaign(form.mailboxId, {
        name: form.name.trim(),
        templateId: form.templateId,
        audience,
        abSubject: form.abSubject.trim() || undefined,
        scheduleAt: form.scheduleAt || undefined,
      }));
      addToast("success", "Campaign created", r?.summary || "");
      setShowCreate(false);
      setForm(emptyForm);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Megaphone className="w-6 h-6 text-n0va-400" /> Bulk campaigns</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "Audience-targeted sends with A/B testing and approval gates"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ ...emptyForm, mailboxId: mailboxes[0]?.mailboxId || "", templateId: templates[0]?.templateId || "" }); setShowCreate(true); }}>
            <Plus className="w-4 h-4" /> New campaign
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.totals?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Campaigns</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-amber-400">{dash?.totals?.pendingApproval || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.sent || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Messages sent</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{dash?.opened || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Opens</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ListChecks className="w-4 h-4 text-n0va-400" /> Campaigns</h3>
            {campaigns.map((c: any) => (
              <div key={c.campaignId} className="border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${statusColor[c.status] || "bg-gray-500/10 text-gray-400"}`}>{c.status.replace("_", " ")}</span>
                  <h4 className="font-medium text-white truncate">{c.name}</h4>
                  <span className="text-[10px] text-gray-500 ml-auto">{c.recipients} recipient(s)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                  <span>Sent {c.stats?.sent || 0}</span>
                  <span>Opened {c.stats?.opened || 0}</span>
                  <span>Clicked {c.stats?.clicked || 0}</span>
                  <span>Replied {c.stats?.replied || 0}</span>
                  {c.abSubject && <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-500/15 text-n0va-300">A/B test</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(c.status === "draft" || c.status === "rejected") && (
                    <button className="btn-primary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailLaunchCampaign(c.campaignId), "Campaign launched", "Launch failed")}>
                      <Rocket className="w-3 h-3" /> Launch
                    </button>
                  )}
                  {c.status === "pending_approval" && (
                    <>
                      <button className="btn-primary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailApproveCampaign(c.campaignId, "user_001"), "Campaign approved", "Approve failed")}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button className="btn-secondary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailRejectCampaign(c.campaignId, "rejected by reviewer"), "Campaign rejected", "Reject failed")}>
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {(c.status === "completed" || c.status === "sent" || c.status === "active" || c.status === "paused") && (
                    <>
                      {c.status === "paused"
                        ? <button className="btn-secondary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailResumeCampaign(c.campaignId), "Campaign resumed", "Resume failed")}><Play className="w-3 h-3" /> Resume</button>
                        : <button className="btn-secondary text-xs flex items-center gap-1" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailPauseCampaign(c.campaignId), "Campaign paused", "Pause failed")}><Pause className="w-3 h-3" /> Pause</button>}
                    </>
                  )}
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => showStats(c)}><BarChart3 className="w-3 h-3" /> Stats</button>
                  {c.status !== "active" && c.status !== "pending_approval" && (
                    <button className="text-gray-500 hover:text-red-400 p-1 ml-auto" title="Delete" disabled={busy} onClick={() => act(() => api.adsMarketingModule.mailDeleteCampaign(c.campaignId), "Campaign deleted", "Delete failed")}><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <p className="text-xs text-gray-600">No campaigns yet — create one to send to a contact segment.</p>}
          </div>

          {log.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Campaign log</h3>
              <ul className="divide-y divide-gray-800/50">
                {log.slice(0, 8).map((e: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 py-2 text-xs">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${e.action === "approved" ? "bg-emerald-500/15 text-emerald-400" : e.action === "auto_paused" ? "bg-red-500/15 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>{e.action.replace("_", " ")}</span>
                    <span className="text-gray-300 truncate">{e.name}</span>
                    <span className="text-gray-600 ml-auto shrink-0">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><Megaphone className="w-4 h-4 text-n0va-400" /> New campaign</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="input" placeholder="Q3 partner outreach" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From mailbox</label>
                  <select className="select" value={form.mailboxId} onChange={(e) => setForm({ ...form, mailboxId: e.target.value })}>
                    {mailboxes.map((mb: any) => <option key={mb.mailboxId} value={mb.mailboxId}>{mb.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Template</label>
                  <select className="select" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                    {templates.map((t: any) => <option key={t.templateId} value={t.templateId}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Audience</label>
                <select className="select" value={form.audienceMode} onChange={(e) => setForm({ ...form, audienceMode: e.target.value })}>
                  <option value="all">All contacts</option>
                  <option value="groups">Groups (tags)</option>
                  <option value="query">Search</option>
                </select>
              </div>
              {form.audienceMode !== "all" && (
                <input className="input" placeholder={form.audienceMode === "groups" ? "partners, leads (comma separated)" : "e.g. partner"} value={form.audienceValue} onChange={(e) => setForm({ ...form, audienceValue: e.target.value })} />
              )}
              <div>
                <label className="text-xs text-gray-400 block mb-1">A/B subject <span className="text-gray-600">(optional — half of recipients get this)</span></label>
                <input className="input" placeholder="Your chance to {{firstName}} — last seats" value={form.abSubject} onChange={(e) => setForm({ ...form, abSubject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Schedule <span className="text-gray-600">(optional)</span></label>
                <input type="datetime-local" className="input" value={form.scheduleAt} onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })} />
              </div>
              <p className="text-[10px] text-gray-600">Campaigns over 50 recipients are queued for approval before sending.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary text-sm" disabled={busy} onClick={createCampaign}>Create campaign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statsFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> {statsFor.name}</h2>
              <button className="text-gray-500 hover:text-white" onClick={closeStats}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card p-3"><p className="text-xl font-bold text-white">{stats.stats?.sent || 0}</p><p className="text-[10px] text-gray-500">Sent</p></div>
                    <div className="card p-3"><p className="text-xl font-bold text-white">{stats.stats?.delivered || 0}</p><p className="text-[10px] text-gray-500">Delivered</p></div>
                    <div className="card p-3"><p className="text-xl font-bold text-white">{stats.rates?.openRate || 0}%</p><p className="text-[10px] text-gray-500">Open rate</p></div>
                    <div className="card p-3"><p className="text-xl font-bold text-white">{stats.rates?.replyRate || 0}%</p><p className="text-[10px] text-gray-500">Reply rate</p></div>
                  </div>
                  {stats.ab && <p className="text-xs text-n0va-300">{stats.ab.summary} — {stats.ab.opens} opens</p>}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Response handling</h4>
                    {responses && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(responses.categories || {}).map(([k, v]: any) => (
                          <span key={k} className={`text-xs px-2.5 py-1 rounded-full ${v > 0 ? "bg-n0va-500/15 text-n0va-300" : "bg-gray-800 text-gray-500"}`}>{k.replace("_", " ")} · {v}</span>
                        ))}
                        {responses.suggestions?.map((s: string, i: number) => (
                          <p key={i} className="text-xs text-gray-400 w-full">· {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase font-bold mb-2">Recent events</h4>
                    <ul className="divide-y divide-gray-800/50">
                      {stats.recentEvents?.map((e: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 py-1.5 text-xs">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${e.event === "opened" ? "bg-n0va-500/15 text-n0va-300" : e.event === "clicked" ? "bg-emerald-500/15 text-emerald-400" : e.event === "complaint" ? "bg-red-500/15 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>{e.event}</span>
                          <span className="text-gray-400 truncate">{e.email}</span>
                          <span className="text-gray-600 ml-auto shrink-0">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3"><SkeletonCard /><SkeletonCard /></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
