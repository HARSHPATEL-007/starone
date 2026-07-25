import crypto from "crypto";
import { io } from "../index";
import { webhookService } from "./WebhookService";
import { DataStore } from "./DataStore";

export interface ScheduledAction {
  id: string;
  tenantId: string;
  campaignId: string;
  type: "launch" | "pause" | "archive" | "budget_change" | "status_change";
  executeAt: Date;
  executed: boolean;
  params?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface RecurringSchedule {
  id: string;
  tenantId: string;
  campaignId: string;
  type: ScheduledAction["type"];
  cronExpression: string;
  timezone: string;
  startDate?: string;
  endDate?: string;
  params?: Record<string, unknown>;
  createdBy: string;
  enabled: boolean;
  lastFired?: string;
  nextFire?: string;
  createdAt: string;
}

interface CronField {
  min: number;
  max: number;
  values: Set<number>;
}

export interface ActionDependency {
  id: string;
  actionId: string;
  dependsOn: string[]; // action IDs that must complete first
  condition?: string; // optional expression (e.g. "status == 'active'")
}

export class SchedulerService {
  private actions: ScheduledAction[] = [];
  private recurring: RecurringSchedule[] = [];
  private dependencies: ActionDependency[] = [];
  private completedActionIds: Set<string> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private updateCallbacks: Array<(action: ScheduledAction) => void> = [];

  onUpdate(cb: (action: ScheduledAction) => void) {
    this.updateCallbacks.push(cb);
  }

  // ─── Action Dependency Chaining (DAG) ───────────────────────────────

  addDependency(dep: Omit<ActionDependency, "id">): ActionDependency {
    const full: ActionDependency = { ...dep, id: `dep_${crypto.randomBytes(6).toString("hex")}` };
    // Validate: no circular dependency (DFS from dependsOn back to actionId)
    if (this.detectCycle(full.actionId, full.dependsOn)) {
      throw new Error(`Circular dependency detected for action ${full.actionId}`);
    }
    this.dependencies.push(full);
    return full;
  }

  removeDependency(id: string): boolean {
    const idx = this.dependencies.findIndex((d) => d.id === id);
    if (idx < 0) return false;
    this.dependencies.splice(idx, 1);
    return true;
  }

  listDependencies(actionId?: string): ActionDependency[] {
    if (actionId) return this.dependencies.filter((d) => d.actionId === actionId);
    return this.dependencies;
  }

  /**
   * Get the topological execution order for a set of actions.
   * Uses Kahn's algorithm. Only returns executably-ready actions
   * (all deps completed + conditions met).
   */
  getReadyActions(tenantId?: string, campaignId?: string): ScheduledAction[] {
    const pending = this.actions.filter(
      (a) => !a.executed && (!tenantId || a.tenantId === tenantId) && (!campaignId || a.campaignId === campaignId)
    );
    return pending.filter((a) => {
      const deps = this.dependencies.filter((d) => d.actionId === a.id);
      if (deps.length === 0) return true; // no deps = always ready
      return deps.every((dep) => dep.dependsOn.every((depId) => this.completedActionIds.has(depId)));
    });
  }

  /**
   * Get the critical path (longest chain) for a given action.
   */
  getCriticalPath(actionId: string): { path: string[]; totalActions: number; estimatedMinutes: number } {
    const deps = this.dependencies.filter((d) => d.actionId === actionId);
    if (deps.length === 0) return { path: [actionId], totalActions: 1, estimatedMinutes: 0 };

    const visited = new Set<string>();
    const longest: string[] = [];

    const dfs = (currentId: string, path: string[]) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      const currentDeps = this.dependencies.filter((d) => d.actionId === currentId);
      if (currentDeps.length === 0) {
        if (path.length > longest.length) longest.push(...path);
      } else {
        for (const dep of currentDeps) {
          for (const depId of dep.dependsOn) {
            dfs(depId, [...path, depId]);
          }
        }
      }
    };

