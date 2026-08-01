import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const RULE_TEMPLATES = [
  { templateId: "newsletters", name: "Tame newsletters", description: "Auto-label and archive newsletters", conditions: [{ field: "category", operator: "is", value: "newsletter" }], actions: [{ action: "label", target: "Newsletter" }, { action: "archive", target: "" }] },
  { templateId: "invoices", name: "Invoice tracker", description: "Label invoices and forward to accounts", conditions: [{ field: "subject", operator: "contains", value: "invoice" }], actions: [{ action: "label", target: "Invoices" }, { action: "forward", target: "accounts@company.com" }] },
  { templateId: "high_priority", name: "Escalate VIP mail", description: "Star and notify on high-importance mail", conditions: [{ field: "importance", operator: "is", value: "high" }], actions: [{ action: "star", target: "" }, { action: "notify", target: "" }] },
  { templateId: "social", name: "Quiet socials", description: "Move social notifications out of inbox", conditions: [{ field: "category", operator: "is", value: "social" }], actions: [{ action: "move", target: "Social" }] },
  { templateId: "vendor", name: "Vendor labels", description: "Label mail from vendors", conditions: [{ field: "from", operator: "contains", value: "@design.co" }], actions: [{ action: "label", target: "Vendors" }] },
  { templateId: "meeting_reminders", name: "Meeting prep", description: "Star and notify on meeting invites", conditions: [{ field: "subject", operator: "contains", value: "meeting" }], actions: [{ action: "star", target: "" }, { action: "notify", target: "" }] },
];

function fieldText(field: string, msg: any): string {
  switch (field) {
    case "subject": return (msg.subject || "").toLowerCase();
    case "from": return `${(msg.from || {}).email || ""} ${(msg.from || {}).name || ""}`.toLowerCase();
    case "body": return (msg.body || "").toLowerCase();
    case "to": return (msg.to || []).map((r: any) => `${r.email} ${r.name}`).join(" ").toLowerCase();
    case "label": return (msg.labels || []).join(" ").toLowerCase();
    case "category": return ((msg.ai && msg.ai.category) || "").toLowerCase();
    case "importance": return (msg.importance || "normal").toLowerCase();
    default: return "";
  }
}

