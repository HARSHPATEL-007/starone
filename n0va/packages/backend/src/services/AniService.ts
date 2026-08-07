import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const ANI_MODULES = ["mail", "chat", "calendar", "tasks", "campaigns", "docs", "meet", "n0va1o", "search", "notes"];

export const INTENT_LIBRARY = [
  { intent: "summarize", label: "Summarize", keywords: ["summar", "tl;dr", "recap", "digest", "brief"] },
  { intent: "draft_email", label: "Draft email", keywords: ["draft", "email", "send to", "reply"] },
  { intent: "find", label: "Find", keywords: ["find", "search", "look for", "where is", "locate"] },
  { intent: "schedule", label: "Schedule", keywords: ["schedule", "book", "meeting", "calendar", "appointment"] },
  { intent: "task", label: "Create task", keywords: ["remind", "todo", "task", "to-do", "follow up"] },
  { intent: "focus", label: "Focus", keywords: ["focus", "do not disturb", "quiet"] },
  { intent: "campaign", label: "Campaigns", keywords: ["campaign", "ads", "marketing", "roi", "budget"] },
  { intent: "automate", label: "Automate", keywords: ["automate", "automation", "flow", "workflow"] },
  { intent: "voice", label: "Voice", keywords: ["call", "voice", "voicemail"] },
  { intent: "priority", label: "Priority", keywords: ["priorit", "urgent", "important", "top", "first"] },
  { intent: "help", label: "Help", keywords: ["help", "what can you", "what do you do", "abilities"] },
] as const;

export const QUICK_AUTOMATIONS = [
  { id: "morning_briefing", name: "Morning Briefing", description: "Aggregate overnight signals into a single briefing", module: "ani", steps: 4, icon: "sunrise" },
  { id: "triage_inbox", name: "Triage Inbox", description: "Prioritize unread mail and draft replies to the urgent ones", module: "mail", steps: 6, icon: "inbox" },
  { id: "summarize_chats", name: "Summarize Unread Chats", description: "Summarize threads since your last read and flag decisions", module: "chat", steps: 3, icon: "chat" },
  { id: "plan_day", name: "Plan My Day", description: "Map calendar to tasks, carve focus time, set reminders", module: "calendar", steps: 5, icon: "calendar" },
  { id: "campaign_pulse", name: "Campaign Pulse", description: "One-line scorecard of every active campaign", module: "campaigns", steps: 3, icon: "trending" },
  { id: "weekly_digest", name: "Weekly Digest", description: "Compile the week: wins, risks, action items", module: "ani", steps: 5, icon: "chart" },
];

const DEFAULT_MEMORIES = [
  { topic: "preferences", text: "Prefers async communication for status updates; expects numbers before narratives.", importance: 3 },
  { topic: "goals", text: "Q4 priority is enterprise activation net-new logos with a healthy payback window.", importance: 4 },
  { topic: "contacts", text: "Key escalation contact on customer escalations is the Director of CX.", importance: 3 },
  { topic: "context", text: "Monday mornings are blocked for deep work; do not schedule meetings then.", importance: 4 },
];

const DEFAULT_SUGGESTIONS = [
  { context: "inbox", title: "3 unread emails from your team need prioritization", action: "Run 'Triage Inbox'", intent: "draft_email", priority: "high" },
  { context: "campaign", title: "Q3 campaign spend is 8% ahead of plan", action: "Show campaign pulse", intent: "campaign", priority: "medium" },
  { context: "calendar", title: "No focus block today - protect 2 hours", action: "Plan my day", intent: "focus", priority: "medium" },
  { context: "tasks", title: "4 tasks due today with 2 overdue", action: "Create a priority task list", intent: "task", priority: "medium" },
];

export class AniService {
  private id(s: string): string {
    return `ani_${hashStr(s).toString(36)}`;
  }

  private context(tenantId: string): any {
    const mem = DataStore.mem();
    const today = new Date().toISOString().slice(0, 10);
    const inbox = mem.find("messages", (m: any) => m.tenantId === tenantId && !m.read).length;
    const tasks = mem.find("tasks", (t: any) => t.tenantId === tenantId && t.status !== "done").length;
    const eventsToday = mem.find("calendar_events", (e: any) => e.tenantId === tenantId && e.date === today).length;
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
    const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
    return { inboxCount: inbox, tasks, eventsToday, activeCampaigns, campaigns: campaigns.length, totalBudget };
  }