    dfs(actionId, [actionId]);
    return { path: longest, totalActions: longest.length, estimatedMinutes: longest.length * 30 };
  }

  private detectCycle(actionId: string, dependsOn: string[]): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const graph = new Map<string, string[]>();

    for (const dep of this.dependencies) {
      if (!graph.has(dep.actionId)) graph.set(dep.actionId, []);
      graph.get(dep.actionId)!.push(...dep.dependsOn);
    }
    graph.set(actionId, dependsOn);

    const dfs = (node: string): boolean => {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      stack.add(node);
      for (const neighbor of graph.get(node) || []) {
        if (dfs(neighbor)) return true;
      }
      stack.delete(node);
      return false;
    };

    return dfs(actionId);
  }

  markCompleted(actionId: string): void {
    this.completedActionIds.add(actionId);
  }

  resetExecutionState(): void {
    this.completedActionIds.clear();
  }

  private notifyUpdate(action: ScheduledAction) {
    for (const cb of this.updateCallbacks) {
      try { cb(action); } catch {}
    }
  }

  // ─── One-shot scheduling (existing) ──────────────────────────────────

  schedule(action: Omit<ScheduledAction, "id" | "createdAt" | "executed">): ScheduledAction {
    const newAction: ScheduledAction = {
      ...action, id: `sched_${crypto.randomBytes(8).toString("hex")}`, createdAt: new Date(), executed: false,
    };
    this.actions.push(newAction);
    this.notifyUpdate(newAction);
    return newAction;
  }

  cancel(id: string): boolean {
    const idx = this.actions.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.actions.splice(idx, 1);
    const recIdx = this.recurring.findIndex((r) => r.id === id);
    if (recIdx >= 0) this.recurring.splice(recIdx, 1);
    return true;
  }

  list(tenantId?: string): ScheduledAction[] {
    let filtered = this.actions;
    if (tenantId) filtered = filtered.filter((a) => a.tenantId === tenantId);
    return filtered.sort((a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime());
  }

  get(id: string): ScheduledAction | undefined {
    return this.actions.find((a) => a.id === id);
  }

  // ─── Recurring / Cron Scheduling ────────────────────────────────────

  createRecurring(schedule: Omit<RecurringSchedule, "id" | "createdAt" | "enabled" | "nextFire">): RecurringSchedule {
    // Validate cron expression
    this.parseCron(schedule.cronExpression);

    const parsed = this.parseCron(schedule.cronExpression);
    const now = new Date();
    const nextFire = this.nextCronFire(parsed, now, schedule.timezone);

    const rec: RecurringSchedule = {
      ...schedule,
      id: `rec_${crypto.randomBytes(8).toString("hex")}`,
      enabled: true,
      nextFire: nextFire?.toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.recurring.push(rec);
    return rec;
  }

  updateRecurring(id: string, data: Partial<RecurringSchedule>): RecurringSchedule | null {
    const idx = this.recurring.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const existing = this.recurring[idx];
    const updated = { ...existing, ...data, nextFire: existing.nextFire };
    if (data.cronExpression && data.cronExpression !== existing.cronExpression) {
      this.parseCron(data.cronExpression); // validate
      const parsed = this.parseCron(data.cronExpression);
      const next = this.nextCronFire(parsed, new Date(), updated.timezone);
      updated.nextFire = next?.toISOString();
    }
    this.recurring[idx] = updated;
    return updated;
  }

  listRecurring(tenantId?: string): RecurringSchedule[] {
    let result = this.recurring;
    if (tenantId) result = result.filter((r) => r.tenantId === tenantId);
    return result.sort((a, b) => {
      if (!a.nextFire && !b.nextFire) return 0;
      if (!a.nextFire) return 1;
      if (!b.nextFire) return -1;
      return new Date(a.nextFire).getTime() - new Date(b.nextFire).getTime();
    });
  }

  toggleRecurring(id: string): RecurringSchedule | null {
    const idx = this.recurring.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    this.recurring[idx].enabled = !this.recurring[idx].enabled;
    if (this.recurring[idx].enabled) {
      const parsed = this.parseCron(this.recurring[idx].cronExpression);
      const next = this.nextCronFire(parsed, new Date(), this.recurring[idx].timezone);
      this.recurring[idx].nextFire = next?.toISOString();
    }
    return this.recurring[idx];
  }

  // ─── Conflict Detection ─────────────────────────────────────────────

  detectConflicts(tenantId: string, campaignId: string, executeAt: Date): {
    hasConflict: boolean;
    conflicts: { actionId: string; type: string; executeAt: string }[];
  } {
    const windowStart = new Date(executeAt.getTime() - 3600000);
    const windowEnd = new Date(executeAt.getTime() + 3600000);
    const conflicts = this.actions
      .filter((a) => a.tenantId === tenantId && a.campaignId === campaignId && !a.executed)
      .filter((a) => {
        const t = new Date(a.executeAt).getTime();
        return t >= windowStart.getTime() && t <= windowEnd.getTime();
      })
      .map((a) => ({ actionId: a.id, type: a.type, executeAt: a.executeAt.toISOString() }));

    const recConflicts = this.recurring
      .filter((r) => r.tenantId === tenantId && r.campaignId === campaignId && r.enabled && r.nextFire)
      .filter((r) => {
        const t = new Date(r.nextFire!).getTime();
        return t >= windowStart.getTime() && t <= windowEnd.getTime();
      })
      .map((r) => ({ actionId: r.id, type: r.type, executeAt: r.nextFire! }));

    return { hasConflict: conflicts.length > 0 || recConflicts.length > 0, conflicts: [...conflicts, ...recConflicts] };
  }

  // ─── Cron Expression Parser ─────────────────────────────────────────

  private parseCron(expr: string): CronField[] {
    const fields = expr.trim().split(/\s+/);
    if (fields.length !== 5) throw new Error(`Invalid cron expression: expected 5 fields, got ${fields.length}`);

    const specs: { min: number; max: number; name: string }[] = [
      { min: 0, max: 59, name: "minute" },
      { min: 0, max: 23, name: "hour" },
      { min: 1, max: 31, name: "day-of-month" },
      { min: 1, max: 12, name: "month" },
      { min: 0, max: 6, name: "day-of-week" },
    ];

    return fields.map((field, i) => this.parseCronField(field, specs[i].min, specs[i].max, specs[i].name));
  }

  private parseCronField(field: string, min: number, max: number, name: string): CronField {
    const values = new Set<number>();

    if (field === "*") {
      for (let v = min; v <= max; v++) values.add(v);
      return { min, max, values };
    }

    const parts = field.split(",");
    for (const part of parts) {
      if (part.includes("/")) {
        const [range, stepStr] = part.split("/");
        const step = parseInt(stepStr, 10);
        if (isNaN(step) || step < 1) throw new Error(`Invalid step in cron field "${name}": ${part}`);
        let rangeStart = min, rangeEnd = max;
        if (range !== "*") {
          const rangeParts = range.split("-");
          rangeStart = parseInt(rangeParts[0], 10);
          rangeEnd = rangeParts.length > 1 ? parseInt(rangeParts[1], 10) : rangeStart;
        }
        for (let v = rangeStart; v <= rangeEnd; v += step) {
          if (v >= min && v <= max) values.add(v);
        }
      } else if (part.includes("-")) {
        const [lo, hi] = part.split("-").map((s) => parseInt(s, 10));
        for (let v = lo; v <= hi; v++) {
          if (v >= min && v <= max) values.add(v);
        }
      } else {
        const v = parseInt(part, 10);
        if (isNaN(v) || v < min || v > max) throw new Error(`Invalid value in cron field "${name}": ${part}`);
        values.add(v);
      }
    }

    return { min, max, values };
  }

  private matchesCron(cron: CronField[], date: Date): boolean {
    const m = date.getMinutes(), h = date.getHours(), d = date.getDate(), M = date.getMonth() + 1, w = date.getDay();
    return cron[0].values.has(m) && cron[1].values.has(h) && cron[2].values.has(d) && cron[3].values.has(M) && cron[4].values.has(w);
  }

  private nextCronFire(cron: CronField[], from: Date, timezone?: string): Date | null {
    let candidate = new Date(from);
    candidate.setSeconds(0, 0);
    for (let i = 0; i < 525600; i++) {
      if (this.matchesCron(cron, candidate)) return candidate;
      candidate = new Date(candidate.getTime() + 60000);
    }
    return null;
  }

  // ─── Timezone helpers ───────────────────────────────────────────────

  private timezoneOffset(timezone: string, date: Date): number {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour12: false });
      const parts = formatter.formatToParts(date);
      const tzOffset = -date.getTimezoneOffset();
      // Estimate DST offset via string roundtrip
      return tzOffset;
    } catch { return -date.getTimezoneOffset(); }
  }

  // ─── Scheduler Loop ─────────────────────────────────────────────────

  start(intervalMs = 30000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), intervalMs);
    console.log(`[Scheduler] Started (interval: ${intervalMs}ms)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick() {
    const now = new Date();
    await this.processOneShot(now);
    await this.processRecurring(now);
  }

  private async processOneShot(now: Date) {
    const due = this.actions.filter((a) => !a.executed && new Date(a.executeAt).getTime() <= now.getTime());
    for (const action of due) {
      try {
        await this.executeAction(action);
        action.executed = true;
      } catch (err) {
        console.error(`[Scheduler] Failed to execute ${action.id}:`, err);
      }
    }
  }

  private async processRecurring(now: Date) {
    for (const rec of this.recurring) {
      if (!rec.enabled) continue;
      if (!rec.nextFire) continue;
      if (new Date(rec.nextFire).getTime() > now.getTime()) continue;

      if (rec.endDate && new Date(rec.endDate).getTime() < now.getTime()) {
        rec.enabled = false;
        continue;
      }

      try {
        const action: ScheduledAction = {
          id: `rec_exec_${rec.id}_${Date.now()}`,
          tenantId: rec.tenantId,
          campaignId: rec.campaignId,
          type: rec.type,
          executeAt: now,
          executed: false,
          params: rec.params,
          createdBy: rec.createdBy,
          createdAt: new Date(),
        };
        await this.executeAction(action);

        const parsed = this.parseCron(rec.cronExpression);
        const next = this.nextCronFire(parsed, now, rec.timezone);
        rec.lastFired = now.toISOString();
        rec.nextFire = next?.toISOString() ?? undefined;
      } catch (err) {
        console.error(`[Scheduler] Failed recurring ${rec.id}:`, err);
      }
    }
  }

  private async executeAction(action: ScheduledAction) {
    const { campaignId, tenantId, type, params } = action;
    switch (type) {
      case "launch":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "active" }); break;
      case "pause":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "paused" }); break;
      case "archive":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "archived" }); break;
      case "budget_change":
        if (params) {
          const update: any = {};
          if (params.daily !== undefined) update["budget.daily"] = params.daily;
          if (params.lifetime !== undefined) { update["budget.lifetime"] = params.lifetime; update["budget.remaining"] = params.lifetime; }
          await DataStore.updateCampaign(campaignId, tenantId, update);
        }
        break;
      case "status_change":
        if (params?.status) await DataStore.updateCampaign(campaignId, tenantId, { status: params.status });
        break;
    }
    const eventType = `campaign.${type}`;
    await webhookService.emit({ type: eventType, tenantId, source: "scheduler", payload: { scheduledActionId: action.id, campaignId: action.campaignId, actionType: type, params, executedAt: new Date().toISOString() } });
    io.to(`campaign:${campaignId}`).emit(`campaign:${campaignId}:update`, { scheduledAction: action.id, actionType: type, executed: true, timestamp: new Date().toISOString() });
  }
}

export const schedulerService = new SchedulerService();
