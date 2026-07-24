import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader, Minimize2, Maximize2, Zap } from "lucide-react";
import { api } from "../api/client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

const CHAT_KEY = "n0va_ai_chat";

const SUGGESTIONS = [
  "How are my campaigns performing?",
  "Which campaigns need attention?",
  "What's my total spend?",
  "Show me draft campaigns ready to launch",
  "Any budget alerts?",
  "How many creatives do I have?",
  "What's my best performing campaign?",
  "Summary of everything",
];

function generateResponse(query: string, data: any): string {
  const q = query.toLowerCase();
  const campaigns = data.campaigns || [];
  const creatives = data.creatives || [];
  const agents = data.agents || [];

  const totalSpend = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
  const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.lifetime || 0), 0);
  const active = campaigns.filter((c: any) => c.status === "active");
  const draft = campaigns.filter((c: any) => c.status === "draft");
  const paused = campaigns.filter((c: any) => c.status === "paused");
  const pending = campaigns.filter((c: any) => c.status === "pending_approval");

  if (q.includes("how are") || q.includes("performing") || q.includes("summary")) {
    return `Here's your campaign overview:\n\n• **${campaigns.length}** total campaigns (${active.length} active, ${draft.length} draft, ${paused.length} paused)\n• **$${totalSpend.toLocaleString()}** spent of **$${totalBudget.toLocaleString()}** total budget\n• **${creatives.length}** creatives available\n• **${agents.length}** AI agents running\n• **${pending.length}** campaigns pending approval\n\n${active.length > 0 ? `Your top active campaign is "${active[0].name}" with $${(active[0].budget?.spent || 0).toLocaleString()} spent.` : "No active campaigns — consider launching one!"}`;
  }

  if (q.includes("need attention") || q.includes("alert") || q.includes("problem")) {
    const issues: string[] = [];
    const overBudget = campaigns.filter((c: any) => (c.budget?.spent || 0) > (c.budget?.lifetime || 0));
    const nearingLimit = campaigns.filter((c: any) => {
      const spent = c.budget?.spent || 0;
      const total = c.budget?.lifetime || 1;
      return spent / total > 0.8 && spent / total < 1;
    });

    if (overBudget.length > 0) issues.push(`⚠️ **${overBudget.length} campaign(s)** over budget`);
    if (nearingLimit.length > 0) issues.push(`⚠️ **${nearingLimit.length} campaign(s)** nearing budget limit`);
    if (pending.length > 0) issues.push(`👀 **${pending.length} campaign(s)** pending approval`);
    if (draft.length > 0) issues.push(`📝 **${draft.length} campaign(s)** still in draft`);

    if (issues.length === 0) return "Everything looks good! No campaigns need immediate attention.";
    return "Here's what needs attention:\n\n" + issues.join("\n");
  }

  if (q.includes("spend") || q.includes("budget") || q.includes("cost")) {
    return `**Budget Overview:**\n\n• Total budget: **$${totalBudget.toLocaleString()}**\n• Total spent: **$${totalSpend.toLocaleString()}**\n• Remaining: **$${(totalBudget - totalSpend).toLocaleString()}**\n• Utilization: **${totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0}%**\n\nTop spending campaign: "${campaigns.sort((a: any, b: any) => (b.budget?.spent || 0) - (a.budget?.spent || 0))[0]?.name || "N/A"}"`;
  }

  if (q.includes("draft") || q.includes("ready to launch")) {
    if (draft.length === 0) return "No draft campaigns. All campaigns have been launched or are in other states.";
    return `**${draft.length} draft campaign(s) ready for launch:**\n\n${draft.map((c: any) => `• **${c.name}** — $${(c.budget?.lifetime || 0).toLocaleString()} budget`).join("\n")}\n\nVisit the Launch Checklist to review each campaign before going live.`;
  }

  if (q.includes("creative") || q.includes("ad")) {
    return `You have **${creatives.length} creative(s)** in your library:\n\n• Active: ${creatives.filter((c: any) => c.status === "active").length}\n• Draft: ${creatives.filter((c: any) => c.status === "draft").length}\n• Pending approval: ${creatives.filter((c: any) => c.status === "pending_approval").length}\n• Approved: ${creatives.filter((c: any) => c.status === "approved").length}\n\nTip: Use the Creative Gallery for a visual overview.`;
  }

  if (q.includes("best") || q.includes("top")) {
    if (active.length === 0) return "No active campaigns to compare. Launch a campaign first!";
    const sorted = [...active].sort((a: any, b: any) => (b.budget?.spent || 0) - (a.budget?.spent || 0));
    return `Your best performing campaign is **"${sorted[0].name}"** with **$${(sorted[0].budget?.spent || 0).toLocaleString()}** in spend and **${((sorted[0].budget?.spent || 0) / (sorted[0].budget?.lifetime || 1) * 100).toFixed(0)}%** budget utilization.`;
  }

  if (q.includes("agent") || q.includes("ai")) {
    return `You have **${agents.length} AI agent(s)** configured:\n\n${agents.map((a: any) => `• **${a.name}** (${a.type}) — ${a.status}`).join("\n")}\n\nAgents help automate budget optimization, creative testing, audience discovery, bid management, and fraud detection.`;
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return `Hello! I'm your N0VA AI assistant. I can help you with:\n\n• Campaign performance overview\n• Budget and spend analysis\n• Identifying campaigns needing attention\n• Creative and audience insights\n• Agent status and recommendations\n\nTry asking me a question!`;
  }

  return `I found **${campaigns.length} campaigns**, **${creatives.length} creatives**, and **${agents.length} agents** in your account. Total spend across all campaigns is **$${totalSpend.toLocaleString()}**.\n\nWhat would you like to know more about?`;
}

