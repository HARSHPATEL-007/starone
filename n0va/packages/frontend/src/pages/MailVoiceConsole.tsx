import { useEffect, useState, useCallback } from "react";
import {
  Volume2, RefreshCw, AlertTriangle, Play, ScanSearch, History, ListOrdered, Mic, MessageSquare, CheckCircle2, Clock,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const INTENT_STYLES: Record<string, string> = {
  send_email: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40",
  schedule_email: "bg-violet-900/60 text-violet-300 border border-violet-700/40",
  read_unread: "bg-sky-900/60 text-sky-300 border border-sky-700/40",
  search_mail: "bg-cyan-900/60 text-cyan-300 border border-cyan-700/40",
  mark_read: "bg-lime-900/60 text-lime-300 border border-lime-700/40",
  mark_all_read: "bg-lime-900/60 text-lime-300 border border-lime-700/40",
  toggle_star: "bg-amber-900/60 text-amber-300 border border-amber-700/40",
  out_of_office: "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-700/40",
  summarize_thread: "bg-indigo-900/60 text-indigo-300 border border-indigo-700/40",
  unread_count: "bg-teal-900/60 text-teal-300 border border-teal-700/40",
  create_rule: "bg-orange-900/60 text-orange-300 border border-orange-700/40",
  help: "bg-gray-700/60 text-gray-200 border border-gray-600/40",
  general: "bg-gray-800/60 text-gray-300 border border-gray-700/40",
};

const PARAM_LABELS: Record<string, string> = {
  to: "To",
  subject: "Subject",
  query: "Query",
  enabled: "Enabled",
  sendAt: "Send at",
  template: "Template",
};

function ResultBlock({ intent, result }: { intent: string; result: any }) {
  if (!result) return <p className="text-xs text-gray-500">No result payload.</p>;
  if (intent === "send_email") {
    const m = result.message || result;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-300 font-semibold">Sent {m.messageId || m._id || ""}</span>
          <span className="text-gray-500">· status {m.status || "sent"}</span>
        </div>
        <p className="text-xs text-gray-300 truncate">{m.subject || "—"} · {result.summary || ""}</p>
      </div>
    );
  }
  if (intent === "schedule_email") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <p className="text-gray-300 min-w-0 truncate">
          Scheduled for <span className="text-violet-300 font-semibold">{result.sendAt || "—"}</span> · to {(result.to || []).join(", ")}
        </p>
      </div>
    );
  }
  if (intent === "read_unread") {
    const msgs = result.messages || [];
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-gray-500">{result.total ?? msgs.length} unread · showing {Math.min(msgs.length, 5)}</p>
        {msgs.slice(0, 5).map((m: any) => (
          <div key={m._id || m.messageId} className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <span className="text-gray-300 truncate flex-1">{m.subject}</span>
            <span className="text-gray-500 shrink-0">{(m.from || {}).email || (m.from || {}).name || ""}</span>
          </div>
        ))}
      </div>
    );
  }
  if (intent === "search_mail") {
    const msgs = result.messages || [];
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-gray-500">{result.total ?? msgs.length} result(s) for “{result.query || ""}”</p>
        {msgs.slice(0, 5).map((m: any) => (
          <div key={m._id || m.messageId} className="flex items-center gap-2 text-[11px]">
            <span className="text-gray-500 shrink-0">•</span>
            <span className="text-gray-300 truncate flex-1">{m.subject}</span>
            <span className="text-gray-500 shrink-0">{(m.from || {}).email || ""}</span>
          </div>
        ))}
      </div>
    );
  }
  if (intent === "out_of_office") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${result.enabled ? "text-fuchsia-400" : "text-gray-500"}`} />
        <p className="text-gray-300">Out of office auto-replies are <span className={`font-semibold ${result.enabled ? "text-fuchsia-300" : "text-gray-400"}`}>{result.enabled ? "ON" : "OFF"}</span></p>
      </div>
    );
  }
  if (intent === "summarize_thread") {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-gray-300 truncate">“{result.subject}” · {result.messageCount} message(s) · {(result.participants || []).join(", ")}</p>
        <p className="text-gray-500">{result.summary}</p>
      </div>
    );
  }
  if (intent === "create_rule") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <p className="text-gray-300 truncate">Rule <span className="text-orange-300 font-semibold">{result.name || result.ruleId || "created"}</span> · {result.status || "active"}</p>
      </div>
    );
  }
  if (intent === "unread_count") {
    return (
      <div className="flex items-center gap-3">
        <p className="text-3xl font-bold text-teal-300">{result.unread ?? 0}</p>
        <p className="text-xs text-gray-400">unread message(s)</p>
      </div>
    );
  }
  if (intent === "help") {
    return (
      <ul className="space-y-0.5">
        {(result.commands || []).map((c: string) => <li key={c} className="text-[11px] text-gray-300 font-mono truncate">• {c}</li>)}
      </ul>
    );
  }
  if (intent === "general") {
    const msgs = result.messages || [];
    return (
      <div className="space-y-1">
        {result.note && <p className="text-[11px] text-gray-400">{result.note}</p>}
        {msgs.slice(0, 3).map((m: any) => (
          <p key={m._id || m.messageId} className="text-[11px] text-gray-500 truncate">• {m.subject}</p>
        ))}
      </div>
    );
  }
  const marked = result.marked !== undefined ? <p className="text-xs text-gray-300">Marked <span className="text-lime-300 font-semibold">{result.marked}</span> message(s) read</p> : null;
  if (marked) return marked;
  if (result.read !== undefined || result.starred !== undefined) {
    return (
      <p className="text-xs text-gray-300">
        {result.subject || "Message"} · <span className="text-lime-300">{result.read ? "read" : "unread"}</span>
        {result.starred !== undefined && <> · <span className={result.starred ? "text-amber-300" : "text-gray-500"}>{result.starred ? "starred" : "unstarred"}</span></>}
      </p>
    );
  }
  return result.summary ? <p className="text-xs text-gray-300">{result.summary}</p> : <p className="text-xs text-gray-300 truncate">{JSON.stringify(result)}</p>;
}

export default function MailVoiceConsole() {
  const { addToast } = useToast();
  const [help, setHelp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [cmd, setCmd] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [executed, setExecuted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("n0va_voice_history") || "[]");
    } catch {
      return [];
    }
  });

  const load = useCallback(async () => {
    const h = unwrap(await api.adsMarketingModule.mailVoiceHelp().catch(() => null));
    setHelp(h);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function refresh() { load(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);
  useEffect(() => {
    try {
      sessionStorage.setItem("n0va_voice_history", JSON.stringify(history.slice(0, 20)));
    } catch { /* storage full */ }
  }, [history]);

  async function parseCommand() {
    if (!cmd.trim()) return;
    setBusy("parse");
    setError(null);
    const r = unwrap(await api.adsMarketingModule.mailParseVoiceCommand(cmd.trim()).catch(() => null));
    if (!r) setError("Parse failed — check the backend.");
    else setParsed(r);
    setBusy(null);
  }

  async function executeCommand(text?: string) {
    const c = (text ?? cmd).trim();
    if (!c) return;
    setBusy("execute");
    setError(null);
    const r = unwrap(await api.adsMarketingModule.mailExecuteVoiceCommand(c).catch(() => null));
    if (!r) {
      setError("Execution failed — check the backend.");
      setBusy(null);
      return;
    }
    setExecuted(r);
    setParsed({ intent: r.intent, params: {}, explanation: r.explanation });
    setHistory((h) => [{ at: Date.now(), command: c, intent: r.intent, summary: r.summary }, ...h].slice(0, 20));
    if (r.summary) addToast("info", r.summary);
    setBusy(null);
  }

  function fill(c: string) {
    setCmd(c);
    setError(null);
  }

  const commands = help?.commands || [];
  const params = parsed?.params || {};
  const statLast = executed || parsed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Volume2 className="w-6 h-6 text-n0va-400" /> Voice Command Console</h1>
          <p className="text-gray-500 mt-1 text-sm">Control N0VA MAIL by voice — parse, preview, execute (spec §3.9)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-3.5 h-3.5 text-n0va-600 bg-gray-700 border-gray-600 rounded" />
            Auto-refresh 30s
          </label>
          <button className="btn-secondary p-2" onClick={load} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !help ? (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Voice console unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={load}>Retry</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{commands.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Voice commands</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-white">{history.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Executions this view</p>
            </div>
            <div className="card !p-4">
              <p className="text-2xl font-bold text-n0va-300 truncate">{statLast?.intent ? statLast.intent.replace(/_/g, " ") : "—"}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Last intent</p>
            </div>
            <div className="card !p-4">
              <p className="text-sm font-bold text-emerald-400 truncate">{statLast?.summary || "—"}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Last summary</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Mic className="w-4 h-4 text-n0va-400" />Command console</h2>
            <textarea
              rows={2}
              value={cmd}
              onChange={(e) => { setCmd(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) executeCommand(); }}
              placeholder='Try "send email to john.smith@partner.com about Q3 invoice" or "read my unread emails"…'
              className="input font-mono text-sm resize-none"
            />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button className="btn-secondary text-xs" disabled={busy === "parse" || !cmd.trim()} onClick={parseCommand}>
                <ScanSearch className="w-3.5 h-3.5 inline mr-1" />{busy === "parse" ? "Parsing…" : "Parse"}
              </button>
              <button className="btn-primary text-xs" disabled={busy === "execute" || !cmd.trim()} onClick={() => executeCommand()}>
                <Play className="w-3.5 h-3.5 inline mr-1" />{busy === "execute" ? "Executing…" : "Execute"}
              </button>
              <span className="text-[10px] text-gray-500 ml-auto">Ctrl/Cmd+Enter to execute</span>
            </div>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            <div className="mt-3 border-t border-gray-700/40 pt-3">
              <p className="text-[11px] text-gray-500 mb-1.5">One-tap examples</p>
              <div className="flex flex-wrap gap-1.5">
                {commands.slice(0, 6).map((c: string) => (
                  <button key={c} onClick={() => fill(c)} className="text-[10px] px-2 py-1 rounded bg-gray-700/40 text-gray-300 hover:bg-n0va-900/60 hover:text-n0va-200 truncate max-w-[220px]">{c}</button>
                ))}
              </div>
            </div>
          </div>

          {parsed && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><ScanSearch className="w-4 h-4 text-n0va-400" />Parsed intent</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] px-2 py-1 rounded ${INTENT_STYLES[parsed.intent] || INTENT_STYLES.general}`}>{parsed.intent.replace(/_/g, " ")}</span>
                {Object.entries(params).map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2 py-1 rounded bg-gray-700/60 text-gray-200">
                    <span className="text-gray-500">{PARAM_LABELS[k] || k}:</span> {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{parsed.explanation}</p>
            </div>
          )}

          {executed && (
            <div className="card border-emerald-500/30 bg-emerald-500/5">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Execution result <span className="text-[11px] font-normal text-gray-500">· {executed.command}</span></h2>
              <ResultBlock intent={executed.intent} result={executed.result} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card min-w-0">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><ListOrdered className="w-4 h-4 text-n0va-400" />Command reference <span className="text-[11px] font-normal text-gray-500">· {commands.length} available</span></h2>
              <ul className="space-y-1">
                {commands.map((c: string) => (
                  <li key={c}>
                    <button onClick={() => fill(c)} className="w-full text-left text-[11px] font-mono text-gray-300 hover:text-n0va-200 px-2 py-1 rounded bg-gray-800/40 hover:bg-gray-800 truncate">• {c}</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card min-w-0">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><History className="w-4 h-4 text-n0va-400" />Execution history <span className="text-[11px] font-normal text-gray-500">· this browser session</span></h2>
              <div className="space-y-1.5">
                {history.length === 0 && <p className="text-xs text-gray-500">Nothing executed yet — say or type your first command above.</p>}
                {history.map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${INTENT_STYLES[e.intent] || INTENT_STYLES.general}`}>{e.intent.replace(/_/g, " ")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-300 font-mono truncate">{e.command}</p>
                      <p className="text-[10px] text-gray-500 truncate">{e.summary}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">{new Date(e.at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              {history.length > 0 && (
                <button className="btn-secondary text-xs mt-3" onClick={() => setHistory([])}>Clear history</button>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-n0va-400" />How it works</h2>
            <p className="text-[11px] text-gray-500">The console drives the §3.9 voice layer: <span className="text-gray-300">Parse</span> shows what N0VA understands (intent + params) before anything runs; <span className="text-gray-300">Execute</span> performs the action in your real mailbox — sending, scheduling, searching, starring, marking read, toggling out-of-office, summarizing threads or instantiating rules. Recipient names resolve against your contacts book.</p>
          </div>
        </>
      )}
    </div>
  );
}
