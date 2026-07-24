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

export class SchedulerService {
  private actions: ScheduledAction[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private updateCallbacks: Array<(action: ScheduledAction) => void> = [];

  onUpdate(cb: (action: ScheduledAction) => void) {
    this.updateCallbacks.push(cb);
  }

  private notifyUpdate(action: ScheduledAction) {
    for (const cb of this.updateCallbacks) {
      try { cb(action); } catch {}
    }
  }

  schedule(action: Omit<ScheduledAction, "id" | "createdAt" | "executed">): ScheduledAction {
    const newAction: ScheduledAction = {
      ...action,
      id: `sched_${crypto.randomBytes(8).toString("hex")}`,
      createdAt: new Date(),
      executed: false,
    };
    this.actions.push(newAction);
    this.notifyUpdate(newAction);
    return newAction;
  }

  cancel(id: string): boolean {
    const idx = this.actions.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.actions.splice(idx, 1);
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
    const due = this.actions.filter(
      (a) => !a.executed && new Date(a.executeAt).getTime() <= now.getTime()
    );

    for (const action of due) {
      try {
        await this.executeAction(action);
        action.executed = true;
        console.log(`[Scheduler] Executed ${action.type} for campaign ${action.campaignId}`);
      } catch (err) {
        console.error(`[Scheduler] Failed to execute ${action.id}:`, err);
      }
    }
  }

  private async executeAction(action: ScheduledAction) {
    const { campaignId, tenantId, type, params } = action;

    switch (type) {
      case "launch":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "active" });
        break;
      case "pause":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "paused" });
        break;
      case "archive":
        await DataStore.updateCampaign(campaignId, tenantId, { status: "archived" });
        break;
      case "budget_change":
        if (params) {
          const update: any = {};
          if (params.daily !== undefined) update["budget.daily"] = params.daily;
          if (params.lifetime !== undefined) {
            update["budget.lifetime"] = params.lifetime;
            update["budget.remaining"] = params.lifetime;
          }
          await DataStore.updateCampaign(campaignId, tenantId, update);
        }
        break;
      case "status_change":
        if (params?.status) {
          await DataStore.updateCampaign(campaignId, tenantId, { status: params.status });
        }
        break;
    }

    const eventType = `campaign.${type}`;
    await webhookService.emit({
      type: eventType,
      tenantId,
      source: "scheduler",
      payload: {
        scheduledActionId: action.id,
        campaignId: action.campaignId,
        actionType: type,
        params,
        executedAt: new Date().toISOString(),
      },
    });

    io.to(`campaign:${campaignId}`).emit(`campaign:${campaignId}:update`, {
      scheduledAction: action.id,
      actionType: type,
      executed: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export const schedulerService = new SchedulerService();
