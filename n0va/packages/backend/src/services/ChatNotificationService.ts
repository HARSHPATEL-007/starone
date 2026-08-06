import { chatRealtime } from "./ChatRealtimeService";
import { DataStore } from "./DataStore";
import { chatPresence } from "./ChatPresenceService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const RULE_CONDITIONS = [
  { name: "Focus Time Protection", condition: "user.focus_mode == true AND message.priority < 'high'", action: "batch_digest", delay: "30min", override: "@mentions OR thread_owner OR direct_message" },
  { name: "Urgent Escalation", condition: "message.priority == 'critical' AND user.away > '5min'", action: "escalate", channels: ["sms", "phone_call"], max_escalations: 3 },
  { name: "AI Digest", condition: "message_count > 50 AND time == '17:00'", action: "ai_summary_digest", include: "action_items, decisions, mentions" },
];

export class ChatNotificationService {
  private get(tenantId: string, ruleId: string): any {
    const r = DataStore.mem().findOne("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId);
    if (!r) throw new Error(`Notification rule "${ruleId}" not found`);
    return r;
  }

  priorityScore(message: any, user: any = {}) {
    let score = 0;
    const body = String(message.content?.body || "");
    if (message.sender?.user_id && user.userId && body.includes(`@${user.userId}`)) score += 50;
    if (message.roomType === "dm" || message.roomType === "group_dm") score += 40;
    if (message.threadId) score += 30;
    const keywords = user.keywords || [];
    for (const k of keywords) if (body.toLowerCase().includes(k.toLowerCase())) { score += 20; break; }
    if (message.ai_analysis?.urgency) score += Math.round(message.ai_analysis.urgency * 60);
    if (message.ai_analysis?.sentiment < -0.4) score += 10;
    if (user.focusMode) score -= 30;
    return Math.max(0, score);
  }

  evaluatePriority(message: any, user: any): string {
    const score = this.priorityScore(message, user);
    if (score >= 80) return "critical";
    if (score >= 50) return "high";
    if (score >= 20) return "normal";
    return "low";
  }

  listRules(tenantId: string) {
    this.ensureSeed(tenantId);
    const rows = DataStore.mem().find("chat_notification_rules", (x: any) => x.tenantId === tenantId);
    return { rules: rows, templates: RULE_CONDITIONS, total: rows.length, summary: `${rows.length} notification rule(s)` };
  }

  ensureSeed(tenantId: string) {
    for (const tpl of RULE_CONDITIONS) {
      const ruleId = `nrule_${hashStr(tenantId + tpl.name)}`;
      if (!DataStore.mem().findOne("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId)) {
        DataStore.mem().insert("chat_notification_rules", {
          tenantId,
          ruleId,
          name: tpl.name,
          condition: tpl.condition,
          action: tpl.action,
          delay: tpl.delay,
          override: tpl.override,
          channels: tpl.channels || ["web"],
          max_escalations: tpl.max_escalations || 1,
          enabled: true,
          from_template: true,
          created_at: new Date().toISOString(),
        });
      }
    }
    return { seeded: RULE_CONDITIONS.length };
  }

  createRule(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Rule name is required");
    const ruleId = `nrule_${hashStr(tenantId + input.name + (input.condition || ""))}`;
    if (DataStore.mem().findOne("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId)) throw new Error(`Rule "${input.name}" already exists`);
    const rule = DataStore.mem().insert("chat_notification_rules", {
      tenantId,
      ruleId,
      name: input.name,
      condition: input.condition || "",
      action: input.action || "notify",
      delay: input.delay || "0m",
      override: input.override,
      channels: input.channels || ["web"],
      max_escalations: input.max_escalations,
      enabled: input.enabled !== false,
      created_at: new Date().toISOString(),
    });
    return { rule, summary: `Rule "${input.name}" created` };
  }

  updateRule(tenantId: string, ruleId: string, patch: any) {
    this.get(tenantId, ruleId);
    const updates: Record<string, any> = {};
    for (const k of ["name", "condition", "action", "delay", "override", "channels", "max_escalations", "enabled"]) {
      if (patch && patch[k] !== undefined) updates[k] = patch[k];
    }
    const updated = DataStore.mem().update("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId, updates);
    return { rule: updated, summary: `Rule "${updated.name}" updated` };
  }

  toggleRule(tenantId: string, ruleId: string, enabled: boolean) {
    const rule = this.get(tenantId, ruleId);
    const updated = DataStore.mem().update("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId, { enabled });
    return { rule: updated, summary: `Rule "${rule.name}" ${enabled ? "enabled" : "disabled"}` };
  }

  deleteRule(tenantId: string, ruleId: string) {
    const ok = DataStore.mem().delete("chat_notification_rules", (x: any) => x.ruleId === ruleId && x.tenantId === tenantId);
    if (!ok) throw new Error(`Notification rule "${ruleId}" not found`);
    return { ruleId, summary: "Rule deleted" };
  }

  evaluateRule(tenantId: string, ruleId: string, message: any) {
    const rule = this.get(tenantId, ruleId);
    const body = String(message?.content?.body || message?.body || "");
    const score = this.priorityScore({ ...message, content: message?.content || { body } }, { userId: message?.userId || "user_001" });
    const matched = rule.enabled && score > 0;
    if (matched) {
      chatRealtime.emit("notification", tenantId, {
        type: "rule_match",
        priority: this.evaluatePriority({ ...message, content: message?.content || { body } }, { userId: "user_001" }),
        title: rule.name,
        body: body.slice(0, 120),
      });
    }
    return { ruleId: rule.ruleId, matched, score, summary: matched ? `Rule "${rule.name}" matched (score ${score})` : `Rule "${rule.name}" did not match` };
  }

  evaluateAll(tenantId: string, message: any) {
    const rules = DataStore.mem().find("chat_notification_rules", (x: any) => x.tenantId === tenantId && x.enabled);
    const results = rules.map((r) => this.evaluateRule(tenantId, r.ruleId, message));
    const matched = results.filter((r) => r.matched).length;
    return { results, matched, total: rules.length, summary: `${matched}/${rules.length} rule(s) matched` };
  }

  sendDigest(tenantId: string, userId: string, opts: any = {}) {
    const messages = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts.limit || 20);
    const unread = messages.filter((m) => !m.read);
    const body = messages.slice(0, 5).map((m) => `${m.sender.display_name}: ${String(m.content.body).slice(0, 80)}`).join("\n");
    const digest = {
      digestId: `dig_${hashStr(tenantId + userId + Date.now())}`,
      userId,
      messageCount: messages.length,
      unread,
      preview: body,
      generatedAt: new Date().toISOString(),
      summary: `Digest: ${messages.length} message(s), ${unread.length} unread`,
    };
    DataStore.mem().insert("chat_digests", { tenantId, userId, digest });
    return digest;
  }

  notificationSettings(tenantId: string, userId: string) {
    const p = chatPresence.ensure(tenantId, userId);
    return {
      settings: {
        mute: p.notification_preferences?.mute ?? false,
        notify_on_mention: p.notification_preferences?.notify_on_mention ?? true,
        digest_frequency: p.notification_preferences?.digest_frequency || "immediate",
      },
      summary: "Notification preferences",
    };
  }

  updateSettings(tenantId: string, userId: string, patch: any) {
    chatPresence.ensure(tenantId, userId);
    const pref = { mute: patch.mute, notify_on_mention: patch.notify_on_mention, digest_frequency: patch.digest_frequency };
    return { settings: pref, summary: "Notification preferences updated" };
  }

  priorityInbox(tenantId: string, userId: string, opts: any = {}) {
    const messages = DataStore.mem().find("chat_messages", (m: any) => m.tenantId === tenantId && !m.read)
      .map((m) => {
        const room = DataStore.mem().findOne("chat_rooms", (r: any) => r.roomId === m.roomId);
        const priority = this.priorityScore(m, { userId, keywords: opts.keywords });
        return { ...m, room_name: room?.display_name || room?.name || m.roomId, priority };
      })
      .sort((a, b) => b.priority - a.priority);
    return { messages: messages.slice(0, opts.limit || 25), total: messages.length, summary: `${messages.length} prioritized unread message(s)` };
  }
}

export const chatNotification = new ChatNotificationService();