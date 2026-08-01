import { useEffect, useState, useCallback } from "react";
import {
  Mic, RefreshCw, Film, MonitorPlay, Code2, ListChecks, Trash2, MessageSquareText,
  BarChart3, Clock3, Users, Sparkles, CheckCircle2, TrendingUp, ShieldAlert,
} from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

const EMOTION_BADGE: Record<string, string> = {
  joy: "bg-emerald-500/15 text-emerald-400",
  excitement: "bg-amber-500/15 text-amber-400",
  neutral: "bg-gray-600/20 text-gray-400",
  anger: "bg-red-500/15 text-red-400",
  sadness: "bg-sky-500/15 text-sky-400",
};

const BLOCK_ICON: Record<string, any> = {
  video: Film,
  screen_recording: MonitorPlay,
  code: Code2,
};

const SEV_BADGE: Record<string, string> = {
  low: "bg-gray-600/20 text-gray-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

export default function MailVoice() {
  const { addToast } = useToast();
  const [dash, setDash] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState("");

  const [noteForm, setNoteForm] = useState({ messageId: "", durationSec: "45", transcript: "" });
  const [videoForm, setVideoForm] = useState({ messageId: "", title: "", url: "", durationSec: "180" });
  const [recForm, setRecForm] = useState({ messageId: "", title: "", sizeMB: "120" });
  const [codeForm, setCodeForm] = useState({ messageId: "", name: "", code: "" });
  const [pollForm, setPollForm] = useState({ question: "", options: "", messageId: "" });
  const [pollResults, setPollResults] = useState<Record<string, any>>({});
  const [votedFor, setVotedFor] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, m, n, b, p] = await Promise.all([
      api.adsMarketingModule.mailVoiceNoteDashboard().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailMultimodalDashboard().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailVoiceNotes().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailContentBlocks().then(unwrap).catch(() => null),
      api.adsMarketingModule.mailPolls().then(unwrap).catch(() => null),
    ]);
    setDash({ ...(d || {}), blocks: m?.blocks ?? d?.blocks ?? 0, polls: m?.polls ?? d?.polls ?? 0, byType: m?.byType || {} });
    setNotes(n?.notes || []);
    setBlocks(b?.blocks || []);
    setPolls(p?.polls || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    function refresh() { loadData(); }
    window.addEventListener("n0va:refresh-data", refresh);
    return () => window.removeEventListener("n0va:refresh-data", refresh);
  }, [loadData]);

  async function createNote() {
    if (!noteForm.messageId.trim()) { addToast("error", "Message id required"); return; }
    setBusy(true);
    try {
      const input: Record<string, any> = { messageId: noteForm.messageId.trim(), durationSec: parseInt(noteForm.durationSec, 10) || 45 };
      if (noteForm.transcript.trim()) input.transcript = noteForm.transcript.trim();
      const r = unwrap(await api.adsMarketingModule.mailCreateVoiceNote(input));
      addToast("success", "Voice note recorded", r?.summary || "");
      setNoteForm({ messageId: "", durationSec: "45", transcript: "" });
      loadData();
    } catch (e: any) {
      addToast("error", "Record failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteVoiceNote(id));
      addToast("success", "Voice note deleted", r?.summary || "");
      loadData();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  async function attachVideo() {
    if (!videoForm.title.trim()) { addToast("error", "Title required"); return; }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailAttachVideo({
        messageId: videoForm.messageId.trim() || undefined,
        title: videoForm.title.trim(),
        url: videoForm.url.trim() || undefined,
        durationSec: parseInt(videoForm.durationSec, 10) || 180,
      }));
      addToast("success", "Video attached", r?.summary || "");
      setVideoForm({ messageId: "", title: "", url: "", durationSec: "180" });
      loadData();
    } catch (e: any) {
      addToast("error", "Attach failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function attachRecording() {
    if (!recForm.title.trim()) { addToast("error", "Title required"); return; }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailAttachScreenRecording({
        messageId: recForm.messageId.trim() || undefined,
        title: recForm.title.trim(),
        sizeMB: parseInt(recForm.sizeMB, 10) || 120,
      }));
      addToast("success", "Recording processed", r?.summary || "");
      setRecForm({ messageId: "", title: "", sizeMB: "120" });
      loadData();
    } catch (e: any) {
      addToast("error", "Process failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function attachCode() {
    if (!codeForm.code.trim()) { addToast("error", "Code required"); return; }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailAttachCodeSnippet({
        messageId: codeForm.messageId.trim() || undefined,
        name: codeForm.name.trim() || "snippet",
        code: codeForm.code.trim(),
      }));
      addToast("success", "Snippet analyzed", r?.summary || "");
      setCodeForm({ messageId: "", name: "", code: "" });
      loadData();
    } catch (e: any) {
      addToast("error", "Analysis failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function createPoll() {
    if (!pollForm.question.trim() || pollForm.options.trim().split(",").filter(Boolean).length < 2) {
      addToast("error", "Question + at least 2 options (comma-separated) required");
      return;
    }
    setBusy(true);
    try {
      const r = unwrap(await api.adsMarketingModule.mailCreatePoll({
        question: pollForm.question.trim(),
        options: pollForm.options.split(",").map((o: string) => o.trim()).filter(Boolean),
        messageId: pollForm.messageId.trim() || undefined,
      }));
      addToast("success", "Poll created", r?.summary || "");
      setPollForm({ question: "", options: "", messageId: "" });
      loadData();
    } catch (e: any) {
      addToast("error", "Create failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function showResults(pollId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailPollResults(pollId));
      setPollResults((prev) => ({ ...prev, [pollId]: r }));
    } catch (e: any) {
      addToast("error", "Results failed", e?.message);
    }
  }

  async function vote(pollId: string, optionIndex: number) {
    if (votedFor[pollId]) return;
    try {
      const r = unwrap(await api.adsMarketingModule.mailVotePoll(pollId, optionIndex, "user_001"));
      addToast("success", "Vote cast", r?.summary || "");
      setVotedFor((prev) => ({ ...prev, [pollId]: true }));
      showResults(pollId);
    } catch (e: any) {
      addToast("error", "Vote failed", e?.message);
    }
  }

  async function closePoll(pollId: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailClosePoll(pollId));
      addToast("success", "Poll closed", r?.summary || "");
      loadData();
    } catch (e: any) {
      addToast("error", "Close failed", e?.message);
    }
  }

  async function deleteBlock(id: string) {
    try {
      const r = unwrap(await api.adsMarketingModule.mailDeleteContentBlock(id));
      addToast("success", "Block deleted", r?.summary || "");
      loadData();
    } catch (e: any) {
      addToast("error", "Delete failed", e?.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Voice & Multimodal</h1><p className="text-gray-500 mt-1">N0VA1O — voice notes, recordings, code scans, polls</p></div>
          <div className="animate-spin w-5 h-5 border-2 border-n0va-500 border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mic className="w-6 h-6 text-n0va-400" /> Voice & Multimodal</h1>
          <p className="text-gray-500 mt-1 text-sm">{dash?.summary || "N0VA1O — voice notes, recordings, code scans, polls"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {!dash && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-300 font-medium">Voice & multimodal data unavailable</p>
              <p className="text-xs text-red-400/70">Check that the backend is running.</p>
            </div>
            <button className="btn-secondary text-xs ml-auto" onClick={loadData}>Retry</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Mic className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Voice notes</span></div>
          <p className="text-3xl font-bold text-white">{dash?.totalNotes || 0}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Clock3 className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Minutes recorded</span></div>
          <p className="text-3xl font-bold text-white">{dash?.totalMinutes || 0}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Film className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Content blocks</span></div>
          <p className="text-3xl font-bold text-white">{dash?.blocks || 0}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Polls</span></div>
          <p className="text-3xl font-bold text-white">{dash?.polls || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3"><Mic className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Record voice note</span></div>
          <div className="space-y-2">
            <input className="input" placeholder="Message id" value={noteForm.messageId} onChange={(e) => setNoteForm({ ...noteForm, messageId: e.target.value })} />
            <input className="input" placeholder="Duration (sec, default 45)" value={noteForm.durationSec} onChange={(e) => setNoteForm({ ...noteForm, durationSec: e.target.value })} />
            <textarea className="input min-h-[70px]" placeholder="Transcript (optional — AI synthesizes if empty)" value={noteForm.transcript} onChange={(e) => setNoteForm({ ...noteForm, transcript: e.target.value })} />
            <button className="btn-primary w-full" disabled={busy} onClick={createNote}><Mic className="w-4 h-4" /> Record</button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3"><Film className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Attach video</span></div>
          <div className="space-y-2">
            <input className="input" placeholder="Message id (optional)" value={videoForm.messageId} onChange={(e) => setVideoForm({ ...videoForm, messageId: e.target.value })} />
            <input className="input" placeholder="Title *" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
            <input className="input" placeholder="URL" value={videoForm.url} onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })} />
            <button className="btn-secondary w-full" disabled={busy} onClick={attachVideo}><Film className="w-4 h-4" /> Attach & enrich</button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3"><MonitorPlay className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Screen recording</span></div>
          <div className="space-y-2">
            <input className="input" placeholder="Message id (optional)" value={recForm.messageId} onChange={(e) => setRecForm({ ...recForm, messageId: e.target.value })} />
            <input className="input" placeholder="Title *" value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} />
            <input className="input" placeholder="Size MB (default 120)" value={recForm.sizeMB} onChange={(e) => setRecForm({ ...recForm, sizeMB: e.target.value })} />
            <button className="btn-secondary w-full" disabled={busy} onClick={attachRecording}><MonitorPlay className="w-4 h-4" /> Process (OCR + steps)</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-2 mb-3"><Code2 className="w-4 h-4 text-n0va-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">Code snippet scan</span></div>
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <input className="input flex-1 min-w-[160px]" placeholder="Name (e.g. api.ts)" value={codeForm.name} onChange={(e) => setCodeForm({ ...codeForm, name: e.target.value })} />
              <input className="input flex-1 min-w-[160px]" placeholder="Message id (optional)" value={codeForm.messageId} onChange={(e) => setCodeForm({ ...codeForm, messageId: e.target.value })} />
            </div>
            <textarea className="input min-h-[90px] font-mono text-xs" placeholder="Paste code — language auto-detected, vulnerabilities scanned" value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })} />
            <button className="btn-secondary" disabled={busy} onClick={attachCode}><Code2 className="w-4 h-4" /> Analyze snippet</button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase tracking-wider">New poll</span></div>
          <div className="space-y-2">
            <input className="input" placeholder="Question *" value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} />
            <input className="input" placeholder="Options, comma-separated (2+) *" value={pollForm.options} onChange={(e) => setPollForm({ ...pollForm, options: e.target.value })} />
            <input className="input" placeholder="Message id (optional)" value={pollForm.messageId} onChange={(e) => setPollForm({ ...pollForm, messageId: e.target.value })} />
            <button className="btn-secondary w-full" disabled={busy} onClick={createPoll}><BarChart3 className="w-4 h-4" /> Create poll</button>
          </div>
        </div>
      </div>

      <div className="card !p-2">
        <div className="px-3 py-2 border-b border-gray-800/60">
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Mic className="w-4 h-4 text-n0va-400" /> Voice notes</span>
        </div>
        {notes.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">No voice notes yet — record one above.</p>}
        <ul className="divide-y divide-gray-800/50">
          {notes.map((n: any) => (
            <li key={n._id} className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <button className="text-left flex-1 min-w-0" onClick={() => setExpanded(expanded === n._id ? "" : n._id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${EMOTION_BADGE[n.emotion] || "bg-gray-600/20 text-gray-400"}`}>{n.emotion}</span>
                    <span className="text-sm text-gray-300 truncate">{n.title || n.summary}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{n.durationSec}s · {n.confidence}% conf</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.summary}</p>
                </button>
                <button className="text-gray-500 hover:text-red-400 shrink-0" onClick={() => deleteNote(n._id)} title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
              {expanded === n._id && (
                <div className="mt-3 border-t border-gray-800 pt-3 space-y-2">
                  <p className="text-xs text-gray-300 whitespace-pre-wrap break-words bg-gray-800/40 rounded p-2">{n.transcript}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(n.speakers || []).map((s: any, i: number) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-300"><Users className="w-2.5 h-2.5" />{s.name} · {s.segments} seg</span>
                    ))}
                  </div>
                  {(n.actionItems || []).length > 0 && (
                    <ul className="space-y-1">
                      {(n.actionItems || []).map((a: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-amber-300/90"><ListChecks className="w-3 h-3 shrink-0" />{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card !p-2">
        <div className="px-3 py-2 border-b border-gray-800/60">
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Film className="w-4 h-4 text-n0va-400" /> Content blocks</span>
        </div>
        {blocks.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">No content blocks yet.</p>}
        <ul className="divide-y divide-gray-800/50">
          {blocks.map((b: any) => {
            const Icon = BLOCK_ICON[b.type] || MessageSquareText;
            return (
              <li key={b._id} className="px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <button className="text-left flex-1 min-w-0" onClick={() => setExpanded(expanded === `b${b._id}` ? "" : `b${b._id}`)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="w-4 h-4 text-n0va-400 shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{b.title || b.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-gray-600/20 text-gray-400">{b.type === "screen_recording" ? "recording" : b.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{b.summary}</p>
                  </button>
                  <button className="text-gray-500 hover:text-red-400 shrink-0" onClick={() => deleteBlock(b._id)} title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
                {expanded === `b${b._id}` && (
                  <div className="mt-3 border-t border-gray-800 pt-3 space-y-2 text-xs text-gray-400">
                    {b.type === "video" && (
                      <>
                        <p className="text-gray-300">{b.transcriptSummary}</p>
                        <div className="space-y-1">
                          {(b.chapters || []).map((c: any, i: number) => (
                            <p key={i} className="flex items-center gap-2"><Clock3 className="w-3 h-3 shrink-0 text-n0va-400" />{c.startSec}s → {c.endSec}s · {c.title}</p>
                          ))}
                        </div>
                      </>
                    )}
                    {b.type === "screen_recording" && (
                      <>
                        <p>{b.compressionPct}% compressed · {b.uiElements?.length} UI elements</p>
                        <p className="text-gray-300">{b.ocrText}</p>
                        <div className="space-y-1">
                          {(b.steps || []).map((s: string, i: number) => (
                            <p key={i} className="flex items-center gap-2"><TrendingUp className="w-3 h-3 shrink-0 text-n0va-400" />Step {i + 1}: {s}</p>
                          ))}
                        </div>
                      </>
                    )}
                    {b.type === "code" && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-n0va-600/20 text-n0va-400">{b.language} · {b.lineCount} lines</span>
                          {(b.vulnerabilities || []).map((v: any, i: number) => (
                            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${SEV_BADGE[v.severity] || ""}`}>{v.severity}: {v.type}</span>
                          ))}
                          {b.vulnerabilities?.length === 0 && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400"><CheckCircle2 className="w-2.5 h-2.5" /> clean</span>}
                        </div>
                        <pre className="bg-gray-800/40 rounded p-2 overflow-x-auto text-[11px] leading-relaxed">{b.code}</pre>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card !p-2">
        <div className="px-3 py-2 border-b border-gray-800/60">
          <span className="text-sm font-semibold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> Polls</span>
        </div>
        {polls.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">No polls yet.</p>}
        <ul className="divide-y divide-gray-800/50">
          {polls.map((p: any) => {
            const res = pollResults[p.pollId];
            return (
              <li key={p.pollId} className="px-3 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-gray-300">{p.question}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${p.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-600/20 text-gray-500"}`}>{p.status}</span>
                    {p.status === "open" && (
                      <button className="text-[10px] px-2 py-1 rounded bg-gray-700/60 text-gray-300 hover:text-white" onClick={() => closePoll(p.pollId)}>Close</button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.totalVotes} vote(s){p.deadlineAt ? ` · closes ${new Date(p.deadlineAt).toLocaleDateString()}` : ""}</p>
                {res ? (
                  <div className="mt-2 space-y-1.5">
                    {res.options.map((o: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-24 truncate shrink-0">{o.text}</span>
                        <div className="h-1.5 bg-gray-800 rounded-full flex-1 overflow-hidden">
                          <div className="h-1.5 bg-n0va-500 rounded-full" style={{ width: `${o.pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right shrink-0">{o.pct}%</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-500">sentiment {res.sentiment} · trend {res.trend}</p>
                  </div>
                ) : (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(p.options || []).map((o: any, i: number) => (
                      <button key={i} className="text-[10px] px-2 py-1 rounded bg-gray-700/60 text-gray-300 hover:bg-n0va-600 hover:text-white" disabled={p.status !== "open" || votedFor[p.pollId]} onClick={() => vote(p.pollId, i)}>
                        {o.text} ({o.votes})
                      </button>
                    ))}
                    {p.status !== "open" && (
                      <button className="text-[10px] px-2 py-1 rounded bg-n0va-600/20 text-n0va-400" onClick={() => showResults(p.pollId)}>View results</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
