import { DataStore } from "./DataStore";
import { chatMessage } from "./ChatMessageService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const SLASH_COMMANDS = [
  { command: "/remind", description: "Set a reminder", example: "/remind @john to review PR in 2 hours" },
  { command: "/poll", description: "Create a poll", example: "/poll \"Lunch preference?\" Pizza Sushi Salad" },
  { command: "/weather", description: "Weather lookup", example: "/weather San Francisco" },
  { command: "/translate", description: "Translate a message", example: "/translate to:es" },
  { command: "/task", description: "Create a task", example: "/task \"Fix login bug\" assign:@john due:tomorrow" },
  { command: "/schedule", description: "Schedule a meeting", example: "/schedule with:@team duration:30min" },
  { command: "/status", description: "Set status", example: "/status \"In deep focus\" until:17:00" },
  { command: "/zoom", description: "Start a huddle", example: "/zoom topic:\"Sprint Planning\"" },
  { command: "/search", description: "Cross-module search", example: "/search \"Q3 budget\" in:docs,mail,chat" },
  { command: "/summarize", description: "AI thread summary", example: "/summarize last:50" },
];

const TRIGGER_TYPES = ["slash_command", "webhook", "scheduled", "ai_trigger"];

const DEFAULT_BOTS = [
  { name: "Project Manager Bot", avatar: "pm-bot.png", scopes: ["chat:read", "chat:write", "files:read", "tasks:write"], persona: "project_management" },
  { name: "Ops Guardian", avatar: "ops-guardian.png", scopes: ["chat:read", "chat:write", "incident:write"], persona: "incident_response" },
  { name: "N0VA ANI", avatar: "ani.png", scopes: ["chat:read", "chat:write", "ai:*"], persona: "personal_assistant" },
];

export class ChatBotService {
  slashCommands() {
    return { commands: SLASH_COMMANDS, total: SLASH_COMMANDS.length, summary: `${SLASH_COMMANDS.length} slash commands available` };
  }

