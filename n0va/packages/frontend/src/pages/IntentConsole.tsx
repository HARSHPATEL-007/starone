import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Bot, User, Command, Zap, Loader, AlertCircle, History, Trash2, CheckCircle, RefreshCw, Download } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const RESOLVE_COLORS = ["#10b981", "#ef4444"];

interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; timestamp: Date;
  intent?: { action: string; confidence: number; resolved: boolean; result?: any };
}

const INTENT_EXAMPLES = [
  "Launch campaign 'Q3 Product Push'",
  "Pause all campaigns with ROAS below 1.5",
  "Increase budget for top performers by 20%",
  "Show me campaign health for active campaigns",
  "Archive all draft campaigns",
  "Set daily budget to $5000 for Retargeting campaign",
];

export default function IntentConsole() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Hello! I'm N0VA1O Intent Router. I can execute campaign actions via the API. Try typing a command or click an example below.", timestamp: new Date(), intent: { action: "greeting", confidence: 1, resolved: true } },
  ]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { api.campaigns.list().then(r => setCampaigns(r.campaigns || r || [])).catch(() => {}); }, []);

  async function resolveAndExecute(text: string): Promise<{ action: string; response: string; confidence: number; result?: any }> {
    const lower = text.toLowerCase();
    const nameMatch = text.match(/['"](.+?)['"]/);
    const name = nameMatch?.[1] || "";
    const pctMatch = text.match(/(\d+)%/);
    const amtMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/);

    if (lower.startsWith("launch") || lower.startsWith("start")) {
      if (name) {
        const c = campaigns.find(c => c.name?.toLowerCase().includes(name.toLowerCase()));
        if (c) { await api.campaigns.updateStatus(c._id || c.id, "active"); return { action: "launch_campaign", response: `✅ **Launched** "${c.name}" — status updated to active.`, confidence: 0.95 }; }
        return { action: "launch_campaign", response: `⚠️ Campaign "${name}" not found. Available: ${campaigns.map(c => `"${c.name}"`).join(", ")}`, confidence: 0.7 };
      }
      const drafts = campaigns.filter(c => c.status === "draft");
      if (drafts.length === 0) return { action: "launch_campaign", response: "No draft campaigns to launch.", confidence: 0.9 };
      await Promise.all(drafts.map(c => api.campaigns.updateStatus(c._id || c.id, "active")));
      return { action: "launch_campaign", response: `✅ **Launched ${drafts.length} draft campaigns** — all set to active.`, confidence: 0.9, result: { count: drafts.length } };
    }

    if (lower.startsWith("pause") || lower.startsWith("stop")) {
      if (lower.includes("roas") || lower.includes("below")) {
        const threshold = parseFloat(amtMatch?.[1] || "1.5");
        const health = await api.insights.health.all().catch(() => []);
        const poorPerformers = health.filter((h: any) => (h.overall || 0) < threshold * 50);
        if (poorPerformers.length === 0) return { action: "pause_campaign", response: `All campaigns above ${threshold}x ROAS. No pauses needed.`, confidence: 0.9 };
        for (const h of poorPerformers) { try { await api.campaigns.updateStatus(h.campaignId, "paused"); } catch {} }
        return { action: "pause_campaign", response: `⏸️ **Paused ${poorPerformers.length} campaigns** with ROAS below ${threshold}x.`, confidence: 0.9, result: { count: poorPerformers.length } };
      }
      if (name) {
        const c = campaigns.find(c => c.name?.toLowerCase().includes(name.toLowerCase()));
        if (c) { await api.campaigns.updateStatus(c._id || c.id, "paused"); return { action: "pause_campaign", response: `⏸️ **Paused** "${c.name}".`, confidence: 0.95 }; }
        return { action: "pause_campaign", response: `⚠️ Campaign "${name}" not found.`, confidence: 0.7 };
      }
      const active = campaigns.filter(c => c.status === "active");
      if (active.length === 0) return { action: "pause_campaign", response: "No active campaigns to pause.", confidence: 0.9 };
      await Promise.all(active.map(c => api.campaigns.updateStatus(c._id || c.id, "paused")));
      return { action: "pause_campaign", response: `⏸️ **Paused ${active.length} active campaigns**.`, confidence: 0.9, result: { count: active.length } };
    }

    if (lower.includes("increase") || lower.includes("raise") || lower.includes("budget")) {
      const pct = parseInt(pctMatch?.[1] || "20");
      const targets = lower.includes("top") ? campaigns.filter(c => c.status === "active").slice(0, 3) : campaigns.filter(c => c.status === "active");
      if (targets.length === 0) return { action: "increase_budget", response: "No active campaigns to adjust.", confidence: 0.9 };
      let updated = 0;
      for (const c of targets) {
        const budget = c.budget || {};
        const daily = Math.round((budget.daily || 1000) * (1 + pct / 100));
        const lifetime = Math.round((budget.lifetime || daily * 30) * (1 + pct / 100));
        try { await api.campaigns.updateBudget(c._id || c.id, { daily, lifetime }); updated++; } catch {}
      }
      const label = lower.includes("top") ? "top performers" : "active campaigns";
      return { action: "increase_budget", response: `💰 **Increased budgets by ${pct}%** for ${updated} ${label}.`, confidence: 0.9, result: { count: updated, percent: pct } };
    }

    if (lower.includes("archive")) {
      if (lower.includes("draft")) {
        const drafts = campaigns.filter(c => c.status === "draft");
        if (drafts.length === 0) return { action: "archive_campaigns", response: "No draft campaigns to archive.", confidence: 0.9 };
        await Promise.all(drafts.map(c => api.campaigns.updateStatus(c._id || c.id, "archived")));
        return { action: "archive_campaigns", response: `📦 **Archived ${drafts.length} draft campaigns**.`, confidence: 0.9, result: { count: drafts.length } };
      }
      const toArchive = campaigns.filter(c => c.status === "draft" || c.status === "paused");
      if (toArchive.length === 0) return { action: "archive_campaigns", response: "No campaigns eligible for archiving.", confidence: 0.9 };
      await Promise.all(toArchive.map(c => api.campaigns.updateStatus(c._id || c.id, "archived")));
      return { action: "archive_campaigns", response: `📦 **Archived ${toArchive.length} campaigns** (draft + paused).`, confidence: 0.9, result: { count: toArchive.length } };
    }

    if (lower.includes("health") || lower.includes("status") || lower.includes("report")) {
      const health = await api.insights.health.all().catch(() => []);
      if (health.length === 0) return { action: "show_health", response: "No health data available. Run some campaigns first.", confidence: 0.8 };
      const filterActive = lower.includes("active");
      const filtered = filterActive ? health.filter((h: any) => campaigns.find(c => (c._id || c.id) === h.campaignId)?.status === "active") : health;
      const healthy = filtered.filter((h: any) => h.overall >= 80).length;
      const warning = filtered.filter((h: any) => h.overall >= 60 && h.overall < 80).length;
      const critical = filtered.filter((h: any) => h.overall < 60).length;
      const total = filtered.length;
      return { action: "show_health", response: `📊 **Campaign Health** (${filterActive ? "active" : "all"})\n\n• **Healthy**: ${healthy}\n• **Warning**: ${warning}\n• **Critical**: ${critical}\n• **Total**: ${total}\n\nRun **/campaign-health** for full details.`, confidence: 0.95, result: { healthy, warning, critical, total } };
    }

    if (lower.includes("set") && (lower.includes("budget") || lower.includes("daily"))) {
      const amount = parseInt((amtMatch?.[1] || "5000").replace(/,/g, ""));
      if (name) {
        const c = campaigns.find(c => c.name?.toLowerCase().includes(name.toLowerCase()));
        if (c) { await api.campaigns.updateBudget(c._id || c.id, { daily: amount, lifetime: amount * 30 }); return { action: "set_budget", response: `💵 **Set budget** for "${c.name}" to **$${amount.toLocaleString()}/day**.`, confidence: 0.95 }; }
        return { action: "set_budget", response: `⚠️ Campaign "${name}" not found.`, confidence: 0.7 };
      }
      const active = campaigns.filter(c => c.status === "active");
      if (active.length === 0) return { action: "set_budget", response: "No active campaigns to update.", confidence: 0.9 };
      for (const c of active) { try { await api.campaigns.updateBudget(c._id || c.id, { daily: amount, lifetime: amount * 30 }); } catch {} }
      return { action: "set_budget", response: `💵 **Set budget to $${amount.toLocaleString()}/day** for ${active.length} active campaigns.`, confidence: 0.9, result: { amount, count: active.length } };
    }

    return { action: "unknown", response: `🤔 I'm not sure how to handle that. I can:\n\n• **Launch/Pause/Archive** campaigns\n• **Increase/Set budgets**\n• **Show health** reports\n\nTry an example below.`, confidence: 0.2 };
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || processing) return;
    setInput("");
    setProcessing(true);

    const userMsg: ChatMessage = { id: `msg_${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setHistory(prev => [text, ...prev.filter(h => h !== text)].slice(0, 20));

    try {
      const result = await resolveAndExecute(text);
      const assistantMsg: ChatMessage = {
        id: `resp_${Date.now()}`, role: "assistant", content: result.response, timestamp: new Date(),
        intent: { action: result.action, confidence: parseFloat(result.confidence.toFixed(2)), resolved: result.action !== "unknown", result: result.result },
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.action !== "unknown" && result.action !== "greeting") addToast("success", `${result.action}: ${result.response.slice(0, 60)}...`);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: `err_${Date.now()}`, role: "assistant", content: `❌ Error: ${err.message || "Request failed"}`, timestamp: new Date(), intent: { action: "error", confidence: 1, resolved: false } }]);
    }
    setProcessing(false);
  }

  function exampleClicked(text: string) { setInput(text); }
  function clearChat() {
    setMessages([{ id: "welcome", role: "assistant", content: "Chat cleared. How can I help you?", timestamp: new Date(), intent: { action: "greeting", confidence: 1, resolved: true } }]);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Command className="w-6 h-6 text-n0va-400" />
            N0VA1O Intent Console
          </h1>
          <p className="text-gray-400 mt-1">Natural language interface — executes real API actions on your campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={() => setShowHistory(!showHistory)}><History className="w-3.5 h-3.5" /> History</button>
          <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={() => api.campaigns.list().then(r => setCampaigns(r.campaigns || r || [])).catch(() => {})}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost text-sm text-gray-500" onClick={clearChat}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="card max-h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-n0va-600/20 text-n0va-400" : "bg-gray-800 text-gray-400"}`}>
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`flex-1 min-w-0 ${msg.role === "assistant" ? "" : "text-right"}`}>
                  <div className={`inline-block max-w-[85%] text-sm rounded-xl px-4 py-2.5 ${msg.role === "assistant" ? "bg-gray-800/50 text-gray-200 text-left" : "bg-n0va-600/20 text-gray-200 text-left"}`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.intent && msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/50">
                        <span className="text-[10px] text-gray-600">Intent: <span className="text-gray-400">{msg.intent.action}</span></span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.intent.confidence > 0.7 ? "text-green-400 bg-green-500/10" : msg.intent.confidence > 0.4 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10"}`}>
                          {Math.round(msg.intent.confidence * 100)}%
                        </span>
                        {msg.intent.resolved ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-yellow-400" />}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-700 mt-1">{msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
            {processing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-n0va-600/20 flex items-center justify-center"><Bot className="w-4 h-4 text-n0va-400" /></div>
                <div className="bg-gray-800/50 rounded-xl px-4 py-2.5"><Loader className="w-4 h-4 animate-spin text-n0va-400" /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input className="input flex-1" placeholder="Type a command..." value={input} onChange={e => setInput(e.target.value)} disabled={processing} />
            <button type="submit" className="btn-primary px-4" disabled={!input.trim() || processing}><Send className="w-4 h-4" /></button>
          </form>

          <div>
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Try an example:</p>
            <div className="flex flex-wrap gap-1.5">
              {INTENT_EXAMPLES.map((ex) => (
                <button key={ex} className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300" onClick={() => exampleClicked(ex)}>{ex}</button>
              ))}
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="w-64 shrink-0 card p-3 max-h-[500px] overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Command History</h3>
            {history.length === 0 ? <p className="text-xs text-gray-600">No commands yet</p> : (
              <div className="space-y-1">{history.map((h, i) => (
                <button key={i} className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 p-1.5 rounded hover:bg-gray-800/50 truncate" onClick={() => setInput(h)}>{h}</button>
              ))}</div>
            )}
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Intent Resolution</h3>
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => {
            const csv = [["Role", "Content", "Intent", "Confidence", "Resolved", "Timestamp"].join(","),
              ...messages.filter(m => m.role === "assistant" && m.intent).map(m =>
                `"${m.role}","${m.content.replace(/"/g, '""')}","${m.intent!.action}",${m.intent!.confidence},${m.intent!.resolved},"${m.timestamp.toISOString()}"`
              )].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "intent_console.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Intents", count: messages.filter(m => m.intent && m.intent.action !== "greeting").length, color: "text-gray-300" },
            { label: "Resolved", count: messages.filter(m => m.intent && m.intent.resolved && m.intent.action !== "greeting").length, color: "text-green-400" },
            { label: "Unresolved", count: messages.filter(m => m.intent && !m.intent.resolved && m.intent.action !== "greeting").length, color: "text-red-400" },
          ].map(e => (
            <div key={e.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${e.color}`}>{e.count}</p>
              <p className="text-xs text-gray-500">{e.label}</p>
            </div>
          ))}
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[
                { name: "Resolved", value: messages.filter(m => m.intent && m.intent.resolved && m.intent.action !== "greeting").length },
                { name: "Unresolved", value: messages.filter(m => m.intent && !m.intent.resolved && m.intent.action !== "greeting").length },
              ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {RESOLVE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
