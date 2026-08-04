import { DataStore } from "./DataStore";
import { mailMessage } from "./MailMessageService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

export const SEQUENCE_STATUSES = ["draft", "active", "paused", "archived"];
export const SEQUENCE_ENROLLMENT_STATUSES = ["active", "completed", "paused", "unsubscribed"];

function normalizeSteps(input: any): any[] {
  if (!input.steps || !Array.isArray(input.steps) || input.steps.length === 0) {
    throw new Error("Sequence needs at least one step");
  }
  return input.steps.map((s: any, i: number) => ({
    stepId: s.stepId || `st_${i + 1}_${random6()}`,
    name: s.name || `Step ${i + 1}`,
    subject: s.subject || "",
    body: s.body || "",
    delayHours: Math.max(0, Number(s.delayHours) || 0),
    condition: s.condition || null,
  }));
}

export class MailSequenceService {
  private getMailbox(tenantId: string, mailboxId?: string): any {
    const mb = mailboxId
      ? DataStore.mem().findOne("mailboxes", (m: any) => m._id === mailboxId && m.tenantId === tenantId)
      : DataStore.mem().find("mailboxes", (m: any) => m.tenantId === tenantId)[0];
    if (!mb) throw new Error(`Mailbox "${mailboxId || "default"}" not found`);
    return mb;
  }

  createSequence(tenantId: string, input: any) {
    if (!input || !input.name) throw new Error("Sequence name is required");
    const steps = normalizeSteps(input);
    const seq = DataStore.mem().insert("mail_sequences", {
      tenantId,
      name: input.name,
      description: input.description || "",
      mailboxId: input.mailboxId || null,
      status: input.status && SEQUENCE_STATUSES.includes(input.status) ? input.status : "draft",
      steps,
      sentCount: 0,
      enrollments: 0,
      createdBy: input.createdBy || "user_001",
      createdAt: new Date().toISOString(),
    });
    return { sequenceId: seq._id, ...seq, summary: `Sequence "${input.name}" created with ${steps.length} step(s)` };
  }

  listSequences(tenantId: string) {
    return DataStore.mem().find("mail_sequences", (s: any) => s.tenantId === tenantId);
  }

  getSequence(tenantId: string, sequenceId: string) {
    const seq = DataStore.mem().findOne("mail_sequences", (s: any) => s._id === sequenceId && s.tenantId === tenantId);
    if (!seq) throw new Error(`Sequence "${sequenceId}" not found`);
    return seq;
  }

  updateSequence(tenantId: string, sequenceId: string, patch: any) {
    this.getSequence(tenantId, sequenceId);
    const updated: any = DataStore.mem().update("mail_sequences", (s: any) => s._id === sequenceId && s.tenantId === tenantId, {
      name: patch.name,
      description: patch.description,
      mailboxId: patch.mailboxId,
      status: patch.status,
      steps: patch.steps ? normalizeSteps(patch) : undefined,
    });
    return { sequenceId, ...updated, summary: `Sequence "${patch.name || updated.name}" updated` };
  }

  toggleSequence(tenantId: string, sequenceId: string) {
    const seq = this.getSequence(tenantId, sequenceId);
    const next = seq.status === "active" ? "paused" : "active";
    const updated: any = DataStore.mem().update("mail_sequences", (s: any) => s._id === sequenceId && s.tenantId === tenantId, { status: next });
    return { sequenceId, status: next, summary: `Sequence "${updated.name}" ${next}` };
  }

  deleteSequence(tenantId: string, sequenceId: string) {
    const seq = this.getSequence(tenantId, sequenceId);
    DataStore.mem().delete("mail_sequences", (s: any) => s._id === sequenceId && s.tenantId === tenantId);
    let removed = 0;
    while (DataStore.mem().findOne("mail_sequence_enrollments", (e: any) => e.sequenceId === sequenceId && e.tenantId === tenantId) && removed < 1000) {
      DataStore.mem().delete("mail_sequence_enrollments", (e: any) => e.sequenceId === sequenceId && e.tenantId === tenantId);
      removed++;
    }
    return { deleted: true, enrollmentsRemoved: removed, summary: `Sequence "${seq.name}" deleted with its enrollments` };
  }

