import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const AUTOMATION_TRIGGERS = [
  { id: "on_receive", label: "Message received", description: "Runs when a new message arrives" },
  { id: "on_send", label: "Message sent", description: "Runs when a message is sent" },
  { id: "on_star", label: "Message starred", description: "Runs when a message is starred" },
  { id: "on_label", label: "Message labelled", description: "Runs when a message receives a label" },
  { id: "on_snooze", label: "Message snoozed", description: "Runs when a message is snoozed" },
  { id: "manual", label: "Manual / scheduled", description: "Runs on demand or from the command center" },
];

export const AUTOMATION_ACTIONS = [
  { id: "label", label: "Add label", target: true },
  { id: "move", label: "Move to folder", target: true },
  { id: "archive", label: "Archive", target: false },
  { id: "mark_read", label: "Mark read", target: false },
  { id: "star", label: "Star", target: false },
  { id: "notify", label: "Raise notification", target: false },
  { id: "forward", label: "Forward to address", target: true },
  { id: "auto_reply", label: "Send auto-reply", target: false },
  { id: "create_task", label: "Create task", target: true },
  { id: "tag_thread", label: "Tag thread", target: true },
  { id: "set_priority", label: "Set priority", target: true },
  { id: "snooze", label: "Snooze until", target: true },
];

export const AUTOMATION_FIELDS = ["subject", "from", "body", "category", "importance", "label"];

function fieldText(field: string, msg: any): string {
  switch (field) {
    case "subject": return (msg.subject || "").toLowerCase();
    case "from": return `${(msg.from || {}).email || ""} ${(msg.from || {}).name || ""}`.toLowerCase();
    case "body": return (msg.body || "").toLowerCase();
    case "category": return ((msg.ai && msg.ai.category) || "").toLowerCase();
    case "importance": return (msg.importance || "normal").toLowerCase();
    case "label": return (msg.labels || []).join(" ").toLowerCase();
    default: return "";
  }
}

export function automationConditionHolds(cond: any, msg: any): boolean {
  const field = cond.field || "subject";
  const operator = cond.operator || "contains";
  const value = String(cond.value || "").toLowerCase();
  if (field === "has_attachment") {
    const has = (msg.attachments || []).length > 0;
    return operator === "is_not" ? !has : has;
  }
  const haystack = fieldText(field, msg);
  if (operator === "is") return haystack.trim() === value.trim();
  if (operator === "is_not") return haystack.trim() !== value.trim();
  if (operator === "starts_with") return haystack.startsWith(value);
  return haystack.includes(value);
}

function applyAutomationAction(action: any, msg: any, tenantId: string): string[] {
  const applied: string[] = [];
  switch (action.action) {
    case "label":
      if (action.target && !(msg.labels || []).includes(action.target)) {
        msg.labels = [...(msg.labels || []), action.target];
        applied.push(`label "${action.target}"`);
      }
      break;
    case "move":
      if (msg.folder !== action.target) { msg.folder = action.target || "inbox"; applied.push(`moved to ${msg.folder}`); }
      break;
    case "archive":
      if (msg.folder !== "archive") { msg.folder = "archive"; applied.push("archived"); }
      break;
    case "mark_read":
      if (!msg.read) { msg.read = true; applied.push("marked read"); }
      break;
    case "star":
      if (!msg.starred) { msg.starred = true; applied.push("starred"); }
      break;
    case "notify":
      applied.push("notification raised");
      break;
    case "forward":
      msg.flags = [...(msg.flags || []), `forwarded:${action.target || ""}`];
      applied.push(`forwarded to ${action.target || "recipient"}`);
      break;
    case "auto_reply":
      msg.flags = [...(msg.flags || []), "auto_replied"];
      applied.push("auto-reply sent");
      break;
    case "create_task":
      DataStore.mem().insert("mail_tasks", {
        tenantId,
        title: action.target || "Task from automation",
        status: "open",
        source: "automation",
        createdAt: new Date().toISOString(),
      });
      applied.push(`task "${action.target || "Task from automation"}" created`);
      break;
    case "tag_thread":
      msg.flags = [...(msg.flags || []), `thread_tag:${action.target || "follow-up"}`];
      applied.push(`thread tagged "${action.target || "follow-up"}"`);
      break;
    case "set_priority":
      msg.importance = action.target || "high";
      applied.push(`priority set to ${msg.importance}`);
      break;
    case "snooze":
      msg.snoozed = true;
      msg.snoozedUntil = action.target || new Date(Date.now() + 86400000).toISOString();
      applied.push(`snoozed until ${action.target || "tomorrow"}`);
      break;
  }
  return applied;
}

