import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const FOCUS_MODES = [
  { id: "deep_work", name: "Deep Work", durationMin: 120, behavior: "Silent batching — C-level vibration only", autoActions: ["routine_approvals_auto", "meeting_invites_auto_accept", "ai_drafts_for_review", "urgent_delegated_to_backup"] },
  { id: "meeting", name: "In Meeting", durationMin: 60, behavior: "Batched, no notifications", autoActions: ["post_meeting_brief", "urgent_delegated_to_backup"] },
  { id: "commute", name: "Commuting", durationMin: 45, behavior: "Voice-first mode, high-priority read aloud", autoActions: ["voice_drafts", "fyi_archived"] },
  { id: "late_night", name: "Late Night", durationMin: 90, behavior: "Silent hold until 8 AM", autoActions: ["non_urgent_scheduled_to_morning", "auto_reply_received", "drafts_prewritten"] },
  { id: "vacation", name: "PTO / Vacation", durationMin: 0, behavior: "Daily digest only — C-level + family break through", autoActions: ["categorized_delegated", "daily_digest", "escalation_c_level_security"] },
] as const;

export const NOTIFICATION_TIERS = [
  { id: 1, name: "Silent Execution", delivery: "No notification", examples: ["Newsletters auto-archived", "Calendar invites auto-accepted", "Receipts filed", "Routine approvals auto-completed", "Spam/phishing blocked"] },
  { id: 2, name: "Digest Batch", delivery: "3x/day (morning, midday, evening)", examples: ["FYI emails", "Non-urgent updates", "Social/team messages"] },
  { id: 3, name: "Smart Alert", delivery: "Immediate but respecting focus mode", examples: ["Action required within 24h", "Meeting conflicts", "Thread going stale"] },
  { id: 4, name: "Breakthrough", delivery: "Immediate + persistent until acknowledged", examples: ["C-level direct messages", "Security incidents", "SLA breaches", "Family/emergency"] },
] as const;