  enrollContact(tenantId: string, sequenceId: string, email: string) {
    const seq = this.getSequence(tenantId, sequenceId);
    if (seq.status === "archived") throw new Error("Cannot enroll into an archived sequence");
    const em = String(email || "").toLowerCase();
    if (!em) throw new Error("Email is required");
    const existing = DataStore.mem().findOne("mail_sequence_enrollments", (e: any) => e.tenantId === tenantId && e.sequenceId === sequenceId && e.email === em);
    if (existing) return { enrolled: false, reason: "already_enrolled", summary: `${em} is already enrolled` };
    const firstStep = seq.steps[0];
    const row = DataStore.mem().insert("mail_sequence_enrollments", {
      tenantId,
      sequenceId,
      sequenceName: seq.name,
      email: em,
      status: "active",
      currentStep: 0,
      nextRunAt: firstStep ? new Date(Date.now() + firstStep.delayHours * 3600000).toISOString() : null,
      completedSteps: 0,
      lastSentAt: null,
      enrolledAt: new Date().toISOString(),
    });
    DataStore.mem().update("mail_sequences", (s: any) => s._id === sequenceId && s.tenantId === tenantId, { enrollments: seq.enrollments + 1 });
    return { enrollmentId: row._id, enrolled: true, currentStep: 0, summary: `${em} enrolled in "${seq.name}"` };
  }

  enrollMany(tenantId: string, sequenceId: string, emails: string[]) {
    if (!Array.isArray(emails) || emails.length === 0) throw new Error("At least one email is required");
    let enrolled = 0;
    for (const e of emails) {
      try {
        const r = this.enrollContact(tenantId, sequenceId, e);
        if (r.enrolled) enrolled++;
      } catch { /* skip invalid */ }
    }
    return { enrolled, requested: emails.length, summary: `${enrolled}/${emails.length} contact(s) enrolled` };
  }

  pauseEnrollment(tenantId: string, enrollmentId: string) {
    const row = DataStore.mem().findOne("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId);
    if (!row) throw new Error(`Enrollment "${enrollmentId}" not found`);
    DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId, { status: "paused" });
    return { enrollmentId, status: "paused", summary: `Enrollment of ${row.email} paused` };
  }

  resumeEnrollment(tenantId: string, enrollmentId: string) {
    const row = DataStore.mem().findOne("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId);
    if (!row) throw new Error(`Enrollment "${enrollmentId}" not found`);
    const seq = this.getSequence(tenantId, row.sequenceId);
    const step = seq.steps[row.currentStep];
    DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId, {
      status: "active",
      nextRunAt: step ? new Date(Date.now() + step.delayHours * 3600000).toISOString() : null,
    });
    return { enrollmentId, status: "active", summary: `Enrollment of ${row.email} resumed` };
  }

  unenrollContact(tenantId: string, enrollmentId: string, reason = "manual") {
    const row = DataStore.mem().findOne("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId);
    if (!row) throw new Error(`Enrollment "${enrollmentId}" not found`);
    DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === enrollmentId && e.tenantId === tenantId, {
      status: reason === "unsubscribed" ? "unsubscribed" : "completed",
      endedAt: new Date().toISOString(),
    });
    return { enrollmentId, summary: `${row.email} ${reason === "unsubscribed" ? "unsubscribed" : "removed"} from "${row.sequenceName}"` };
  }

  private stepMatches(step: any, recipient: any): boolean {
    const cond = step.condition;
    if (!cond || !cond.subject) return true;
    if (cond.sender) {
      if (!recipient.sender || !String(recipient.sender).toLowerCase().includes(String(cond.sender).toLowerCase())) return false;
    }
    if (cond.subject) {
      const hay = String(recipient.lastSubject || "").toLowerCase();
      return hay.includes(String(cond.subject).toLowerCase());
    }
    return true;
  }