function normalizeSteps(input: any): any[] {
  if (!input.steps || !Array.isArray(input.steps) || input.steps.length === 0) {
    throw new Error("Automation needs at least one step");
  }
  return input.steps.map((s: any, i: number) => {
    const actions = s.actions || [];
    if (!Array.isArray(actions) || actions.length === 0) throw new Error(`Step ${i + 1} needs at least one action`);
    return {
      stepId: s.stepId || `st_${i + 1}_${random6()}`,
      name: s.name || `Step ${i + 1}`,
      delayHours: Math.max(0, Number(s.delayHours) || 0),
      condition: s.condition || null,
      actions,
    };
  });
}

export class MailAutomationService {
  createAutomation(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Automation name is required");
    const steps = normalizeSteps(input);
    const auto = DataStore.mem().insert("mail_automations", {
      tenantId,
      name: input.name,
      description: input.description || "",
      trigger: input.trigger || "on_receive",
      enabled: input.enabled !== false,
      steps,
      matchCount: 0,
      runCount: 0,
      createdBy: input.createdBy || "user_001",
      createdAt: new Date().toISOString(),
    });
    return { automationId: auto._id, ...auto, summary: `Automation "${input.name}" created with ${steps.length} step(s)` };
  }

  listAutomations(tenantId: string) {
    return DataStore.mem().find("mail_automations", (a: any) => a.tenantId === tenantId);
  }

  getAutomation(tenantId: string, automationId: string) {
    const auto = DataStore.mem().findOne("mail_automations", (a: any) => a._id === automationId && a.tenantId === tenantId);
    if (!auto) throw new Error(`Automation "${automationId}" not found`);
    return auto;
  }

  updateAutomation(tenantId: string, automationId: string, patch: any) {
    this.getAutomation(tenantId, automationId);
    const updated: any = DataStore.mem().update("mail_automations", (a: any) => a._id === automationId && a.tenantId === tenantId, {
      name: patch.name,
      description: patch.description,
      trigger: patch.trigger,
      steps: patch.steps ? normalizeSteps(patch) : undefined,
      enabled: patch.enabled,
    });
    return { automationId, ...updated, summary: `Automation "${patch.name || updated.name}" updated` };
  }

  toggleAutomation(tenantId: string, automationId: string) {
    const auto = this.getAutomation(tenantId, automationId);
    const updated: any = DataStore.mem().update("mail_automations", (a: any) => a._id === automationId && a.tenantId === tenantId, {
      enabled: !auto.enabled,
    });
    return { automationId, enabled: updated.enabled, summary: `Automation "${updated.name}" ${updated.enabled ? "enabled" : "paused"}` };
  }

  deleteAutomation(tenantId: string, automationId: string) {
    const auto = this.getAutomation(tenantId, automationId);
    DataStore.mem().delete("mail_automations", (a: any) => a._id === automationId && a.tenantId === tenantId);
    return { deleted: true, summary: `Automation "${auto.name}" deleted` };
  }

  private log(tenantId: string, entry: any) {
    DataStore.mem().insert("mail_automation_log", { tenantId, ...entry, at: new Date().toISOString() });
  }

  private runStep(tenantId: string, auto: any, step: any, msg: any): { applied: string[]; scheduled: boolean } {
    const applied: string[] = [];
    if (step.condition && !automationConditionHolds(step.condition, msg)) {
      return { applied: [], scheduled: false };
    }
    if (step.delayHours > 0) {
      const runAt = new Date(Date.now() + step.delayHours * 3600000).toISOString();
      DataStore.mem().insert("mail_automation_runs", {
        tenantId,
        automationId: auto._id,
        automationName: auto.name,
        stepId: step.stepId,
        stepName: step.name,
        messageId: msg._id,
        status: "scheduled",
        runAt,
        actions: step.actions,
      });
      return { applied: [], scheduled: true };
    }
    for (const action of step.actions) {
      applied.push(...applyAutomationAction(action, msg, tenantId));
    }
    DataStore.mem().update("messages", (m: any) => m._id === msg._id && m.tenantId === tenantId, msg);
    return { applied, scheduled: false };
  }