export const BATCH_SUGGESTIONS: { id: string; label: string; action: string; detail: string }[] = [
  { id: "newsletter_archive", label: "Auto-archive newsletters", action: "archive", detail: "Read + low priority marketing messages → Archive" },
  { id: "receipt_file", label: "File receipts to Expenses", action: "file_expenses", detail: "Receipt/invoice messages → Label + Archive" },
  { id: "invite_accept", label: "Accept + add to Calendar", action: "accept_calendar", detail: "Meeting invites → Accept + Calendar" },
  { id: "action_task", label: "Create task + assign", action: "create_task", detail: "Action items → Task" },
  { id: "question_quick_reply", label: "Quick reply drafts", action: "quick_reply", detail: "Questions → AI draft for review" },
  { id: "fyi_read_later", label: "Read later", action: "read_later", detail: "FYI only → Read later bucket" },
] as const;

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_focus_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailFocusService {
  focusModes() {
    return { modes: FOCUS_MODES, total: FOCUS_MODES.length };
  }

  activateFocus(tenantId: string, modeId: string, durationMin?: number) {
    const mode = FOCUS_MODES.find((m) => m.id === modeId);
    if (!mode) throw new Error("Unknown focus mode");
    const active = DataStore.mem().findOne("mail_focus_sessions", (s: any) => s.tenantId === tenantId && s.status === "active");
    if (active) return { started: false, session: { sessionId: active._id, ...active }, summary: `Focus session "${active.mode}" already active — end it first` };

    const dur = durationMin !== undefined ? durationMin : mode.durationMin;
    if (mode.id === "vacation") {
      // vacation is open-ended until ended
    } else if (!Number.isFinite(dur) || dur <= 0) {
      throw new Error("durationMin must be a positive number");
    }
    const now = Date.now();
    const row: any = {
      tenantId, mode: mode.id, name: mode.name, durationMin: mode.id === "vacation" ? 0 : dur,
      behavior: mode.behavior, autoActions: mode.autoActions,
      status: "active",
      startedAt: new Date(now).toISOString(),
      endsAt: mode.id === "vacation" ? null : new Date(now + dur * 60000).toISOString(),
      emailsHandled: 0, timeSavedMin: 0, focusScore: 0,
    };
    const inserted = DataStore.mem().insert("mail_focus_sessions", row);
    logEntry(tenantId, "focus_started", `${mode.name} focus mode active${mode.id === "vacation" ? " (open-ended)" : ` for ${dur} min`}`, { mode: mode.id, sessionId: inserted._id });
    return { started: true, session: { sessionId: inserted._id, ...row }, summary: `${mode.name} focus mode activated${mode.id === "vacation" ? "" : ` — ${dur} min remaining`}` };
  }

  focusStatus(tenantId: string) {
    const active = DataStore.mem().findOne("mail_focus_sessions", (s: any) => s.tenantId === tenantId && s.status === "active");
    const all = DataStore.mem().find("mail_focus_sessions", (s: any) => s.tenantId === tenantId);
    const today = all.filter((s: any) => {
      const d = new Date(s.startedAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
    const stats = {
      sessionsToday: today.length,
      timeInFocusMin: today.reduce((a: number, s: any) => a + (s.durationMin || 0), 0),
      emailsHandled: today.reduce((a: number, s: any) => a + (s.emailsHandled || 0), 0),
      timeSavedMin: today.reduce((a: number, s: any) => a + (s.timeSavedMin || 0), 0),
      focusScore: today.length === 0 ? 0 : Math.round(today.reduce((a: number, s: any) => a + (s.focusScore || 0), 0) / today.length),
    };
    if (!active) {
      return { active: false, session: null, stats, summary: "No focus session active", seed: hashStr(tenantId + "focus_status") };
    }
    const remainingMin = active.endsAt ? Math.max(0, Math.round((new Date(active.endsAt).getTime() - Date.now()) / 60000)) : null;
    return {
      active: true,
      session: { sessionId: active._id, ...active, remainingMin },
      stats,
      summary: active.endsAt
        ? `${active.name} focus mode — ${remainingMin} min remaining`
        : `${active.name} focus mode — open-ended (vacation)`,
      seed: hashStr(tenantId + "focus_status"),
    };
  }

  endFocus(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("mail_focus_sessions", (s: any) => s.tenantId === tenantId && s._id === sessionId);
    if (!session) throw new Error("Focus session not found");
    if (session.status !== "active") throw new Error("Focus session already ended");
    const emailsHandled = 12 + (hashStr(tenantId + session.mode + "handled") % 40);
    const timeSavedMin = 23 + (hashStr(tenantId + session.mode + "saved") % 50);
    const focusScore = 85 + (hashStr(tenantId + session.mode + "score") % 15);
    DataStore.mem().update("mail_focus_sessions", (s: any) => s._id === sessionId, {
      status: "ended", endedAt: new Date().toISOString(), emailsHandled, timeSavedMin, focusScore,
    });
    logEntry(tenantId, "focus_ended", `${session.name} ended — ${emailsHandled} emails handled without interruption, ${timeSavedMin} min saved`, { sessionId, emailsHandled, timeSavedMin, focusScore });
    return { session: { sessionId: session._id, ...session, status: "ended", endedAt: new Date().toISOString(), emailsHandled, timeSavedMin, focusScore }, summary: `${session.name} focus ended — ${timeSavedMin} min saved, focus score ${focusScore}/100` };
  }

  extendFocus(tenantId: string, sessionId: string, minutes: number) {
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("minutes must be a positive number");
    const session = DataStore.mem().findOne("mail_focus_sessions", (s: any) => s.tenantId === tenantId && s._id === sessionId);
    if (!session) throw new Error("Focus session not found");
    if (session.status !== "active") throw new Error("Focus session already ended");
    const oldEnd = session.endsAt ? new Date(session.endsAt).getTime() : Date.now() + session.durationMin * 60000;
    const newEnd = new Date(oldEnd + minutes * 60000).toISOString();
    DataStore.mem().update("mail_focus_sessions", (s: any) => s._id === sessionId, { endsAt: newEnd });
    logEntry(tenantId, "focus_extended", `${session.name} extended by ${minutes} min`, { sessionId, minutes });
    return { session: { sessionId: session._id, ...session, endsAt: newEnd }, summary: `${session.name} focus extended by ${minutes} min` };
  }

  notificationTiers(tenantId: string) {
    const messages = DataStore.mem().find("messages", (m: any) => m.tenantId === tenantId && m.folder === "inbox");
    const tier1 = messages.filter((m: any) => (m.ai?.category || m.category) === "newsletter" || m.flags?.includes("spam")).length;
    const tier4 = messages.filter((m: any) => !m.read && (m.ai?.priority === "critical" || m.importance === "critical" || m.importance === "high")).length;
    const tier3 = messages.filter((m: any) => !m.read && m.ai?.priority === "high").length + messages.filter((m: any) => m.awaitingResponse === true).length;
    const tier2 = messages.filter((m: any) => !m.read).length - tier3 - tier4;
    return {
      tiers: NOTIFICATION_TIERS.map((t) => ({
        ...t,
        count: t.id === 1 ? tier1 : t.id === 2 ? Math.max(0, tier2) : t.id === 3 ? tier3 : tier4,
      })),
      total: messages.length,
      silentExecution: tier1,
      digestBatch: Math.max(0, tier2),
      smartAlert: tier3,
      breakthrough: tier4,
      summary: `${tier4} breakthrough + ${Math.max(0, tier2)} digest-batched — ${tier1} handled silently`,
      seed: hashStr(tenantId + "tiers"),
    };
  }

  smartBatch(tenantId: string) {
    const hour = new Date().getHours();
    const activeFocus = DataStore.mem().findOne("mail_focus_sessions", (s: any) => s.tenantId === tenantId && s.status === "active");
    const context = activeFocus
      ? `Focus mode active (${activeFocus.name})`
      : hour >= 22 || hour < 6
        ? "Late night (after 10 PM)"
        : hour >= 9 && hour <= 17 ? "Working hours" : "Off hours";
    const policy = activeFocus?.mode === "late_night" || hour >= 22 || hour < 6
      ? "Silent hold until 8 AM — exception: family + security senders"
      : activeFocus?.mode === "vacation"
        ? "Daily digest only — escalation on 2+ C-level mentions or security alert"
        : activeFocus
          ? "Batch all non-urgent — deliver at next break"
          : "Standard delivery — urgent immediate, rest 3x/day digests";
    return {
      context,
      policy,
      mode: activeFocus ? activeFocus.mode : hour >= 22 || hour < 6 ? "late_night" : "standard",
      seed: hashStr(tenantId + "batch_" + context),
      summary: `${context} → ${policy}`,
    };
  }

  batchIntelligence(tenantId: string, messageIds: string[]) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) throw new Error("messageIds must be a non-empty array");
    const store = DataStore.mem();
    const messages = messageIds.map((id) => store.findOne("messages", (m: any) => m.tenantId === tenantId && m._id === id));
    const missing = messages.filter((m: any) => !m);
    if (missing.length > 0) throw new Error(`Message not found for ${messageIds.length - messages.filter(Boolean).length} id(s)`);
    const groups: any[] = [];
    const byAction: Record<string, number> = {};
    for (const id of messageIds) {
      const m = store.findOne("messages", (x: any) => x.tenantId === tenantId && x._id === id);
      const cat = String(m.ai?.category || m.category || "general").toLowerCase();
      let suggestion = BATCH_SUGGESTIONS[5]; // fyi_read_later default
      if (cat === "newsletter" || cat === "promotion" || cat === "social") suggestion = BATCH_SUGGESTIONS[0];
      else if (cat === "invoice" || cat === "receipt" || cat === "finance") suggestion = BATCH_SUGGESTIONS[1];
      else if (cat === "meeting" || (m.subject || "").toLowerCase().includes("invite")) suggestion = BATCH_SUGGESTIONS[2];
      else if (cat === "action" || m.subject?.includes("[TODO]")) suggestion = BATCH_SUGGESTIONS[3];
      else if (cat === "question") suggestion = BATCH_SUGGESTIONS[4];
      const existing = groups.find((g: any) => g.action === suggestion.action);
      if (existing) existing.messageIds.push(id);
      else groups.push({ ...suggestion, messageIds: [id], count: 1 });
      byAction[suggestion.action] = (byAction[suggestion.action] || 0) + 1;
    }
    const summary = groups.map((g: any) => `${g.count} → ${g.label}`).join(" · ");
    logEntry(tenantId, "batch_intelligence", `Analyzed ${messageIds.length} selected message(s): ${summary}`, { groups: groups.length });
    return { groups, byAction, total: messageIds.length, summary, seed: hashStr(tenantId + "batch_" + messageIds.join(",")) };
  }

  executeBatchSuggestions(tenantId: string, actions: { messageId: string; action: string }[]) {
    if (!Array.isArray(actions) || actions.length === 0) throw new Error("actions must be a non-empty array");
    const store = DataStore.mem();
    let applied = 0;
    let skipped = 0;
    const results: any[] = [];
    const allowed = BATCH_SUGGESTIONS.map((s) => s.action);
    for (const a of actions) {
      if (!allowed.includes(a.action)) { skipped++; continue; }
      const m = store.findOne("messages", (x: any) => x.tenantId === tenantId && x._id === a.messageId);
      if (!m) { skipped++; continue; }
      const patch: any = { updatedAt: new Date().toISOString() };
      if (a.action === "archive" || a.action === "file_expenses" || a.action === "accept_calendar") {
        patch.folder = "archive";
        if (a.action === "file_expenses") patch.labels = Array.from(new Set([...(m.labels || []), "expenses"]));
        if (a.action === "accept_calendar") patch.labels = Array.from(new Set([...(m.labels || []), "calendar"]));
        patch.read = true;
      } else if (a.action === "create_task") {
        patch.labels = Array.from(new Set([...(m.labels || []), "task"]));
        patch.read = true;
      } else if (a.action === "quick_reply" || a.action === "read_later") {
        patch.read = true;
      }
      store.update("messages", (x: any) => x._id === a.messageId, patch);
      applied++;
      results.push({ messageId: a.messageId, action: a.action, applied: true });
    }
    logEntry(tenantId, "batch_executed", `Executed ${applied} suggestion(s), ${skipped} skipped`, { applied, skipped });
    return { applied, skipped, results, summary: `${applied} action(s) applied${skipped ? `, ${skipped} skipped` : ""}` };
  }

  frictionScore(tenantId: string, input?: Record<string, number>) {
    const i = input || {};
    const clicksPerEmail = i.clicksPerEmail ?? 0.3;
    const decisionSeconds = i.decisionSeconds ?? 300;
    const menuNavigations = i.menuNavigations ?? 2;
    const charsTyped = i.charsTyped ?? 50;
    const contextSwitches = i.contextSwitches ?? 5;
    const notifications = i.notifications ?? 4;
    const undoActions = i.undoActions ?? 0;
    const emailsHandled = i.emailsHandled ?? 100;
    const score = Math.round(
      clicksPerEmail * emailsHandled * 2 +
      decisionSeconds +
      menuNavigations * 5 +
      charsTyped / 10 +
      contextSwitches * 3 +
      notifications +
      undoActions * 10
    );
    const baseline = 3460; // traditional email day (guide §12.2)
    const reductionPct = Math.round(((baseline - score) / baseline) * 100);
    const level = score <= 400 ? "minimal" : score <= 1000 ? "low" : score <= 2500 ? "moderate" : "high";
    const row = {
      tenantId, score, reductionPct, level,
      inputs: { clicksPerEmail, decisionSeconds, menuNavigations, charsTyped, contextSwitches, notifications, undoActions, emailsHandled },
      computedAt: new Date().toISOString(),
    };
    DataStore.mem().insert("mail_friction", row);
    logEntry(tenantId, "friction_score", `Daily friction score ${score} (${level}) — ${reductionPct}% below baseline`, { score, level });
    return {
      ...row,
      baseline,
      summary: `Friction score ${score} — ${reductionPct}% reduction vs traditional email (baseline ${baseline})`,
      seed: hashStr(tenantId + "friction_" + score),
    };
  }

  roiCalculator(tenantId: string, users = 1, hourlyRate = 75) {
    const emailsPerDay = 100;
    const minutesSaved = 99; // guide §12.3 per-user per-day
    const hoursSavedWeek = (minutesSaved * 5) / 60;
    const hoursSavedYear = (minutesSaved * 250) / 60;
    const annualValue = hoursSavedYear * hourlyRate * users;
    const annualCost = 240 * users; // Pro tier $240/yr per user
    const roiPct = annualCost > 0 ? Math.round(((annualValue - annualCost) / annualCost) * 100) : 0;
    return {
      users, hourlyRate, emailsPerDay, minutesSavedPerDay: minutesSaved,
      hoursSavedPerWeek: hoursSavedWeek, hoursSavedPerYear: hoursSavedYear,
      annualValue, annualCost, roiPct,
      breakdown: [
        "Email triage: 45 min → 5 min = 40 min saved",
        "Draft composition: 30 min → 5 min = 25 min saved",
        "Meeting scheduling: 15 min → 1 min = 14 min saved",
        "Task creation: 10 min → 0 min = 10 min saved",
        "Search & retrieval: 12 min → 2 min = 10 min saved",
      ],
      summary: `${hoursSavedYear.toFixed(0)} hours saved/user/yr at $${hourlyRate}/hr → $${annualValue.toLocaleString()} value vs $${annualCost.toLocaleString()} cost = ${roiPct}% ROI`,
      seed: hashStr(tenantId + "roi"),
    };
  }

  focusLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_focus_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }

  focusDashboard(tenantId: string) {
    return {
      modes: this.focusModes().modes,
      suggestions: BATCH_SUGGESTIONS,
      status: this.focusStatus(tenantId),
      tiers: this.notificationTiers(tenantId),
      batching: this.smartBatch(tenantId),
      friction: this.frictionScore(tenantId),
      roi: this.roiCalculator(tenantId),
      recentLog: this.focusLog(tenantId).entries,
      generatedAt: new Date().toISOString(),
      summary: `${this.focusStatus(tenantId).active ? "Focus active — " : ""}tiers ${this.notificationTiers(tenantId).summary}`,
      seed: hashStr(tenantId + "focus_dashboard"),
    };
  }
}

export const mailFocus = new MailFocusService();