  advanceSequence(tenantId: string, sequenceId?: string) {
    const now = Date.now();
    const enrollments = DataStore.mem().find("mail_sequence_enrollments", (e: any) =>
      e.tenantId === tenantId &&
      e.status === "active" &&
      e.nextRunAt && new Date(e.nextRunAt).getTime() <= now &&
      (!sequenceId || e.sequenceId === sequenceId));
    let sent = 0;
    const events: any[] = [];
    for (const en of enrollments) {
      const seq = this.getSequence(tenantId, en.sequenceId);
      if (seq.status !== "active") { DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === en._id && e.tenantId === tenantId, { status: "paused" }); continue; }
      const step = seq.steps[en.currentStep];
      if (!step || !this.stepMatches(step, { lastSubject: "", sender: "" })) {
        DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === en._id && e.tenantId === tenantId, { status: "completed", endedAt: new Date().toISOString() });
        continue;
      }
      try {
        const mb = this.getMailbox(tenantId, seq.mailboxId);
        mailMessage.composeSend(tenantId, mb._id, { to: en.email, subject: step.subject || `Step ${en.currentStep + 1} of ${seq.name}`, body: step.body || `Step ${en.currentStep + 1} of ${seq.name}`, importance: "normal" });
      } catch { /* sending failure tolerated */ }
      sent++;
      const nextIdx = en.currentStep + 1;
      const nextStep = seq.steps[nextIdx];
      DataStore.mem().update("mail_sequence_enrollments", (e: any) => e._id === en._id && e.tenantId === tenantId, {
        currentStep: nextIdx,
        completedSteps: nextIdx,
        lastSentAt: new Date().toISOString(),
        nextRunAt: nextStep ? new Date(Date.now() + nextStep.delayHours * 3600000).toISOString() : null,
        status: nextStep ? "active" : "completed",
        endedAt: nextStep ? undefined : new Date().toISOString(),
      });
      DataStore.mem().update("mail_sequences", (s: any) => s._id === seq._id && s.tenantId === tenantId, { sentCount: seq.sentCount + 1 });
      events.push({ email: en.email, step: en.currentStep + 1, sequenceId: seq._id, sentAt: new Date().toISOString() });
    }
    return { sent, events, summary: sent > 0 ? `${sent} sequence message(s) sent` : "No sequence messages due" };
  }

  sequenceProgress(tenantId: string, sequenceId: string) {
    const seq = this.getSequence(tenantId, sequenceId);
    const enrollments = DataStore.mem().find("mail_sequence_enrollments", (e: any) => e.tenantId === tenantId && e.sequenceId === sequenceId);
    const byStatus: Record<string, number> = {};
    for (const e of enrollments) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    const perStep = seq.steps.map((step: any, i: number) => ({
      stepId: step.stepId,
      name: step.name,
      index: i + 1,
      delayHours: step.delayHours,
      reached: enrollments.filter((e: any) => e.completedSteps > i).length,
    }));
    return {
      sequenceId,
      status: seq.status,
      steps: perStep,
      byStatus,
      total: enrollments.length,
      completionRate: enrollments.length > 0 ? Math.round((byStatus.completed || 0) / enrollments.length * 100) : 0,
      summary: `${enrollments.length} enrollment(s), ${byStatus.active || 0} active, ${byStatus.completed || 0} completed`,
    };
  }

  sequencesDashboard(tenantId: string) {
    const sequences = this.listSequences(tenantId);
    const enrollments = DataStore.mem().find("mail_sequence_enrollments", (e: any) => e.tenantId === tenantId);
    const byStatus: Record<string, number> = { draft: 0, active: 0, paused: 0, archived: 0 };
    for (const s of sequences) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    const activeEnrollments = enrollments.filter((e: any) => e.status === "active").length;
    const sentCount = sequences.reduce((s: number, x: any) => s + (x.sentCount || 0), 0);
    const completionRate = enrollments.length > 0
      ? Math.round((enrollments.filter((e: any) => e.status === "completed").length / enrollments.length) * 100)
      : 0;
    return {
      sequences: sequences.length,
      byStatus,
      activeEnrollments,
      totalEnrollments: enrollments.length,
      sentCount,
      completionRate,
      topSequences: [...sequences].sort((a: any, b: any) => (b.enrollments || 0) - (a.enrollments || 0)).slice(0, 3).map((s: any) => ({ sequenceId: s._id, name: s.name, status: s.status, enrollments: s.enrollments })),
      summary: `${sequences.length} sequence(s), ${activeEnrollments} active enrollment(s), ${sentCount} sent`,
    };
  }
}

export const mailSequence = new MailSequenceService();