  moduleHealth() {
    return { module: "ani", status: "healthy", collections: ["ani_memory", "ani_briefings", "ani_automations", "ani_voice", "ani_suggestions"] };
  }

  // ---- Seeding ----

  private ensureSeed(tenantId: string) {
    const mem = DataStore.mem();
    if (!mem.findOne("ani_memory", (m: any) => m.tenantId === tenantId)) {
      for (const d of DEFAULT_MEMORIES) mem.insert("ani_memory", { tenantId, memoryId: this.id(tenantId + d.topic), ...d, createdAt: new Date().toISOString() });
    }
    if (!mem.findOne("ani_suggestions", (s: any) => s.tenantId === tenantId)) {
      for (const s of DEFAULT_SUGGESTIONS) mem.insert("ani_suggestions", { tenantId, suggestionId: this.id(tenantId + s.title), ...s, dismissed: false, accepted: false, createdAt: new Date().toISOString() });
    }
    if (!mem.findOne("ani_settings", (s: any) => s.tenantId === tenantId && s.userId === "user_001")) {
      mem.insert("ani_settings", { tenantId, userId: "user_001", prefs: { tone: "concise", morningBriefing: true, voiceEnabled: true, deepLinkModules: ANI_MODULES }, updatedAt: new Date().toISOString() });
    }
  }

  overview(tenantId: string, userId: string = "user_001") {
    this.ensureSeed(tenantId);
    const mem = DataStore.mem();
    const ctx = this.context(tenantId);
    const hello = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening";
    return {
      greeting: `Good ${hello}, here's the state of everything.`,
      context: ctx,
      memories: mem.find("ani_memory", (m: any) => m.tenantId === tenantId).slice(0, 5),
      briefings: mem.find("ani_briefings", (b: any) => b.tenantId === tenantId).slice(-3).reverse(),
      suggestions: mem.find("ani_suggestions", (s: any) => s.tenantId === tenantId && !s.dismissed && !s.accepted).slice(0, 4),
      automations: QUICK_AUTOMATIONS,
      recentRuns: mem.find("ani_automation_runs", (r: any) => r.tenantId === tenantId).slice(-5).reverse(),
      modules: ANI_MODULES,
      summary: `You have ${ctx.inboxCount} unread email(s), ${ctx.eventsToday} event(s) today, ${ctx.tasks} open task(s), ${ctx.activeCampaigns} active campaign(s)`,
    };
  }

  chat(tenantId: string, userId: string, message: string, opts: any = {}) {
    const mem = DataStore.mem();
    const ctx = this.context(tenantId);
    const intent = this.detectIntent(message);
    const threadId = opts.threadId || `thread_${hashStr(userId + Date.now()).toString(36)}`;
    mem.insert("ani_messages", { tenantId, userId, threadId, role: "user", content: message, intent: intent.intent, timestamp: new Date().toISOString() });
    const reply = this.renderReply(tenantId, intent.intent, ctx);
    mem.insert("ani_messages", { tenantId, userId, threadId, role: "assistant", content: reply.text, actions: reply.actions, timestamp: new Date().toISOString() });
    return { threadId, intent, reply: reply.text, actions: reply.actions, ctx, summary: `Intended intent: ${intent.label}` };
  }