function evaluateCondition(cond: any, msg: any): boolean {
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

function applyAction(action: any, msg: any, tenantId: string) {
  const applied: string[] = [];
  switch (action.action) {
    case "label":
      if (action.target && !(msg.labels || []).includes(action.target)) {
        msg.labels = [...(msg.labels || []), action.target];
        applied.push(`label "${action.target}"`);
      }
      break;
    case "archive":
      if (msg.folder !== "archive") { msg.folder = "archive"; applied.push("archived"); }
      break;
    case "move":
      if (msg.folder !== action.target) { msg.folder = action.target || "inbox"; applied.push(`moved to ${msg.folder}`); }
      break;
    case "mark_read":
      if (!msg.read) { msg.read = true; applied.push("marked read"); }
      break;
    case "star":
      if (!msg.starred) { msg.starred = true; applied.push("starred"); }
      break;
    case "forward":
      msg.flags = [...(msg.flags || []), `forwarded:${action.target || ""}`];
      applied.push(`forwarded to ${action.target || "recipient"}`);
      break;
    case "auto_reply":
      msg.flags = [...(msg.flags || []), "auto_replied"];
      applied.push("auto-reply sent");
      break;
    case "notify":
      applied.push("notification raised");
      break;
  }
  return applied;
}

export class MailRulesService {
  createRule(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Rule name is required");
    const isScript = input.kind === "script";
    if (isScript) {
      if (!input.script || !String(input.script).trim()) throw new Error("Script rule needs a script body");
    } else {
      if (!input.conditions || !Array.isArray(input.conditions) || input.conditions.length === 0) throw new Error("Rule needs at least one condition");
      if (!input.actions || !Array.isArray(input.actions) || input.actions.length === 0) throw new Error("Rule needs at least one action");
    }
    const rule = DataStore.mem().insert("mail_rules", {
      tenantId,
      name: input.name,
      kind: isScript ? "script" : "visual",
      templateId: input.templateId || null,
      conditions: input.conditions || [],
      actions: input.actions || [],
      script: input.script || "",
      trigger: input.trigger || "on_receive",
      enabled: input.enabled !== false,
      matchCount: 0,
      createdBy: input.createdBy || "user_001",
    });
    return { ruleId: rule._id, ...rule, summary: `Rule "${input.name}" created${rule.enabled ? " and enabled" : ""}` };
  }

  listRules(tenantId: string) {
    return DataStore.mem().find("mail_rules", (r: any) => r.tenantId === tenantId);
  }

  getRule(tenantId: string, ruleId: string) {
    const rule = DataStore.mem().findOne("mail_rules", (r: any) => r._id === ruleId && r.tenantId === tenantId);
    if (!rule) throw new Error(`Rule "${ruleId}" not found`);
    return rule;
  }

  updateRule(tenantId: string, ruleId: string, patch: any) {
    this.getRule(tenantId, ruleId);
    const updated = DataStore.mem().update("mail_rules", (r: any) => r._id === ruleId && r.tenantId === tenantId, {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.conditions !== undefined ? { conditions: patch.conditions } : {}),
      ...(patch.actions !== undefined ? { actions: patch.actions } : {}),
      ...(patch.script !== undefined ? { script: patch.script } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    });
    return { ruleId: updated._id, ...updated, summary: `Rule "${updated.name}" updated` };
  }

  toggleRule(tenantId: string, ruleId: string, enabled?: boolean) {
    const rule = this.getRule(tenantId, ruleId);
    const next = enabled !== undefined ? enabled : !rule.enabled;
    const updated = DataStore.mem().update("mail_rules", (r: any) => r._id === ruleId && r.tenantId === tenantId, { enabled: next });
    return { ruleId: updated._id, name: updated.name, enabled: next, summary: `Rule "${updated.name}" ${next ? "enabled" : "paused"}` };
  }

  deleteRule(tenantId: string, ruleId: string) {
    this.getRule(tenantId, ruleId);
    DataStore.mem().delete("mail_rules", (r: any) => r._id === ruleId && r.tenantId === tenantId);
    return { ruleId, summary: "Rule deleted" };
  }

  ruleTemplates() {
    return RULE_TEMPLATES;
  }

  instantiateTemplate(tenantId: string, templateId: string) {
    const tpl = RULE_TEMPLATES.find(t => t.templateId === templateId);
    if (!tpl) throw new Error(`Unknown rule template "${templateId}"`);
    return this.createRule(tenantId, { name: tpl.name, templateId: tpl.templateId, conditions: tpl.conditions, actions: tpl.actions });
  }

  matchesRule(rule: any, msg: any): { matched: boolean; failed: string[] } {
    const failed: string[] = [];
    for (const cond of rule.conditions || []) {
      if (!evaluateCondition(cond, msg)) failed.push(cond.field || "subject");
    }
    return { matched: failed.length === 0, failed };
  }

  evaluateRule(tenantId: string, ruleId: string, messageId: string) {
    const rule = this.getRule(tenantId, ruleId);
    if (!rule.enabled) return { ruleId, matched: false, applied: [], summary: `Rule "${rule.name}" is paused` };
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const { matched } = this.matchesRule(rule, msg);
    let applied: string[] = [];
    if (matched) {
      applied = (rule.actions || []).flatMap((action: any) => applyAction(action, msg, tenantId));
      DataStore.mem().update("messages", (m: any) => m._id === msg._id, { folder: msg.folder, labels: msg.labels, read: msg.read, starred: msg.starred, flags: msg.flags });
      DataStore.mem().update("mail_rules", (r: any) => r._id === rule._id, { matchCount: (rule.matchCount || 0) + 1, lastRunAt: new Date().toISOString() });
      this.log(tenantId, rule, msg, applied);
    }
    return { ruleId: rule._id, ruleName: rule.name, matched, applied, summary: matched ? `Rule "${rule.name}" matched — ${applied.length} action(s) applied` : `Rule "${rule.name}" did not match` };
  }

  evaluateAllRules(tenantId: string, messageId: string) {
    const rules = DataStore.mem().find("mail_rules", (r: any) => r.tenantId === tenantId && r.enabled && r.kind === "visual");
    const results = rules.map(rule => this.evaluateRule(tenantId, rule._id, messageId));
    const matched = results.filter(r => r.matched);
    return { messageId, rulesChecked: results.length, matchedRules: matched.length, results, summary: `${matched.length} of ${results.length} rules matched` };
  }

  testRule(tenantId: string, ruleId: string, sample: any) {
    const rule = this.getRule(tenantId, ruleId);
    if (!sample) throw new Error("Sample message is required");
    const { matched, failed } = this.matchesRule(rule, sample);
    return { ruleId: rule._id, ruleName: rule.name, wouldMatch: matched, failedConditions: failed, actionsToRun: matched ? (rule.actions || []).map((a: any) => a.action) : [], summary: matched ? "Rule would match — actions would apply" : "Rule would NOT match" };
  }

  runScriptRule(tenantId: string, ruleId: string, messageId: string) {
    const rule = this.getRule(tenantId, ruleId);
    if (rule.kind !== "script") throw new Error(`Rule "${rule.name}" is not a script rule`);
    if (!rule.enabled) return { ruleId, matched: false, applied: [], summary: `Rule "${rule.name}" is paused` };
    const msg = DataStore.mem().findOne("messages", (m: any) => m._id === messageId && m.tenantId === tenantId);
    if (!msg) throw new Error(`Message "${messageId}" not found`);
    const applied: string[] = [];
    let matchedLines = 0;
    const lines = (rule.script || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^if\s+(subject|from|body|to|label|category|importance|has_attachment)(?:\s+(contains|is|is_not)\s+"([^"]*)")?\s+then\s+(label|archive|move|mark_read|forward|star|notify|auto_reply)\s*(?:"([^"]*)")?$/i);
      if (!m) continue;
      const [, field, operator, value, action, target] = m;
      const cond = { field, operator: operator || "is", value: value || (field === "has_attachment" ? "true" : "") };
      if (evaluateCondition(cond, msg)) {
        matchedLines++;
        const result = applyAction({ action, target }, msg, tenantId);
        applied.push(...result);
      }
    }
    if (applied.length > 0) {
      DataStore.mem().update("messages", (m: any) => m._id === msg._id, { folder: msg.folder, labels: msg.labels, read: msg.read, starred: msg.starred, flags: msg.flags });
      DataStore.mem().update("mail_rules", (r: any) => r._id === rule._id, { matchCount: (rule.matchCount || 0) + 1, lastRunAt: new Date().toISOString() });
      this.log(tenantId, rule, msg, applied);
    }
    return { ruleId: rule._id, ruleName: rule.name, kind: "script", matchedLines, applied, summary: `${matchedLines} line(s) matched — ${applied.length} action(s) applied` };
  }

  runAllScriptRules(tenantId: string, messageId: string) {
    const rules = DataStore.mem().find("mail_rules", (r: any) => r.tenantId === tenantId && r.enabled && r.kind === "script");
    const results = rules.map(rule => this.runScriptRule(tenantId, rule._id, messageId));
    const matched = results.filter(r => r.applied.length > 0);
    return { messageId, rulesChecked: results.length, matchedRules: matched.length, summary: `${matched.length} script rule(s) acted on this message` };
  }

  rulesDashboard(tenantId: string) {
    const rules = this.listRules(tenantId);
    const enabled = rules.filter(r => r.enabled);
    const totalMatches = rules.reduce((s, r) => s + (r.matchCount || 0), 0);
    const log = DataStore.mem().find("mail_rules_log", (l: any) => l.tenantId === tenantId).slice(-5).reverse();
    return {
      rules,
      totals: { total: rules.length, enabled: enabled.length, paused: rules.length - enabled.length, matches: totalMatches },
      recentActivity: log,
      summary: `${enabled.length} of ${rules.length} rules active — ${totalMatches} messages matched`,
      seed: hashStr(tenantId + "rules_seed"),
    };
  }

  private log(tenantId: string, rule: any, msg: any, actions: string[]) {
    DataStore.mem().insert("mail_rules_log", {
      tenantId,
      ruleId: rule._id,
      ruleName: rule.name,
      kind: rule.kind,
      messageId: msg._id,
      subject: msg.subject,
      actions,
      executedAt: new Date().toISOString(),
    });
  }

  aiGenerateRule(tenantId: string, naturalLanguage: string, opts: any = {}) {
    if (!naturalLanguage || !String(naturalLanguage).trim()) throw new Error("Describe the rule in natural language first");
    const text = String(naturalLanguage).trim();
    const lower = text.toLowerCase();

    const conditions: any[] = [];
    const actions: any[] = [];

    const fromMatch = lower.match(/from\s+([\w.+-]+@[\w.-]+|@[\w.-]+)/);
    if (fromMatch) conditions.push({ field: "from", operator: "contains", value: fromMatch[1] });
    const quoted = text.match(/"([^"]+)"/);
    if (quoted) conditions.push({ field: "subject", operator: "contains", value: quoted[1] });
    const categoryMatch = lower.match(/(newsletter|invoice|social|promotion|updates?|receipt|meeting)/);
    if (categoryMatch) conditions.push({ field: "category", operator: "is", value: categoryMatch[1].replace(/s$/, "") });
    if (/attachment/i.test(lower)) conditions.push({ field: "has_attachment", operator: "is", value: "true" });
    if (/high importance|important|urgent/i.test(lower)) conditions.push({ field: "importance", operator: "is", value: "high" });
    if (conditions.length === 0) {
      const keyword = text.split(/\s+/).find(w => w.length > 4) || text.slice(0, 12);
      conditions.push({ field: "subject", operator: "contains", value: keyword });
    }

    const forwardMatch = lower.match(/forward\s+to\s+([\w.+-]+@[\w.-]+)/);
    if (/archive/i.test(lower)) actions.push({ action: "archive", target: "" });
    if (/mark\s*(them|it)?\s*(as)?\s*read|marked read/i.test(lower)) actions.push({ action: "mark_read", target: "" });
    const moveMatch = lower.match(/move\s+(?:them\s+)?to\s+([a-z_ ]+)/i);
    if (moveMatch && !/inbox/i.test(moveMatch[1])) actions.push({ action: "move", target: moveMatch[1].trim() });
    const labelMatch = lower.match(/label\s+(?:them\s+)?(?:as\s+|with\s+)?([a-z0-9 _-]+)/i);
    if (labelMatch) actions.push({ action: "label", target: labelMatch[1].trim() });
    if (forwardMatch) actions.push({ action: "forward", target: forwardMatch[1] });
    if (/star/i.test(lower)) actions.push({ action: "star", target: "" });
    if (/notify/i.test(lower)) actions.push({ action: "notify", target: "" });
    if (/delete|trash/i.test(lower)) actions.push({ action: "move", target: "trash" });
    if (actions.length === 0) actions.push({ action: "label", target: "AI" });

    const rule = this.createRule(tenantId, {
      name: opts.name || `AI rule: ${text.slice(0, 48)}`,
      conditions,
      actions,
      enabled: opts.testBeforeEnable ? false : true,
      createdBy: "n0va1o",
    });

    const test: { tested: boolean; scanned: number; wouldMatch: number | null; samples: { subject: string; from: string; category: string }[]; summary: string } = opts.testBeforeEnable
      ? this.aiTestRule(tenantId, rule._id, rule)
      : { tested: false, wouldMatch: null, scanned: 0, samples: [], summary: "Rule created and enabled — dry run skipped" };

    return {
      ruleId: rule._id,
      name: rule.name,
      naturalLanguage: text,
      conditions,
      actions,
      enabled: rule.enabled,
      test,
      summary: `Rule generated from "${text.slice(0, 60)}" — ${conditions.length} condition(s), ${actions.length} action(s)${test && test.tested ? `; dry run matched ${test.wouldMatch} of ${test.scanned} messages` : ""}`,
    };
  }

  private aiTestRule(tenantId: string, ruleId: string, rule: any) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId).slice(0, 20);
    const matches = messages.filter(m => this.matchesRule(rule, m).matched);
    const samples = matches.slice(0, 3).map(m => ({ subject: m.subject, from: (m.from || {}).email, category: (m.ai || {}).category }));
    return {
      tested: true,
      scanned: messages.length,
      wouldMatch: matches.length,
      samples,
      summary: `Dry run over ${messages.length} recent messages — ${matches.length} would match`,
    };
  }
}

export const mailRules = new MailRulesService();
