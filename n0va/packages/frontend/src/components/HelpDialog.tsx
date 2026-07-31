import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, X, Wrench, Keyboard, Mic, ArrowRight, CheckCircle2, Sparkles, Loader } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "./Toast";

type Tab = "fixes" | "shortcuts" | "voice";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Cmd/Ctrl + N", action: "New campaign" },
  { keys: "Cmd/Ctrl + Shift + A", action: "Approve all AI suggestions" },
  { keys: "Cmd/Ctrl + K", action: "Command palette (search anything)" },
  { keys: "Cmd/Ctrl + /", action: "Toggle AI assistant" },
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then C", action: "Go to Campaigns" },
  { keys: "G then R", action: "Go to Reports" },
  { keys: "Shift + R", action: "Refresh all platform data" },
  { keys: "Esc", action: "Close any modal/panel" },
  { keys: "?", action: "Show help" },
];

const VOICE_COMMANDS = [
  "Launch [campaign type] for [audience] with [budget]",
  "Pause [platform] campaigns",
  "Shift [amount] to [platform]",
  "How's [metric] today/this week/this month?",
  "Show me [fatigued/paused/top] creatives",
  "Generate [description] creative",
  "What's my best/worst [audience/creative/platform]?",
  "Email me [yesterday's/last week's] report",
  "Schedule [meeting type] for [day]",
  "Fix [campaign name]",
];

const LEARN_LINKS = [
  { label: "Help & Support center", route: "/help" },
  { label: "Campaign templates", route: "/templates" },
  { label: "New campaign (3-click launch)", route: "/campaigns/new" },
  { label: "Approvals & auto-approve settings", route: "/approvals" },
];

function unwrap(r: any) {
  return r && r.data !== undefined ? r.data : r;
}

export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("fixes");
  const [fixes, setFixes] = useState<any>(null);
  const [loadingFixes, setLoadingFixes] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const loadFixes = useCallback(() => {
    setLoadingFixes(true);
    api.adsMarketingModule.quickFixes().catch(() => null).then((r) => {
      setFixes(unwrap(r));
      setLoadingFixes(false);
    });
  }, []);

  useEffect(() => {
    if (open) {
      setTab("fixes");
      loadFixes();
    }
  }, [open, loadFixes]);

  function applyFix(fixId: string) {
    setApplying(fixId);
    api.adsMarketingModule.applyQuickFix(fixId)
      .then((r) => {
        const res = unwrap(r);
        addToast("success", "Fix applied", res.summary || res.action);
        loadFixes();
      })
      .catch(() => addToast("error", "Failed to apply fix", "Try again or check backend connection."))
      .finally(() => setApplying(null));
  }

  function applyAll() {
    setApplying("all");
    api.adsMarketingModule.fixAll()
      .then((r) => {
        const res = unwrap(r);
        addToast("success", "All fixes applied", res.totals?.summary || `${res.applied?.length || 0} fixes applied`);
        loadFixes();
      })
      .catch(() => addToast("error", "Failed to apply fixes", "Try again or check backend connection."))
      .finally(() => setApplying(null));
  }

  if (!open) return null;

  const detected = fixes?.fixes?.filter((f: any) => f.detected) || [];
  const tabStyles = (t: Tab) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      tab === t ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-n0va-600/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-n0va-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">Contextual Help</h3>
            <p className="text-xs text-gray-500">Stuck? One-click fixes and quick answers — press ? anytime</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-4">
          <button className={tabStyles("fixes")} onClick={() => setTab("fixes")}><Wrench className="w-4 h-4" /> Fix issues</button>
          <button className={tabStyles("shortcuts")} onClick={() => setTab("shortcuts")}><Keyboard className="w-4 h-4" /> Shortcuts</button>
          <button className={tabStyles("voice")} onClick={() => setTab("voice")}><Mic className="w-4 h-4" /> Voice</button>
        </div>

        <div className="p-5 max-h-[55vh] overflow-y-auto">
          {tab === "fixes" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-n0va-400" />
                  <p className="text-sm text-gray-200 font-medium">Ani detected issues</p>
                  {loadingFixes && <Loader className="w-3.5 h-3.5 animate-spin text-gray-500" />}
                </div>
                {!loadingFixes && fixes && detected.length === 0 && (
                  <p className="text-sm text-gray-400">{fixes.totals?.summary || "No issues detected — everything looks good."}</p>
                )}
                {!loadingFixes && !fixes && (
                  <p className="text-sm text-gray-400">Could not reach the diagnostics service — backend may be offline.</p>
                )}
                {detected.map((f: any) => (
                  <div key={f.fixId} className="flex items-start gap-3 py-2.5 border-b border-gray-800/60 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <p className="text-sm text-white font-medium">{f.label}</p>
                        <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{f.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{f.detection}</p>
                      <p className="text-xs text-n0va-400 mt-0.5">→ {f.fix}</p>
                    </div>
                    <button
                      onClick={() => applyFix(f.fixId)}
                      disabled={applying !== null}
                      className="btn-secondary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                    >
                      {applying === f.fixId ? "Applying..." : "Apply"}
                    </button>
                  </div>
                ))}
                {!loadingFixes && fixes && detected.length > 0 && (
                  <div className="flex items-center gap-3 pt-3">
                    <button onClick={applyAll} disabled={applying !== null} className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                      {applying === "all" ? "Applying all..." : "Fix All (1 click)"}
                    </button>
                    <span className="text-xs text-gray-500">{detected.length} issue(s) — each resolved in seconds</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {LEARN_LINKS.map((l) => (
                  <button
                    key={l.route}
                    onClick={() => { onClose(); navigate(l.route); }}
                    className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg border border-gray-700 transition-colors"
                  >
                    {l.label} <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "shortcuts" && (
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
                  <span className="text-sm text-gray-300">{s.action}</span>
                  <kbd className="text-xs text-n0va-400 bg-gray-800 border border-gray-700 px-2 py-1 rounded font-mono">{s.keys}</kbd>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">Tip: press <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded font-mono">?</kbd> anywhere to open this panel, <kbd className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded font-mono">Esc</kbd> to close.</p>
            </div>
          )}

          {tab === "voice" && (
            <div className="space-y-2">
              {VOICE_COMMANDS.map((v) => (
                <div key={v} className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
                  <Mic className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                  <code className="text-sm text-gray-300 font-mono">{v}</code>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">Say these in the AI assistant ({SHORTCUTS[3].keys} to open) — Ani executes them with human-in-the-loop confirmation where needed.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-900/80">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> 24/7 automated guardian is watching placements
          </span>
          <button onClick={() => { onClose(); navigate("/help"); }} className="text-xs text-n0va-400 hover:text-n0va-300">
            Open Help Center →
          </button>
        </div>
      </div>
    </div>
  );
}