function loadHistory(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(msgs: ChatMessage[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-50)));
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
    Promise.all([
      api.campaigns.list().catch(() => ({ campaigns: [] })),
      api.creatives.list().catch(() => []),
      api.agents.list().catch(() => []),
    ]).then(([c, cr, a]) => {
      setData({ campaigns: Array.isArray(c) ? c : c.campaigns || [], creatives: cr || [], agents: a || [] });
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim() || !data) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: text.trim(), timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveHistory(updated);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const response = generateResponse(text, data);
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "assistant", text: response, timestamp: Date.now() };
      const final = [...updated, assistantMsg];
      setMessages(final);
      saveHistory(final);
      setLoading(false);
    }, 800 + Math.random() * 600);
  }

  function formatMessage(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("•")) return <p key={i} className="text-xs text-gray-200 ml-2">• {line.slice(1).trim()}</p>;
      if (line.startsWith("⚠️") || line.startsWith("👀") || line.startsWith("📝")) return <p key={i} className="text-xs text-gray-200 ml-2">{line}</p>;
      return <p key={i} className="text-xs text-gray-200" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>") }} />;
    });
  }

  return (
    <>
      {/* Chat bubble */}
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-n0va-600 hover:bg-n0va-500 text-white flex items-center justify-center shadow-lg shadow-n0va-600/30 transition-all hover:scale-105 ${open ? "hidden" : ""}`}
        title="AI Assistant"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[380px] bg-n0va-800 border border-gray-800 rounded-xl shadow-2xl shadow-black/40 flex flex-col transition-all ${minimized ? "h-14" : "h-[560px]"}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-n0va-600/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-n0va-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">N0VA AI</p>
                <p className="text-[10px] text-gray-500">{data ? `${data.campaigns.length} campaigns · ${data.creatives.length} creatives` : "Loading..."}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(!minimized)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800">
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-n0va-600/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-n0va-400" />
                      </div>
                      <div className="bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                        <p className="text-xs text-gray-300">Hi! I'm your N0VA AI assistant. Ask me anything about your campaigns, budgets, creatives, and more.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-9">
                      {SUGGESTIONS.slice(0, 4).map((s) => (
                        <button key={s} onClick={() => sendMessage(s)} className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 px-2 py-1 rounded-lg border border-gray-700 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-n0va-600" : "bg-gray-700"}`}>
                      {m.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-n0va-400" />}
                    </div>
                    <div className={`px-3 py-2 rounded-xl max-w-[85%] ${m.role === "user" ? "bg-n0va-600 rounded-tr-sm" : "bg-gray-800 rounded-tl-sm"}`}>
                      {m.role === "user" ? (
                        <p className="text-xs text-white">{m.text}</p>
                      ) : (
                        formatMessage(m.text)
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-n0va-400" />
                    </div>
                    <div className="bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2">
                      <Loader className="w-4 h-4 animate-spin text-n0va-400" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions after messages */}
              {messages.length > 0 && !loading && (
                <div className="px-3 pb-1">
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTIONS.filter((s) => !messages.some((m) => m.role === "user" && m.text === s)).slice(0, 3).map((s) => (
                      <button key={s} onClick={() => sendMessage(s)} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg border border-gray-700 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-800 shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading || !data}
                  />
                  <button type="submit" disabled={loading || !input.trim() || !data} className="btn-primary p-2.5">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
