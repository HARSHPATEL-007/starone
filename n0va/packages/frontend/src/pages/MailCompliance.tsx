import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, RefreshCw, Trash2, Lock, FileSearch, ScrollText, X, Play, Plus, Unlock, ShieldAlert,
  CalendarClock, ChevronLeft, ChevronRight, FileBarChart, Download,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const REPORT_COLORS: Record<string, string> = {
  gdpr: "text-emerald-400 bg-emerald-500/10",
  ccpa: "text-sky-400 bg-sky-500/10",
  hipaa: "text-violet-400 bg-violet-500/10",
};

const CAL_EVENT_STYLE: Record<string, string> = {
  placed: "bg-violet-500",
  active: "bg-sky-400",
  expiring: "bg-amber-400",
  released: "bg-gray-500",
};

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MailCompliance() {
  const { addToast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [pii, setPii] = useState<any>(null);
  const [polForm, setPolForm] = useState({ folder: "inbox", days: "365", action: "archive" });
  const [holdForm, setHoldForm] = useState({ subject: "", from: "", reason: "", startDate: "", endDate: "" });
  const [showPol, setShowPol] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [cal, setCal] = useState<any>(null);
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reports, setReports] = useState<any[]>([]);
  const [reportsAvg, setReportsAvg] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, p, h, a, r] = await Promise.all([
      api.adsMarketingModule.mailComplianceSummary().catch(() => null),
      api.adsMarketingModule.mailRetentionPolicies().catch(() => null),
      api.adsMarketingModule.mailListHolds().catch(() => null),
      api.adsMarketingModule.mailAuditLog(12).catch(() => null),
      api.adsMarketingModule.mailComplianceReports().catch(() => null),
    ]);
    setSummary(unwrap(s));
    setPolicies(unwrap(p)?.policies || []);
    setHolds(unwrap(h)?.holds || []);
    setAudit(unwrap(a)?.log || []);
    const repR = unwrap(r);
    setReports(Array.isArray(repR) ? repR : repR?.reports || []);
    setReportsAvg(repR?.average ?? null);
    setLoading(false);
  }, []);

  const loadCalendar = useCallback(async (month: string) => {
    const r = unwrap(await api.adsMarketingModule.mailComplianceHoldCalendar(month).catch(() => null));
    if (r) setCal(r);
  }, []);

  useEffect(() => { loadCalendar(calMonth); }, [calMonth, loadCalendar]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    function refresh() { loadAll(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadAll]);

  async function createPolicy() {
    if (!polForm.folder || !polForm.days) {
      addToast("warning", "Missing fields", "Folder and days are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailSetRetentionPolicy({
        folder: polForm.folder, days: parseInt(polForm.days, 10), action: polForm.action,
      }));
      addToast("success", "Policy saved", r?.summary || "");
      setShowPol(false);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Save failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePolicy(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteRetentionPolicy(id));
      addToast("success", "Policy deleted", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  async function runSweep() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailApplyRetention());
      addToast("success", "Sweep complete", r?.summary || "");
      await loadAll();
    } catch (e: any) {
      addToast("error", "Sweep failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function placeHold() {
    if (!holdForm.reason.trim() || (!holdForm.subject.trim() && !holdForm.from.trim())) {
      addToast("warning", "Missing fields", "A reason and subject or sender are required.");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailPlaceHold({
        subject: holdForm.subject.trim() || undefined,
        from: holdForm.from.trim() || undefined,
        reason: holdForm.reason.trim(),
        startDate: holdForm.startDate || undefined,
        endDate: holdForm.endDate || undefined,
      }));
      addToast("success", "Hold placed", r?.summary || "");
      setShowHold(false);
      setHoldForm({ subject: "", from: "", reason: "", startDate: "", endDate: "" });
      await loadAll();
      await loadCalendar(calMonth);
    } catch (e: any) {
      addToast("error", "Hold failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function releaseHold(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailReleaseHold(id));
      addToast("success", "Hold released", r?.summary || "");
      await loadAll();
      await loadCalendar(calMonth);
    } catch (e: any) {
      addToast("error", "Release failed", e?.message);
    }
  }

  async function openReport(framework: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailComplianceReport(framework));
      setReport(r);
    } catch (e: any) {
      addToast("error", "Report failed", e?.message);
    }
  }

  async function exportReport(framework: string) {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailComplianceExportReport(framework));
      addToast("success", "Report exported", r?.summary || "Added to export chain");
      setReport(null);
      await loadAll();
    } catch (e: any) {
      addToast("error", "Export failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function scanPii() {
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailScanPii());
      setPii(r);
      addToast("success", "Scan complete", r?.summary || "");
    } catch (e: any) {
      addToast("error", "Scan failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  const riskColor = summary?.pii?.riskLevel === "high" ? "text-red-400" : summary?.pii?.riskLevel === "medium" ? "text-amber-400" : "text-green-400";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-n0va-400" /> Mail Compliance</h1>
          <p className="text-gray-500 mt-1 text-sm">{summary?.summary || "Retention, holds, audit and PII protection"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary flex items-center gap-2" disabled={busy} onClick={scanPii}>
            <FileSearch className="w-4 h-4" /> Scan PII
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.policies?.totals?.policies || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Retention policies</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.activeHolds || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active holds</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-white">{summary?.auditEvents || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Audit events</p>
            </div>
            <div className="card p-4">
              <p className={`text-2xl font-bold ${riskColor}`}>{summary?.pii?.findings || 0}</p>
              <p className="text-xs text-gray-500 mt-1">PII findings · {summary?.pii?.riskLevel || "low"}</p>
            </div>
          </div>

          {summary?.recommendations?.length > 0 && (
            <div className="card border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold text-amber-300 mb-2">Recommendations</p>
              <ul className="space-y-1">
                {summary.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-amber-200/80 flex items-start gap-2"><ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-n0va-400" /> Legal hold calendar</h3>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary p-1.5" onClick={() => setCalMonth(shiftMonth(calMonth, -1))} title="Previous month"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button className="btn-secondary text-xs px-2" onClick={() => setCalMonth(new Date().toISOString().slice(0, 7))}>Today</button>
                  <button className="btn-secondary p-1.5" onClick={() => setCalMonth(shiftMonth(calMonth, 1))} title="Next month"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-gray-500 capitalize">{cal?.month || calMonth}{cal ? ` · ${cal.activeHolds} active · ${cal.expiringSoon?.length || 0} expiring ≤7d · ${cal.placedThisMonth} placed` : ""}</p>
              <div className="grid grid-cols-7 gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d: string, i: number) => (
                  <div key={i} className="text-center text-[9px] text-gray-600">{d}</div>
                ))}
                {(cal?.cells || []).map((c: any, ci: number) => (
                  <div key={c.date || `pad-${ci}`} className={`rounded-md border text-center px-0.5 py-1 text-[10px] ${(c.events || []).length > 0 ? "border-gray-700 bg-gray-800/40" : "border-gray-800/60"} ${c.date === todayStr ? "ring-1 ring-n0va-400" : ""}`}>
                    <div className="text-gray-400">{c.day ?? ""}</div>
                    <div className="flex justify-center gap-0.5 mt-1 min-h-[6px] flex-wrap">
                      {(c.events || []).slice(0, 3).map((e: any, i: number) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${CAL_EVENT_STYLE[e.type] || "bg-gray-600"}`} title={`${e.type}: ${e.subject || ""}`} />
                      ))}
                    </div>
                  </div>
                ))}
                {(cal?.cells || []).length === 0 && <div className="col-span-7 py-4 text-center text-xs text-gray-600">No hold activity this month.</div>}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Placed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Expiring ≤7d</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Released</span>
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileBarChart className="w-4 h-4 text-n0va-400" /> Compliance report packs</h3>
              <p className="text-[10px] text-gray-600">{typeof reportsAvg === "number" ? `Average readiness ${reportsAvg}% across 3 frameworks` : "GDPR · CCPA · HIPAA readiness"}</p>
              {reports.map((r: any) => (
                <div key={r.framework} className="flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white flex items-center gap-2 flex-wrap">
                      <span className="font-semibold uppercase">{r.framework}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase ${REPORT_COLORS[r.framework] || "bg-gray-700 text-gray-300"}`}>{r.status || "pending"}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{r.label || r.name}</div>
                  </div>
                  <span className="text-xs font-bold text-white whitespace-nowrap">{typeof r.score === "number" ? `${r.score}/100` : "—"}</span>
                  <button className="btn-secondary text-xs whitespace-nowrap" onClick={() => openReport(r.framework)}>Open</button>
                </div>
              ))}
              {reports.length === 0 && <p className="text-xs text-gray-600">Run a report pack to see GDPR / CCPA / HIPAA readiness.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-n0va-400" /> Retention policies</h3>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-xs" onClick={runSweep} disabled={busy}><Play className="w-3 h-3" /> Run sweep</button>
                  <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowPol(true)}><Plus className="w-3 h-3" /> Policy</button>
                </div>
              </div>
              <ul className="space-y-2">
                {policies.map((p: any) => (
                  <li key={p._id} className="flex items-center gap-2 text-sm">
                    <span className="capitalize text-gray-300">{p.folder}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">{p.days} days</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${p.action === "delete" ? "bg-red-500/15 text-red-400" : "bg-sky-500/10 text-sky-400"}`}>{p.action}</span>
                    <button className="text-gray-500 hover:text-red-400 ml-auto" onClick={() => deletePolicy(p._id)} title="Delete policy"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
                {policies.length === 0 && <li className="text-xs text-gray-500">No policies — add one to protect or expire mail automatically</li>}
              </ul>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Unlock className="w-4 h-4 text-n0va-400" /> Legal holds</h3>
                <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowHold(true)}><Plus className="w-3 h-3" /> Hold</button>
              </div>
              <ul className="space-y-2">
                {holds.filter((h: any) => !h.released).map((h: any) => (
                  <li key={h._id} className="flex items-center gap-2 text-sm">
                    <span className="truncate text-gray-300">{h.subject || "Any subject"}{h.from ? ` · ${h.from}` : ""}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{h.protectedMessages ?? ""}</span>
                    <button className="text-gray-500 hover:text-n0va-400 ml-auto shrink-0" onClick={() => releaseHold(h._id)} title="Release hold"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
                {holds.filter((h: any) => !h.released).length === 0 && <li className="text-xs text-gray-500">No active holds</li>}
              </ul>
              {pii && (
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-xs font-semibold text-white mb-2">Latest PII scan — {pii.totals?.messagesWithPii || 0} message(s) with sensitive data</p>
                  <ul className="space-y-1 max-h-[140px] overflow-y-auto">
                    {(pii.findings || []).slice(0, 8).map((f: any) => (
                      <li key={f.messageId} className="text-xs text-gray-400 truncate flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{f.subject}</span>
                        <span className="text-[10px] text-gray-500 shrink-0">{f.types.join(", ")} · {f.count}</span>
                      </li>
                    ))}
                    {(!pii.findings || pii.findings.length === 0) && <li className="text-xs text-gray-500">No sensitive data found</li>}
                  </ul>
                </div>
              )}
            </div>

            <div className="card p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><ScrollText className="w-4 h-4 text-n0va-400" /> Audit trail</h3>
              <ul className="space-y-2">
                {audit.map((l: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="capitalize text-gray-300 shrink-0">{l.action?.replace(/_/g, " ")}</span>
                    <span className="truncate text-gray-500">{l.detail}</span>
                    <span className="text-[10px] text-gray-600 shrink-0 ml-auto">{new Date(l.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
                {audit.length === 0 && <li className="text-xs text-gray-500">No compliance events yet</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      {showPol && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-n0va-400" /> Retention policy</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowPol(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Folder</label>
                <select className="select" value={polForm.folder} onChange={(e) => setPolForm({ ...polForm, folder: e.target.value })}>
                  {["inbox", "sent", "drafts", "archive", "trash", "spam", "Meetings", "Newsletter", "Invoices", "Travel", "Personal"].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Keep for (days)</label>
                <input type="number" className="input" min={1} value={polForm.days} onChange={(e) => setPolForm({ ...polForm, days: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">After expiry</label>
                <select className="select" value={polForm.action} onChange={(e) => setPolForm({ ...polForm, action: e.target.value })}>
                  <option value="archive">Archive (safe)</option>
                  <option value="delete">Delete permanently</option>
                </select>
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={createPolicy}>Save policy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHold && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Unlock className="w-4 h-4 text-n0va-400" /> Place legal hold</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowHold(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject contains (optional)</label>
                <input className="input" placeholder="invoice, legal, dispute…" value={holdForm.subject} onChange={(e) => setHoldForm({ ...holdForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">From (optional)</label>
                <input className="input" placeholder="sender@company.com" value={holdForm.from} onChange={(e) => setHoldForm({ ...holdForm, from: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reason (required)</label>
                <input className="input" placeholder="Pending litigation" value={holdForm.reason} onChange={(e) => setHoldForm({ ...holdForm, reason: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Starts (optional)</label>
                  <input type="date" className="input" value={holdForm.startDate} onChange={(e) => setHoldForm({ ...holdForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Ends (optional)</label>
                  <input type="date" className="input" value={holdForm.endDate} onChange={(e) => setHoldForm({ ...holdForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button className="btn-primary text-sm" disabled={busy} onClick={placeHold}>Place hold</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {report && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-n0va-400" />
                {String(report.framework || "").toUpperCase()} report
              </h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setReport(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm text-white font-medium">{report.label || report.name}</div>
                <span className="text-xs font-bold text-white">{typeof report.score === "number" ? `${report.score}/100` : "—"}</span>
              </div>
              <p className="text-xs text-gray-500">{report.description}</p>
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${report.status === "pass" ? "bg-emerald-500/10 text-emerald-400" : report.status === "warn" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-400"}`}>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {report.summary || `${report.status} readiness`}
              </div>
              {(report.checks || []).length > 0 && (
                <ul className="space-y-1.5">
                  {report.checks.map((c: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === "pass" ? "bg-emerald-400" : c.status === "warn" ? "bg-amber-400" : "bg-red-400"}`} />
                      <span className="text-gray-300 flex-1">{c.name}</span>
                      <span className="text-gray-500 text-[10px] text-right max-w-[45%]">{c.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-secondary text-sm" onClick={() => setReport(null)}>Close</button>
                <button className="btn-primary text-sm flex items-center gap-2" disabled={busy} onClick={() => exportReport(report.framework)}><Download className="w-4 h-4" /> Export</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