  private get(tenantId: string, botId: string): any {
    const b = DataStore.mem().findOne("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId);
    if (!b) throw new Error(`Bot "${botId}" not found`);
    return b;
  }

  ensureSeed(tenantId: string) {
    for (const def of DEFAULT_BOTS) {
      const botId = `bot_${hashStr(tenantId + def.name)}`;
      if (!DataStore.mem().findOne("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId)) {
        DataStore.mem().insert("chat_bots", {
          tenantId,
          botId,
          name: def.name,
          avatar: def.avatar,
          permissions: { scopes: def.scopes, rooms: [], rate_limit: "100req/min" },
          triggers: [],
          ai_persona: { model: "n0va-llm-v3", temperature: 0.7, system_prompt: `You are ${def.name}.`, knowledge_base: [] },
          is_seed: true,
          enabled: true,
          created_at: new Date().toISOString(),
        });
      }
    }
    return { seeded: DEFAULT_BOTS.length };
  }

  listBots(tenantId: string) {
    this.ensureSeed(tenantId);
    const rows = DataStore.mem().find("chat_bots", (x: any) => x.tenantId === tenantId);
    return { bots: rows, total: rows.length, summary: `${rows.length} bot(s)` };
  }

  getBot(tenantId: string, botId: string) {
    return this.get(tenantId, botId);
  }

  createBot(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Bot name is required");
    const botId = `bot_${hashStr(tenantId + input.name + (input.version || "1"))}`;
    if (DataStore.mem().findOne("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId)) throw new Error(`Bot "${input.name}" already exists`);
    const bot = DataStore.mem().insert("chat_bots", {
      tenantId,
      botId,
      name: input.name,
      avatar: input.avatar || "default.png",
      permissions: { scopes: input.scopes || ["chat:read", "chat:write"], rooms: input.rooms || [], rate_limit: input.rateLimit || "100req/min" },
      triggers: input.triggers || [],
      ai_persona: input.ai_persona || { model: "n0va-llm-v3", temperature: 0.7, system_prompt: `You are ${input.name}.`, knowledge_base: [] },
      enabled: true,
      created_at: new Date().toISOString(),
    });
    return { bot, summary: `Bot "${input.name}" registered` };
  }

  updateBot(tenantId: string, botId: string, patch: any) {
    const bot = this.get(tenantId, botId);
    const updates: any = {};
    for (const k of ["name", "avatar", "permissions", "triggers", "ai_persona", "ai_prompt", "enabled"]) {
      if (patch && patch[k] !== undefined) updates[k] = patch[k];
    }
    if (patch && patch.addTrigger) {
      const t = patch.addTrigger;
      if (!TRIGGER_TYPES.includes(t.type)) throw new Error(`Unknown trigger type "${t.type}"`);
      updates.triggers = [...(bot.triggers || []), { ...t, trigger_id: `trg_${hashStr(botId + t.type + Date.now())}` }];
    }
    const updated = DataStore.mem().update("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId, updates);
    return { bot: updated, summary: `Updated bot "${updated.name}"` };
  }

  toggleBot(tenantId: string, botId: string, enabled: boolean) {
    this.get(tenantId, botId);
    const updated = DataStore.mem().update("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId, { enabled });
    return { bot: updated, summary: `Bot "${updated.name}" ${enabled ? "enabled" : "disabled"}` };
  }

  deleteBot(tenantId: string, botId: string) {
    const bot = this.get(tenantId, botId);
    if (bot.is_seed) throw new Error("Seed bots cannot be deleted");
    DataStore.mem().delete("chat_bots", (x: any) => x.botId === botId && x.tenantId === tenantId);
    return { botId, summary: `Bot "${bot.name}" deleted` };
  }

  dispatchCommand(tenantId: string, roomId: string, userId: string, raw: string) {
    const text = String(raw || "").trim();
    if (!text.startsWith("/")) throw new Error("Not a slash command");
    const [cmd, ...rest] = text.split(/\s+/);
    switch (cmd) {
      case "/remind": {
        const target = rest.find((r) => r.startsWith("@"));
        return { command: cmd, handled: true, payload: { target: target || null, text: rest.join(" ") }, summary: "Reminder queued" };
      }
      case "/poll": {
        const accepted = [...rest];
        const question = accepted.length > 1 ? accepted[0].replace(/[""""]/g, "") : "Untitled poll";
        const options = accepted.slice(1).map((o) => o.replace(/[",]/g, ""));
        const results = options.map((o) => ({ option: o, votes: 0 }));
        return { command: cmd, handled: true, poll: { question, options: results }, summary: `Poll created with ${results.length} option(s)` };
      }
      case "/task": {
        const assignee = rest.find((r) => r.startsWith("assign:"))?.split(":")[1] || null;
        const due = rest.find((r) => r.startsWith("due:"))?.split(":")[1] || null;
        const title = rest.filter((r) => !r.startsWith("assign:") && !r.startsWith("due:")).join(" ").replace(/[""""]/g, "");
        return { command: cmd, handled: true, task: { title, assignee, due }, summary: title ? `Task created: ${title}` : "Task command parsed" };
      }
      case "/translate": {
        const to = rest.find((r) => r.startsWith("to:"))?.split(":")[1] || "en";
        return { command: cmd, handled: true, translate: { to }, summary: `Translation to ${to} queued` };
      }
      case "/status": {
        return { command: cmd, handled: true, status: rest.join(" "), summary: "Status update queued" };
      }
      case "/zoom": {
        return { command: cmd, handled: true, huddle: { topic: rest.join(" ") }, summary: "Huddle request created" };
      }
      case "/weather": {
        return { command: cmd, handled: true, location: rest.join(" ") || null, summary: "Weather lookup queued" };
      }
      case "/summarize": {
        const last = rest.find((r) => r.startsWith("last:"))?.split(":")[1];
        const count = last ? parseInt(last, 10) : 50;
        return { command: cmd, handled: true, summarize: { count }, summary: `Summarizing last ${count} messages...` };
      }
      case "/search": {
        const inMods = rest.find((r) => r.startsWith("in:"))?.split(":")[1];
        return { command: cmd, handled: true, search: { query: rest.join(" "), modules: inMods ? inMods.split(",") : ["chat"] }, summary: "Cross-module search queued" };
      }
      case "/help":
        return { command: cmd, handled: true, commands: SLASH_COMMANDS, summary: `${SLASH_COMMANDS.length} slash commands available` };
      default:
        throw new Error(`Unknown slash command "${cmd}"`);
    }
  }

  runTrigger(tenantId: string, botId: string, trigger: any) {
    const bot = this.get(tenantId, botId);
    if (!TRIGGER_TYPES.includes(trigger.type)) throw new Error(`Unknown trigger type "${trigger.type}"`);
    const runId = `run${hashStr(tenantId + botId + Date.now())}`;
    const record = { runId, botId, trigger: trigger.type, status: "executed", executed_at: new Date().toISOString() };
    DataStore.mem().insert("chat_bot_runs", { tenantId, botId, run: record });
    return { record, summary: `Trigger "${trigger.type}" executed for ${bot.name}` };
  }

  botDashboard(tenantId: string) {
    this.ensureSeed(tenantId);
    const bots = DataStore.mem().find("chat_bots", (x: any) => x.tenantId === tenantId);
    const runs = DataStore.mem().find("chat_bot_runs", (x: any) => x.tenantId === tenantId);
    return {
      bots: bots.map((b) => ({ botId: b.botId, name: b.name, enabled: b.enabled, trigger_count: (b.triggers || []).length, scopes: b.permissions.scopes })),
      total: bots.length,
      enabled: bots.filter((b) => b.enabled).length,
      runs: runs.length,
      recentRuns: runs.slice(-10).map((r) => r.run),
      summary: `${bots.filter((b) => b.enabled).length}/${bots.length} bots active · ${runs.length} trigger run(s)`,
    };
  }
}

export const chatBot = new ChatBotService();