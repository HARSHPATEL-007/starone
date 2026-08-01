import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Inbox, Zap, Clock3, Send, ListChecks, ShieldAlert, Sparkles, Bot,
  CheckCircle2, XCircle, MailWarning, Archive, AlertTriangle, Gauge, ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

function verdictStyles(v: string): string {
  if (v === "Good to go") return "bg-green-500/10 text-green-400";
  if (v === "Mostly clear") return "bg-amber-500/10 text-amber-400";
  return "bg-red-500/10 text-red-400";
}

function levelBadge(level: string): string {
  if (level === "critical") return "bg-red-500/15 text-red-400";
  if (level === "warning") return "bg-amber-500/15 text-amber-400";
  return "bg-gray-600/20 text-gray-400";
}

export default function MailCommandCenter() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const r = await api.adsMarketingModule.mailCommandCenter().then(unwrap).catch(() => null);
    setDash(r);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  async function act(key: string, fn: () => Promise<any>, success: string, errorTitle: string) {
    setBusy(key);
    try {
      const r = await fn().then(unwrap);
      addToast("success", success, r?.summary || "");
      await loadData();
    } catch (e: any) {
      addToast("error", errorTitle, e?.message);
    } finally {
      setBusy("");
    }
  }

  if (loading && !dash) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Mail Command</h1><p className="text-gray-500 mt-1">Daily mail execution — one screen, one-click actions</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  const cards = dash?.cards;
  const ready = dash?.readyActions;
  const sections = dash?.sections || {};
  const counts = dash?.counts || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mail Command</h1>
          <p className="text-gray-500 mt-1">Daily mail execution — one screen, one-click actions</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-500 hidden md:inline">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto (30s)
          </label>
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {!dash && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Mail command data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running, then refresh.</p>
            </div>
          </div>
        </div>
      )}

      {dash && (
        <>
          <div className={`card border ${dash.verdict === "Good to go" ? "border-green-500/20" : dash.verdict === "Mostly clear" ? "border-amber-500/20" : "border-red-500/20"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Gauge className="w-4 h-4 text-n0va-400" />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${verdictStyles(dash.verdict)}`}>{dash.verdict}</span>
              <span className="text-xs text-gray-500">attention score {dash.attentionScore}</span>
              <button className="btn-primary ml-auto text-xs px-3 py-1.5" onClick={() => window.dispatchEvent(new CustomEvent("n0va:refresh-data"))}><Sparkles className="w-3.5 h-3.5 mr-1" />Refresh all</button>
            </div>
            <div className="mt-3 space-y-1.5">
              {dash.morningReport?.map((line: string, i: number) => (
                <p key={i} className="text-sm text-gray-400">{line}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Inbox className="w-4 h-4 text-n0va-400" /><span className="text-xs font-medium uppercase tracking-wide">Unread</span></div><p className="text-3xl font-bold text-white mt-2">{cards?.unread?.value ?? 0}</p><p className="text-xs text-gray-500 mt-1">{cards?.unread?.label}</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Zap className="w-4 h-4 text-amber-400" /><span className="text-xs font-medium uppercase tracking-wide">Priority</span></div><p className="text-3xl font-bold text-white mt-2">{cards?.priority?.value ?? 0}</p><p className="text-xs text-gray-500 mt-1">{cards?.priority?.label}</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Clock3 className="w-4 h-4 text-emerald-400" /><span className="text-xs font-medium uppercase tracking-wide">Follow-ups</span></div><p className="text-3xl font-bold text-white mt-2">{cards?.followUpsDue?.value ?? 0}</p><p className="text-xs text-gray-500 mt-1">{cards?.followUpsDue?.label}</p></div>
            <div className="card"><div className="flex items-center gap-2 text-gray-400"><Send className="w-4 h-4 text-sky-400" /><span className="text-xs font-medium uppercase tracking-wide">Scheduled</span></div><p className="text-3xl font-bold text-white mt-2">{cards?.scheduledToday?.value ?? 0}</p><p className="text-xs text-gray-500 mt-1">{cards?.scheduledToday?.label}</p></div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">One-click actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="btn-secondary text-xs justify-center" disabled={!!busy} onClick={() => act("rules", () => api.adsMarketingModule.mailCommandRunRulesSweep(), "Rules swept", "Sweep failed")}>
                <ListChecks className="w-4 h-4 mr-1" />Run rules
              </button>
              <button className="btn-secondary text-xs justify-center" disabled={!!busy} onClick={() => act("spam", () => api.adsMarketingModule.mailCommandRescanSpam(), "Spam rescanned", "Rescan failed")}>
                <ShieldAlert className="w-4 h-4 mr-1" />Rescan spam
              </button>
              <button className="btn-secondary text-xs justify-center" disabled={!!busy} onClick={() => act("agent", () => api.adsMarketingModule.mailCommandRunAgentCycle(), "Agent cycle run", "Agent cycle failed")}>
                <Bot className="w-4 h-4 mr-1" />Agent cycle
              </button>
              <button className="btn-secondary text-xs justify-center" disabled={!!busy} onClick={() => act("archive", () => api.adsMarketingModule.mailCommandSmartArchive(), "Smart archive done", "Archive failed")}>
                <Archive className="w-4 h-4 mr-1" />Smart archive{counts.archiveCandidates ? ` (${counts.archiveCandidates})` : ""}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span>{ready?.completeFollowUps ?? 0} follow-ups ready</span>
              <span>{ready?.sendScheduled ?? 0} sends queued</span>
              <span>{ready?.approveCampaigns ?? 0} approvals waiting</span>
              <span>{counts.quarantine ?? 0} in quarantine</span>
              <span>{counts.openTasks ?? 0} tasks from mail</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-semibold text-white">Auto-priority queue</h2></div>
              <div className="space-y-2">
                {(sections.priorityQueue || []).map((m: any) => (
                  <div key={m.messageId} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{m.subject}</p><p className="text-xs text-gray-500 truncate">{m.from} · {m.reason}</p></div>
                    <span className="text-xs font-semibold text-amber-400 shrink-0">{m.predictedImportance}</span>
                  </div>
                ))}
                {!sections.priorityQueue?.length && <p className="text-xs text-gray-500">Nothing queued — inbox zero</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Clock3 className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold text-white">Follow-ups due</h2></div>
              <div className="space-y-2">
                {(sections.followUps || []).map((f: any) => (
                  <div key={f._id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{f.subject}</p><p className="text-xs text-gray-500 truncate">{f.note || "Follow-up"} {f.overdue && <span className="text-red-400 font-medium">· overdue</span>}</p></div>
                    <button className="btn-primary text-xs px-2.5 py-1 shrink-0" disabled={!!busy} onClick={() => act(`fu-${f._id}`, () => api.adsMarketingModule.mailCommandCompleteFollowUp(f._id), "Follow-up completed", "Complete failed")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Done</button>
                  </div>
                ))}
                {!sections.followUps?.length && <p className="text-xs text-gray-500">No open follow-ups</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Send className="w-4 h-4 text-sky-400" /><h2 className="text-sm font-semibold text-white">Scheduled sends</h2></div>
              <div className="space-y-2">
                {(sections.scheduled || []).map((s: any) => (
                  <div key={s._id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{s.subject}</p><p className="text-xs text-gray-500 truncate">to {(Array.isArray(s.to) ? s.to : [s.to]).join(", ")} · {new Date(s.sendAt).toLocaleString()}</p></div>
                    <button className="btn-primary text-xs px-2.5 py-1 shrink-0" disabled={!!busy} onClick={() => act(`sched-${s._id}`, () => api.adsMarketingModule.mailCommandSendScheduledNow(s._id), "Email sent", "Send failed")}><Send className="w-3.5 h-3.5 mr-1" />Send now</button>
                  </div>
                ))}
                {!sections.scheduled?.length && <p className="text-xs text-gray-500">Nothing scheduled</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-violet-400" /><h2 className="text-sm font-semibold text-white">Campaign approvals</h2></div>
              <div className="space-y-2">
                {(sections.campaignApprovals || []).map((c: any) => (
                  <div key={c.campaignId} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{c.name}</p><p className="text-xs text-gray-500 truncate">{c.sent || 0} sent · awaiting decision</p></div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button className="btn-primary text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`ap-${c.campaignId}`, () => api.adsMarketingModule.mailCommandApproveCampaign(c.campaignId), "Campaign approved", "Approve failed")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</button>
                      <button className="btn-danger text-xs px-2.5 py-1" disabled={!!busy} onClick={() => act(`rj-${c.campaignId}`, () => api.adsMarketingModule.mailCommandRejectCampaign(c.campaignId), "Campaign rejected", "Reject failed")}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</button>
                    </div>
                  </div>
                ))}
                {!sections.campaignApprovals?.length && <p className="text-xs text-gray-500">No campaigns awaiting approval</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><MailWarning className="w-4 h-4 text-red-400" /><h2 className="text-sm font-semibold text-white">Escalations & alerts</h2></div>
              <div className="space-y-2">
                {(sections.escalations || []).map((e: any) => (
                  <div key={e.messageId} className="flex items-center justify-between gap-3 rounded-lg bg-red-500/5 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{e.subject}</p><p className="text-xs text-gray-500 truncate">{e.from}</p></div>
                    <span className="text-xs font-semibold text-red-400 shrink-0">{e.urgencyScore}</span>
                  </div>
                ))}
                {(sections.healthAlerts || []).map((a: any) => (
                  <div key={a.threadId} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                    <div className="min-w-0"><p className="text-sm text-white truncate">{a.subject}</p><p className="text-xs text-gray-500 truncate">stale {a.ageDays}d {a.awaitingResponse && "· awaiting response"}</p></div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${levelBadge(a.level)} shrink-0`}>{a.level}</span>
                  </div>
                ))}
                {!sections.escalations?.length && !sections.healthAlerts?.length && <p className="text-xs text-gray-500">No escalations or stale conversations</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Gauge className="w-4 h-4 text-n0va-400" /><h2 className="text-sm font-semibold text-white">Housekeeping</h2></div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-400">Storage</span><span className="text-white">{dash.storage?.percentUsed ?? 0}% across {dash.storage?.mailboxes ?? 0} mailboxes {counts.storageCritical > 0 && <span className="text-red-400 font-medium">· {counts.storageCritical} critical</span>}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-400">Tasks from mail</span><span className="text-white">{counts.openTasks ?? 0} open</span></div>
                <div className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-400">Quarantine</span><span className="text-white">{counts.quarantine ?? 0} message(s)</span></div>
                <div className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-400">Domains</span><span className="text-white">{dash.domains?.active ?? 0}/{dash.domains?.total ?? 0} active · rep {dash.domains?.avgReputation ?? 0}{counts.domainsFlagged > 0 && <span className="text-red-400 font-medium"> · {counts.domainsFlagged} flagged</span>}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2"><span className="text-gray-400">Stale conversations</span><span className="text-white">{counts.healthCritical ?? 0} critical</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