  conversations(tenantId: string, userId: string, opts: any = {}) {
    const mem = DataStore.mem();
    const threads = new Map<string, any>();
    for (const m of mem.find("ani_messages", (m: any) => m.tenantId === tenantId && m.userId === userId)) {
      if (!threads.has(m.threadId)) threads.set(m.threadId, { updatedAt: m.timestamp, messageCount: 0 });
      threads.get(m.threadId).updatedAt = m.timestamp;
      threads.get(m.threadId).messageCount++;
    }
    const list = [...threads.entries()]
      .map(([threadId, t]) => ({ threadId, label: `Thread ${threadId.slice(-6)}`, ...t }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const messages = opts.threadId ? mem.find("ani_messages", (m: any) => m.tenantId === tenantId && m.userId === userId && m.threadId === opts.threadId) : [];
    return { threads: list, messages, total: list.length, summary: `${list.length} conversation(s)` };
  }

  // ---- Memory ----

  memory(tenantId: string, _userId: string, _opts: any = {}) {
    const rows = DataStore.mem().find("ani_memory", (m: any) => m.tenantId === tenantId).slice(-40).reverse();
    return { memories: rows, total: rows.length, summary: `${rows.length} memory entr(y/ies)` };
  }

  memorySearch(tenantId: string, query: string, _opts: any = {}) {
    const q = query.toLowerCase();
    const rows = DataStore.mem().find("ani_memory", (m: any) => m.tenantId === tenantId && (m.text.toLowerCase().includes(q) || m.topic.toLowerCase().includes(q)));
    return { memories: rows, query, total: rows.length, summary: `${rows.length} match(es) for "${query}"` };
  }

  saveMemory(tenantId: string, userId: string, input: any) {
    const topic = input?.topic || "note";
    const text = input?.text || "";
    if (!text) throw new Error("text required to save a memory");
    const record = DataStore.mem().insert("ani_memory", {
      tenantId, userId, memoryId: this.id(tenantId + topic + text), topic, text,
      importance: input?.importance ?? 2, createdAt: new Date().toISOString(),
    });
    return { memory: record, summary: `Saved memory under "${topic}"` };
  }

  deleteMemory(tenantId: string, memoryId: string) {
    const ok = DataStore.mem().delete("ani_memory", (m: any) => m.tenantId === tenantId && m.memoryId === memoryId);
    if (!ok) throw new Error(`Memory "${memoryId}" not found`);
    return { memoryId, deleted: true, summary: "Memory deleted" };
  }

  memoryStats(tenantId: string) {
    const rows = DataStore.mem().find("ani_memory", (m: any) => m.tenantId === tenantId);
    const byTopic: Record<string, number> = {};
    for (const m of rows) byTopic[m.topic] = (byTopic[m.topic] || 0) + 1;
    return { total: rows.length, byTopic, summary: `${rows.length} memory entr(y/ies) across ${Object.keys(byTopic).length} topic(s)` };
  }

  // ---- Briefings ----

  listBriefings(tenantId: string, _userId: string = "user_001") {
    const rows = DataStore.mem().find("ani_briefings", (b: any) => b.tenantId === tenantId).slice(-15).reverse();
    return { briefings: rows, total: rows.length, summary: `${rows.length} briefing(s)` };
  }

  generateBriefing(tenantId: string, userId: string, type: string = "daily") {
    const valid = ["daily", "weekly", "executive"];
    if (!valid.includes(type)) throw new Error(`Unknown briefing type "${type}" — use ${valid.join(", ")}`);
    const ctx = this.context(tenantId);
    const body = type === "daily"
      ? `Today at a glance: ${ctx.inboxCount} unread email(s), ${ctx.eventsToday} meeting(s) scheduled, ${ctx.tasks} open task(s). Recommended focus: triage inbox then protect a focus block.`
      : type === "weekly"
        ? `This week: ${ctx.activeCampaigns} active campaign(s), $${ctx.totalBudget} tracked spend. Recommended: run a campaign pulse and clean the overdue task queue.`
        : `Executive ledger: ${ctx.campaigns} campaign(s), ${ctx.totalBudget} spend, ${ctx.activeCampaigns} active. The default decision is to keep the top performers funded and pause laggards.`;
    const record = DataStore.mem().insert("ani_briefings", {
      tenantId, userId, type, title: `${type[0].toUpperCase()}${type.slice(1)} Briefing`, date: new Date().toISOString().slice(0, 10),
      body, signals: ctx, actions: this.buildBriefingActions(ctx), createdAt: new Date().toISOString(),
    });
    return { briefing: record, summary: `Generated ${type} briefing` };
  }

  briefing(tenantId: string, briefingId: string) {
    const rec = DataStore.mem().findOne("ani_briefings", (b: any) => b.tenantId === tenantId && b._id === briefingId);
    if (!rec) throw new Error(`Briefing "${briefingId}" not found`);
    return { briefing: rec };
  }

  // ---- Automations ----

  automations(tenantId: string, userId: string) {
    const mem = DataStore.mem();
    const installed = mem.find("ani_automations", (a: any) => a.tenantId === tenantId && a.userId === userId);
    const all = QUICK_AUTOMATIONS.map((t) => {
      const inst = installed.find((a: any) => a.templateId === t.id);
      return { ...t, automationId: inst?._id, enabled: inst?.enabled ?? false, installed: !!inst };
    });
    return { automations: all, installedCount: installed.filter((a: any) => a.enabled).length, total: QUICK_AUTOMATIONS.length, summary: `${installed.filter((a: any) => a.enabled).length}/${QUICK_AUTOMATIONS.length} automations active` };
  }

  createAutomation(tenantId: string, userId: string, input: any) {
    if (!input?.templateId) throw new Error("templateId required");
    const tpl = QUICK_AUTOMATIONS.find((t) => t.id === input.templateId);
    if (!tpl) throw new Error(`Unknown automation "${input.templateId}"`);
    const existing = DataStore.mem().findOne("ani_automations", (a: any) => a.tenantId === tenantId && a.userId === userId && a.templateId === input.templateId);
    if (existing) return { automation: existing, summary: `${tpl.name} already installed` };
    const rec = DataStore.mem().insert("ani_automations", {
      tenantId, userId, automationId: this.id(tenantId + userId + input.templateId + Math.random()), templateId: tpl.id, name: tpl.name, description: tpl.description, module: tpl.module,
      enabled: input.enabled ?? true, config: input.config || {}, createdAt: new Date().toISOString(),
    });
    return { automation: rec, summary: `Installed ${tpl.name}` };
  }

  toggleAutomation(tenantId: string, automationId: string, enabled: boolean) {
    const updated = DataStore.mem().update("ani_automations", (a: any) => a.tenantId === tenantId && a._id === automationId, { enabled });
    if (!updated) throw new Error(`Automation "${automationId}" not found`);
    return { automation: updated, enabled, summary: `${updated.name} ${enabled ? "enabled" : "disabled"}` };
  }

  runAutomation(tenantId: string, userId: string, automationId: string, _opts: any = {}) {
    const all = DataStore.mem().find("ani_automations", (a: any) => a.tenantId === tenantId);
    const auto = all.find((a: any) => a._id === automationId) || all.find((a: any) => a.templateId === automationId);
    if (!auto) throw new Error(`Automation "${automationId}" not found`);
    const ctx = this.context(tenantId);
    const steps = this.planSteps(auto, ctx);
    (Array.isArray(steps) ? steps : []).forEach((step) => {
      if (step.type === "notification") DataStore.mem().insert("ani_automation_events", { tenantId, userId, automationId: auto._id, event: "notification", message: step.message, at: new Date().toISOString() });
    });
    const run = DataStore.mem().insert("ani_automation_runs", {
      tenantId, userId, automationId: auto._id, templateId: auto.templateId, name: auto.name, status: "completed", steps,
      summary: `Ran for ${auto.name}`, ranAt: new Date().toISOString(),
    });
    return { run, summary: `Completed ${auto.name}` };
  }

  automationRuns(tenantId: string, _opts: any = {}) {
    const rows = DataStore.mem().find("ani_automation_runs", (r: any) => r.tenantId === tenantId).slice(-10).reverse();
    return { runs: rows, total: rows.length, summary: `${rows.length} automation runs` };
  }

  // ---- Voice ----

  voiceCatalog(tenantId: string) {
    const commands = [
      { command: "summarize my morning", intent: "briefing", module: "ani" },
      { command: "triage my inbox", intent: "draft_email", module: "mail" },
      { command: "schedule a meeting", intent: "schedule", module: "calendar" },
      { command: "run campaign pulse", intent: "campaign", module: "campaigns" },
      { command: "what's my priority", intent: "priority", module: "tasks" },
    ];
    return { commands: [...commands, { command: "help", intent: "help", module: "ani" }], total: commands.length + 1, summary: `${commands.length + 1} voice commands` };
  }

  executeVoiceCommand(tenantId: string, userId: string, text: string) {
    const intent = this.detectIntent(text);
    const ctx = this.context(tenantId);
    const reply = this.renderReply(tenantId, intent.intent, ctx);
    DataStore.mem().insert("ani_voice", { tenantId, userId, text, intent: intent.intent, reply: reply.text, at: new Date().toISOString() });
    return { command: text, intent, reply: reply.text, actions: reply.actions, summary: `Executed "${intent.label}"` };
  }

  voiceLog(tenantId: string, _opts: any = {}) {
    const rows = DataStore.mem().find("ani_voice", (h: any) => h.tenantId === tenantId).slice(-15).reverse();
    return { history: rows, total: rows.length, summary: `${rows.length} voice command(s)` };
  }

  // ---- Suggestions ----

  suggestions(tenantId: string, _userId: string) {
    this.ensureSeed(tenantId);
    const rows = DataStore.mem().find("ani_suggestions", (s: any) => s.tenantId === tenantId && !s.dismissed && !s.accepted).slice(0, 8);
    const history = DataStore.mem().find("ani_suggestions", (s: any) => s.tenantId === tenantId && (s.dismissed || s.accepted)).slice(-8).reverse();
    return { suggestions: rows, history, total: rows.length, summary: `${rows.length} proactive suggestion(s)` };
  }

  dismissSuggestion(tenantId: string, suggestionId: string) {
    const updated = DataStore.mem().update("ani_suggestions", (s: any) => s.tenantId === tenantId && s.suggestionId === suggestionId, { dismissed: true });
    if (!updated) throw new Error(`Suggestion "${suggestionId}" not found`);
    return { suggestion: updated, summary: "Dismissed suggestion" };
  }

  acceptSuggestion(tenantId: string, suggestionId: string) {
    const sug = DataStore.mem().findOne("ani_suggestions", (s: any) => s.tenantId === tenantId && s.suggestionId === suggestionId);
    if (!sug) throw new Error(`Suggestion "${suggestionId}" not found`);
    DataStore.mem().update("ani_suggestions", (s: any) => s.tenantId === tenantId && s.suggestionId === suggestionId, { accepted: true, acceptedAt: new Date().toISOString() });
    return { suggestion: sug, executed: { intent: sug.intent, note: `Queued "${sug.action}"` }, summary: "Accepted and queued suggestion" };
  }

  // ---- Settings ----

  settings(tenantId: string, userId: string) {
    const rec = DataStore.mem().findOne("ani_settings", (s: any) => s.tenantId === tenantId && s.userId === userId);
    return { settings: rec ?? { prefs: {} }, summary: "ANI settings" };
  }

  updateSettings(tenantId: string, userId: string, patch: any) {
    const existing = DataStore.mem().findOne("ani_settings", (s: any) => s.tenantId === tenantId && s.userId === userId);
    if (existing) DataStore.mem().update("ani_settings", (s: any) => s.tenantId === tenantId && s.userId === userId, { prefs: { ...(existing.prefs || {}), ...(patch || {}) }, updatedAt: new Date().toISOString() });
    else DataStore.mem().insert("ani_settings", { tenantId, userId, prefs: patch || {}, updatedAt: new Date().toISOString() });
    return this.settings(tenantId, userId);
  }

  stats(tenantId: string) {
    const mem = DataStore.mem();
    const messages = mem.find("ani_messages", (m: any) => m.tenantId === tenantId);
    const runs = mem.find("ani_automation_runs", (r: any) => r.tenantId === tenantId);
    const memories = mem.find("ani_memory", (m: any) => m.tenantId === tenantId);
    const today = new Date().toISOString().slice(0, 10);
    return {
      messages_today: messages.filter((m: any) => m.timestamp?.slice(0, 10) === today).length,
      total_messages: messages.length,
      automations_ran: runs.length,
      memories: memories.length,
      summary: `${messages.length} conversation message(s), ${runs.length} automation(s), ${memories.length} memor(y/ies)`,
    };
  }

  // ---- Intent / Reply engine ----

  detectIntent(text: string): any {
    const t = (text || "").toLowerCase();
    for (const lib of INTENT_LIBRARY) {
      if (lib.keywords.some((k: string) => t.includes(k))) return { intent: lib.intent, label: lib.label };
    }
    return { intent: "answer", label: "Answer" };
  }

  private renderReply(tenantId: string, intent: string, ctx: any) {
    let text: string;
    let actions: string[] = [];
    switch (intent) {
      case "summarize":
        text = `Here's the state of your world: ${ctx.inboxCount} unread email(s), ${ctx.eventsToday} event(s) today, ${ctx.tasks} open task(s). The biggest things worth attention: inbox and campaign pacing.`;
        actions = ["generate briefing", "summarize threads"];
        break;
      case "draft_email":
        text = `I can draft that now. From your inbox I found ${ctx.inboxCount} unread — I'd address the top priority sender first.`;
        actions = ["draft priority reply", "triage inbox"];
        break;
      case "find":
        text = `Here's what I know across modules: ${ctx.activeCampaigns} active campaign(s), ${ctx.tasks} open task(s). I can surface memories and open items anywhere in N0VA.`;
        break;
      case "schedule":
        text = `You have ${ctx.eventsToday} event(s) today and ${ctx.tasks} open task(s). I'd block 45 minutes of focus to protect deep work.`;
        actions = ["open my calendar", "validate focus"];
        break;
      case "task":
        text = `Captured. You now have ${ctx.tasks} open task(s); the overdue ones get flagged first.`;
        actions = ["create task", "list overdue"];
        break;
      case "focus":
        text = `Enabling focus mode — no notifications for the next 2 hours unless it's priority. Campaign-level panics still get through.`;
        break;
      case "campaign":
        text = `Active campaigns: ${ctx.activeCampaigns}. Total spend $${ctx.totalBudget}. The one to watch is whichever is pacing ahead of plan.`;
        actions = ["run campaign pulse", "budget snapshot"];
        break;
      case "automate":
        text = `I can wire that. Pick from: Morning Briefing, Triage Inbox, Summarize Unread Chats, Plan My Day, Campaign Pulse, or Weekly Digest.`;
        break;
      case "voice":
        text = `Voice is online. Try "schedule a meeting", "triage my inbox", or "run campaign pulse".`;
        break;
      case "priority":
        text = `Priority order right now: 1) unread mail from senior people, 2) campaigns nearing their spend cap, 3) today's meetings with prep needed.`;
        break;
      case "help":
        text = `I help across the whole workspace — try "summarize my morning", "triage my inbox", "run campaign pulse", or "what's my priority".`;
        break;
      default:
        text = `Got it — I can pull cross-module context and act. Ask me to summarize, schedule, triage, or run an automation.`;
    }
    return { text: `${text}${tenantId === "test_tenant_001" ? " (test)" : ""}`, actions };
  }

  private planSteps(auto: any, ctx: any): any[] {
    const t = auto.templateId || auto.name;
    if (t === "morning_briefing" || t === "brief") return [
      { type: "signal", message: `Pulled ${ctx.inboxCount} unread email signal`, ok: true },
      { type: "aggregate", message: `Aggregated ${ctx.eventsToday} event(s) for today`, ok: true },
      { type: "notification", message: `You have ${ctx.inboxCount} unread email(s) and ${ctx.tasks} open task(s)`, ok: true },
    ];
    if (t === "triage_inbox" || t === "email") return [
      { type: "signal", message: `Scanned ${ctx.inboxCount} unread email(s)`, ok: true },
      { type: "classify", message: "Prioritized by sender rank and urgency", ok: true },
      { type: "notification", message: `Top priority: reply to the leadership thread`, ok: true },
    ];
    if (t === "plan_day" || t === "calendar") return [
      { type: "signal", message: `Mapped ${ctx.eventsToday} calendar event(s)`, ok: true },
      { type: "classify", message: `Matched ${ctx.tasks} open task(s) to free slots`, ok: true },
      { type: "notification", message: `Focus block reserved: 45 minutes after lunch`, ok: true },
    ];
    if (t === "campaign_pulse" || t === "campaign") return [
      { type: "signal", message: `Gathered ${ctx.activeCampaigns} active campaign(s)`, ok: true },
      { type: "aggregate", message: `Computed pulse score from spend and pacing`, ok: true },
      { type: "notification", message: `Campaign pulse ready — one laggard needs a budget check`, ok: true },
    ];
    if (t === "weekly_digest" || t === "digest") return [
      { type: "signal", message: `Collected weekly signals across modules`, ok: true },
      { type: "aggregate", message: `Compiled wins, risks, and action items`, ok: true },
      { type: "notification", message: `Weekly digest delivered to your inbox`, ok: true },
    ];
    return [
      { type: "signal", message: `Verified context for ${auto.name}`, ok: true },
      { type: "notification", message: `${auto.name} automation executed`, ok: true },
    ];
  }

  buildBriefingActions(ctx: any): string[] {
    const actions: string[] = [];
    if (ctx.inboxCount > 0) actions.push(`Triage ${ctx.inboxCount} unread email(s)`);
    if (ctx.eventsToday > 0) actions.push(`Prepare for ${ctx.eventsToday} meeting(s)`);
    if (ctx.inboxCount === 0 && ctx.tasks === 0) actions.push("Investigate a focus block");
    if (actions.length === 0) actions.push("Protect a 90-minute focus block");
    return actions.slice(0, 3);
  }

  intentActions(intent: string, ctx: any): any[] {
    switch (intent) {
      case "draft_email": return ["triage inbox", "draft priority reply"];
      case "summarize": return ["generate briefing", "summarize threads"];
      case "schedule": return ["open my calendar", "protect focus"];
      case "campaign": return ["run campaign pulse", "budget snapshot"];
      case "task": return ["create task", "list overdue"];
      default: return [];
    }
  }
}

export const aniService = new AniService();