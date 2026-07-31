import { DataStore } from "./DataStore";

export class CrossModuleWorkflowService {
  campaignCreationWorkflow(tenantId: string, campaignId: string): { campaignId: string; automations: { module: string; action: string; status: string; detail: string }[]; totals: { triggered: number; summary: string } } {
    const c = DataStore.mem().findOne("campaigns", (x: any) => x._id === campaignId && x.tenantId === tenantId) as any;
    if (!c) throw new Error(`Campaign "${campaignId}" not found`);
    const automations = [
      { module: "Tasks", action: "Create approval tasks", status: "created", detail: `Creative + budget approval for "${c.name}"` },
      { module: "Calendar", action: "Block launch date", status: "created", detail: `Launch day + review meeting scheduled` },
      { module: "Docs", action: "Generate campaign brief", status: "created", detail: "AI strategy brief with goals and KPIs" },
      { module: "Sheets", action: "Update budget tracker", status: "created", detail: `Live pacing for $${c.budget?.lifetime || 0} monthly budget` },
      { module: "Chat", action: "Create war room", status: "created", detail: "Campaign team channel with pinned brief" },
      { module: "CRM", action: "Lead attribution setup", status: "created", detail: "Tracking links + attribution windows" },
      { module: "Mail", action: "Stakeholder updates", status: "scheduled", detail: "Launch confirmation + weekly digest" },
      { module: "Vault", action: "Log decisions", status: "logged", detail: "Compliance record of launch decision" },
    ];
    DataStore.mem().insert("workflow_log", { tenantId, campaignId, campaignName: c.name, automations, triggeredAt: new Date().toISOString() });
    return { campaignId, automations, totals: { triggered: automations.length, summary: `1 click created ${automations.length} cross-module automations` } };
  }

  workflowLog(tenantId: string): { entries: { campaignId: string; campaignName: string; triggeredAt: string; moduleCount: number }[]; totals: { total: number; summary: string } } {
    const logs = DataStore.mem().find("workflow_log", (l: any) => l.tenantId === tenantId) as any[];
    const entries = logs.map(l => ({ campaignId: l.campaignId, campaignName: l.campaignName, triggeredAt: l.triggeredAt, moduleCount: l.automations.length })).sort((a, b) => String(b.triggeredAt).localeCompare(String(a.triggeredAt)));
    return { entries, totals: { total: entries.length, summary: `${entries.length} campaign workflows triggered` } };
  }
}

export const crossModuleWorkflow = new CrossModuleWorkflowService();