  runAutomation(tenantId: string, automationId: string, messageId: string) {
    const auto = this.getAutomation(tenantId, automationId);
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const results: any[] = [];
    let scheduled = 0;
    let executed = 0;
    const appliedAll: string[] = [];
    for (const step of auto.steps) {
      const r = this.runStep(tenantId, auto, step, msg);
      results.push({
        stepId: step.stepId,
        name: step.name,
        delayHours: step.delayHours,
        ran: r.applied.length > 0 || r.scheduled,
        actionsApplied: r.applied,
        scheduled: r.scheduled,
      });
      if (r.scheduled) scheduled++;
      else if (r.applied.length > 0) executed++;
      appliedAll.push(...r.applied);
    }
    const wasMatch = appliedAll.length > 0 || scheduled > 0;
    DataStore.mem().update("mail_automations", (a: any) => a._id === automationId && a.tenantId === tenantId, {
      matchCount: auto.matchCount + (wasMatch ? 1 : 0),
      runCount: auto.runCount + 1,
    });
    this.log(tenantId, {
      automationId,
      automationName: auto.name,
      messageId,
      stepResults: results,
      actionsApplied: appliedAll,
      scheduledSteps: scheduled,
      status: wasMatch ? "matched" : "no_match",
    });
    return {
      automationId,
      trigger: auto.trigger,
      messageId,
      stepResults: results,
      actionsApplied: appliedAll,
      scheduledSteps: scheduled,
      matched: wasMatch,
      summary: wasMatch
        ? `Automation "${auto.name}" matched — ${executed} step(s) executed${scheduled ? `, ${scheduled} scheduled` : ""}`
        : `Automation "${auto.name}" ran — no steps matched`,
    };
  }

  testAutomation(tenantId: string, automationId: string, sample: any) {
    const auto = this.getAutomation(tenantId, automationId);
    const msg = {
      subject: sample.subject || "",
      body: sample.body || "",
      from: sample.from || { email: "", name: "" },
      labels: sample.labels || [],
      folder: "inbox",
      importance: "normal",
      attachments: [],
      ai: {},
    };
    const stepResults = auto.steps.map((step: any) => {
      const wouldRun = !step.condition || automationConditionHolds(step.condition, msg);
      return {
        stepId: step.stepId,
        name: step.name,
        delayHours: step.delayHours,
        wouldRun,
        actionsToRun: wouldRun ? step.actions.map((a: any) => a.action) : [],
      };
    });
    const matched = stepResults.filter((s: any) => s.wouldRun).length;
    return { automationId, stepResults, matchedSteps: matched, summary: `${matched}/${auto.steps.length} step(s) would run` };
  }

  dueRuns(tenantId: string) {
    const now = Date.now();
    const runs = DataStore.mem().find("mail_automation_runs", (r: any) => r.tenantId === tenantId && r.status === "scheduled" && new Date(r.runAt).getTime() <= now);
    let executed = 0;
    for (const run of runs) {
      const msg = DataStore.mem().findOne("messages", (m: any) => m._id === run.messageId && m.tenantId === tenantId);
      const applied: string[] = [];
      if (msg) {
        for (const action of run.actions) applied.push(...applyAutomationAction(action, msg, tenantId));
        DataStore.mem().update("messages", (m: any) => m._id === msg._id && m.tenantId === tenantId, msg);
      }
      DataStore.mem().update("mail_automation_runs", (r: any) => r._id === run._id && r.tenantId === tenantId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        actionsApplied: applied,
      });
      this.log(tenantId, {
        automationId: run.automationId,
        automationName: run.automationName,
        messageId: run.messageId,
        stepId: run.stepId,
        actionsApplied: applied,
        status: "scheduled_step_executed",
      });
      executed++;
    }
    return { executed, summary: executed > 0 ? `${executed} scheduled step(s) executed` : "No scheduled steps due" };
  }

  automationDashboard(tenantId: string) {
    const automations = this.listAutomations(tenantId);
    const log = DataStore.mem().find("mail_automation_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    const scheduled = DataStore.mem().find("mail_automation_runs", (r: any) => r.tenantId === tenantId && r.status === "scheduled");
    const byTrigger: Record<string, number> = {};
    for (const a of automations) byTrigger[a.trigger] = (byTrigger[a.trigger] || 0) + 1;
    return {
      total: automations.length,
      enabled: automations.filter((a: any) => a.enabled).length,
      totalRuns: automations.reduce((s: number, a: any) => s + (a.runCount || 0), 0),
      totalMatches: automations.reduce((s: number, a: any) => s + (a.matchCount || 0), 0),
      scheduledPending: scheduled.length,
      byTrigger,
      recentLog: log.slice(0, 6).map((l: any) => ({ ...l, logId: l._id })),
      summary: `${automations.length} automation(s), ${automations.filter((a: any) => a.enabled).length} enabled`,
    };
  }

  automationLog(tenantId: string, limit = 25) {
    const log = DataStore.mem().find("mail_automation_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    return { entries: log.slice(0, limit).map((l: any) => ({ logId: l._id, ...l })), count: log.length };
  }

  automationTriggers() {
    return AUTOMATION_TRIGGERS;
  }

  automationActionCatalog() {
    return AUTOMATION_ACTIONS;
  }
}

export const mailAutomation = new MailAutomationService();
