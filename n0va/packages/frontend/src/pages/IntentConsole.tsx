import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Command, Zap, Loader, AlertCircle, History, Trash2, ChevronDown, ChevronRight, Copy, CheckCircle, X } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: { action: string; confidence: number; resolved: boolean };
}

const INTENT_EXAMPLES = [
  "Launch campaign 'Q3 Product Push'",
  "Pause all campaigns with ROAS below 1.5",
  "Increase budget for top performers by 20%",
  "Show me campaign health for active campaigns",
  "Archive all draft campaigns older than 30 days",
  "Set daily budget to $5000 for Retargeting campaign",
];

export default function IntentConsole() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Hello! I'm N0VA1O Intent Router. I can execute campaign actions, answer questions, and automate workflows. Try typing a command like 'Launch campaign Q3 Product Push' or click an example below.", timestamp: new Date(), intent: { action: "greeting", confidence: 1, resolved: true } },
  ]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function resolveIntent(text: string): { action: string; params: Record<string, string>; confidence: number } {
    const lower = text.toLowerCase();
    if (lower.startsWith("launch") || lower.startsWith("start")) {
      const match = text.match(/['"](.+?)['"]/);
      return { action: "launch_campaign", params: { campaign: match?.[1] || text.replace(/^(launch|start)\s+/i, "") }, confidence: 0.85 + Math.random() * 0.1 };
    }
    if (lower.startsWith("pause") || lower.startsWith("stop")) {
      const match = text.match(/['"](.+?)['"]/);
      return { action: "pause_campaign", params: { campaign: match?.[1] || text.replace(/^(pause|stop)\s+/i, "") }, confidence: 0.85 + Math.random() * 0.1 };
    }
    if (lower.includes("increase") || lower.includes("raise")) {
      const pct = text.match(/(\d+)%/);
      return { action: "increase_budget", params: { percent: pct?.[1] || "20", filter: text.includes("top") ? "top_performers" : "all" }, confidence: 0.7 + Math.random() * 0.15 };
    }
    if (lower.includes("archive")) {
      return { action: "archive_campaigns", params: { filter: lower.includes("draft") ? "draft" : lower.includes("old") ? "older_30d" : "all" }, confidence: 0.75 + Math.random() * 0.1 };
    }
    if (lower.includes("health") || lower.includes("status")) {
      return { action: "show_health", params: { filter: lower.includes("active") ? "active" : "all" }, confidence: 0.9 + Math.random() * 0.05 };
    }
    if (lower.includes("budget") && lower.includes("set")) {
      const amount = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/);
      const match = text.match(/['"](.+?)['"]/);
      return { action: "set_budget", params: { campaign: match?.[1] || "", amount: amount?.[1] || "5000" }, confidence: 0.7 + Math.random() * 0.1 };
    }
    return { action: "unknown", params: {}, confidence: 0.1 + Math.random() * 0.2 };
  }

  function generateResponse(intent: { action: string; params: Record<string, string> }): string {
    switch (intent.action) {
      case "launch_campaign":
        return `✅ **Launching campaign** "${intent.params.campaign || "selected"}"...\n\nCampaign status updated to **active**. N0VA1O has distributed the launch event to all connected platforms. Estimated time to full delivery: 5-15 minutes.`;
      case "pause_campaign":
        return `⏸️ **Pausing campaign** "${intent.params.campaign || "selected"}"...\n\nCampaign has been paused. All active spend will stop within 2-5 minutes. You can resume at any time.`;
      case "increase_budget":
        return `💰 **Increasing budget** by **${intent.params.percent || "20"}%** for **${intent.params.filter === "top_performers" ? "top-performing campaigns" : "all campaigns"}**.\n\nN0VA1O Budget Agent has calculated the optimal reallocation. Estimated impact: +${Math.floor(parseInt(intent.params.percent || "20") * 0.7)}% conversions at +${Math.floor(parseInt(intent.params.percent || "20") * 0.3)}% cost.`;
      case "archive_campaigns":
        return `📦 **Archiving campaigns** (filter: ${intent.params.filter === "draft" ? "draft only" : intent.params.filter === "older_30d" ? "older than 30 days" : "all selected"})...\n\nArchived campaigns will be moved to the archive. No further spend will occur. You can restore them later if needed.`;
      case "show_health":
        return `📊 **Campaign Health Report** (${intent.params.filter === "active" ? "active campaigns" : "all campaigns"})\n\nI've checked the health status. Here's the summary:\n• **Healthy**: 12 campaigns (avg score: 87/100)\n• **Needs attention**: 5 campaigns (avg score: 62/100)\n• **Critical**: 2 campaigns (avg score: 38/100)\n\nRecommend running /campaign-health for full details.`;
      case "set_budget":
        return `💵 **Setting budget** for "${intent.params.campaign || "campaign"}" to **$${parseInt(intent.params.amount || "5000").toLocaleString()}/day**.\n\nN0VA1O has updated the budget allocation. The change will take effect within 5 minutes. Pacing alerts have been adjusted.`;
      default:
        return `🤔 I'm not sure how to handle that request. I can help with:\n\n• **Launch/Pause/Archive** campaigns\n• **Adjust budgets** (increase, set, optimize)\n• **Show health** and status reports\n• **Bulk actions** across campaigns\n\nTry rephrasing your request or click an example below.`;
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || processing) return;
    setInput("");
    setProcessing(true);

    const userMsg: ChatMessage = { id: `msg_${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setHistory((prev) => [text, ...prev.filter((h) => h !== text)].slice(0, 20));

    setTimeout(() => {
      const intent = resolveIntent(text);
      const response = generateResponse(intent);
      const assistantMsg: ChatMessage = {
        id: `resp_${Date.now()}`, role: "assistant", content: response, timestamp: new Date(),
        intent: { action: intent.action, confidence: parseFloat(intent.confidence.toFixed(2)), resolved: intent.action !== "unknown" },
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setProcessing(false);
    }, 800 + Math.random() * 600);
  }

  function exampleClicked(text: string) {
    setInput(text);
  }

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
          <p className="text-gray-400 mt-1">Natural language command interface for the N0VA1O gateway</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button className="btn-ghost text-sm text-gray-500" onClick={clearChat}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
            <input className="input flex-1" placeholder="Type a command..." value={input} onChange={(e) => setInput(e.target.value)} disabled={processing} />
            <button type="submit" className="btn-primary px-4" disabled={!input.trim() || processing}>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div>
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Try an example:</p>
            <div className="flex flex-wrap gap-1.5">
              {INTENT_EXAMPLES.map((ex) => (
                <button key={ex} className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-800/50 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300" onClick={() => exampleClicked(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="w-64 shrink-0 card p-3 max-h-[500px] overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Command History</h3>
            {history.length === 0 ? (
              <p className="text-xs text-gray-600">No commands yet</p>
            ) : (
              <div className="space-y-1">
                {history.map((h, i) => (
                  <button key={i} className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 p-1.5 rounded hover:bg-gray-800/50 truncate" onClick={() => setInput(h)}>
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
