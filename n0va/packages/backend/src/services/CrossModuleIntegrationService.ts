import { MemoryStore } from "./MemoryStore";

export interface CrossModuleLink {
  sourceAction: string;
  sourceModule: string;
  sourceEntity: string;
  targetModule: string;
  targetEntityType: string;
  targetData: Record<string, unknown>;
  description: string;
}

export interface CrossModuleActionLog {
  actionId: string;
  tenantId: string;
  sourceAction: string;
  sourceModule: string;
  sourceEntity: string;
  affectedModules: string[];
  timestamp: string;
}

const INTEGRATION_MATRIX: CrossModuleLink[] = [
  { sourceAction: "campaign_created", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "tasks", targetEntityType: "task", targetData: { title: "Creative approval needed", priority: "high" }, description: "Auto-generates Tasks for creative approval" },
  { sourceAction: "campaign_created", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "calendar", targetEntityType: "event", targetData: { title: "Campaign launch deadline", type: "deadline" }, description: "Calendar events for launch deadlines" },
  { sourceAction: "campaign_created", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "docs", targetEntityType: "doc", targetData: { title: "Campaign strategy brief" }, description: "Docs brief with AI-suggested strategy" },
  { sourceAction: "budget_allocated", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "sheets", targetEntityType: "sheet", targetData: { title: "Budget tracker update" }, description: "Updates Sheets budget tracker in real-time" },
  { sourceAction: "budget_allocated", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "finance", targetEntityType: "expense_approval", targetData: { action: "trigger_approval" }, description: "Triggers Finance module expense approval workflow" },
  { sourceAction: "creative_uploaded", sourceModule: "ads_marketing", sourceEntity: "creative", targetModule: "pics", targetEntityType: "image", targetData: { action: "auto_resize" }, description: "Auto-resizes via Pics module" },
  { sourceAction: "creative_uploaded", sourceModule: "ads_marketing", sourceEntity: "creative", targetModule: "cloud_storage", targetEntityType: "file", targetData: { action: "store_dedup" }, description: "Stores in Cloud Storage with dedup" },
  { sourceAction: "audience_synced", sourceModule: "ads_marketing", sourceEntity: "audience", targetModule: "crm", targetEntityType: "contact_list", targetData: { action: "update_lists" }, description: "Updates CRM contact lists" },
  { sourceAction: "audience_synced", sourceModule: "ads_marketing", sourceEntity: "audience", targetModule: "contacts", targetEntityType: "enrichment", targetData: { action: "enrich_segments" }, description: "Enriches via Contacts module" },
  { sourceAction: "lead_converted", sourceModule: "ads_marketing", sourceEntity: "lead", targetModule: "crm", targetEntityType: "opportunity", targetData: { action: "create_opportunity" }, description: "Creates CRM opportunity" },
  { sourceAction: "lead_converted", sourceModule: "ads_marketing", sourceEntity: "lead", targetModule: "tasks", targetEntityType: "task", targetData: { title: "Follow up with lead", priority: "high" }, description: "Assigns Tasks to sales" },
  { sourceAction: "lead_converted", sourceModule: "ads_marketing", sourceEntity: "lead", targetModule: "mail", targetEntityType: "nurture_sequence", targetData: { action: "trigger_nurture" }, description: "Triggers Mail nurture sequence" },
  { sourceAction: "performance_alert", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "chat", targetEntityType: "war_room", targetData: { action: "create_war_room" }, description: "Creates Chat war room" },
  { sourceAction: "performance_alert", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "meet", targetEntityType: "emergency_meeting", targetData: { action: "schedule_review" }, description: "Sends Meet invite for emergency review" },
  { sourceAction: "brand_safety_risk", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "vault", targetEntityType: "legal_hold", targetData: { action: "trigger_legal_hold" }, description: "Triggers Vault legal hold" },
  { sourceAction: "brand_safety_risk", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "tasks", targetEntityType: "compliance_review", targetData: { title: "Compliance review needed", priority: "critical" }, description: "Creates Tasks for compliance review" },
  { sourceAction: "brand_safety_risk", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "mail", targetEntityType: "board_notification", targetData: { urgency: "critical" }, description: "Sends Mail to board" },
  { sourceAction: "invoice_generated", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "finance", targetEntityType: "invoice", targetData: { action: "create_invoice" }, description: "Finance auto-creates invoice from campaign spend" },
  { sourceAction: "invoice_generated", sourceModule: "ads_marketing", sourceEntity: "campaign", targetModule: "erp", targetEntityType: "vendor_payment", targetData: { action: "update_status" }, description: "ERP updates vendor payment status" },
];

export class CrossModuleIntegrationService {
  private actionLog: CrossModuleActionLog[] = [];
  private actionCounter = 0;

  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  getIntegrationMatrix(action?: string): CrossModuleLink[] {
    if (action) return INTEGRATION_MATRIX.filter((l) => l.sourceAction === action);
    return INTEGRATION_MATRIX;
  }

  getActionsForModule(module: string): string[] {
    const actions = INTEGRATION_MATRIX.filter((l) => l.targetModule === module).map((l) => l.sourceAction);
    return [...new Set(actions)];
  }

  getTargetsForAction(action: string): { module: string; type: string }[] {
    return INTEGRATION_MATRIX.filter((l) => l.sourceAction === action).map((l) => ({
      module: l.targetModule, type: l.targetEntityType,
    }));
  }

  executeAction(tenantId: string, sourceAction: string, sourceEntity: string): CrossModuleActionLog {
    const links = INTEGRATION_MATRIX.filter((l) => l.sourceAction === sourceAction);
    const affectedModules = [...new Set(links.map((l) => l.targetModule))];

    for (const link of links) {
      this.mem().insert("cross_module_integrations", {
        tenantId, sourceAction, sourceEntity,
        targetModule: link.targetModule, targetEntityType: link.targetEntityType,
        targetData: link.targetData, description: link.description,
        executedAt: new Date().toISOString(),
      });
    }

    const log: CrossModuleActionLog = {
      actionId: `cmi_${++this.actionCounter}`,
      tenantId, sourceAction, sourceModule: "ads_marketing", sourceEntity,
      affectedModules, timestamp: new Date().toISOString(),
    };
    this.actionLog.push(log);
    return log;
  }

  getActionHistory(tenantId: string): CrossModuleActionLog[] {
    return this.actionLog.filter((l) => l.tenantId === tenantId).reverse();
  }

  getDashboard(tenantId: string): {
    totalIntegrations: number;
    uniqueActions: number;
    uniqueModules: number;
    recentActions: CrossModuleActionLog[];
    matrix: Record<string, string[]>;
  } {
    const actions = [...new Set(INTEGRATION_MATRIX.map((l) => l.sourceAction))];
    const modules = [...new Set(INTEGRATION_MATRIX.map((l) => l.targetModule))];
    const matrix: Record<string, string[]> = {};
    for (const action of actions) {
      matrix[action] = INTEGRATION_MATRIX.filter((l) => l.sourceAction === action).map((l) => l.targetModule);
    }
    return {
      totalIntegrations: INTEGRATION_MATRIX.length,
      uniqueActions: actions.length,
      uniqueModules: modules.length,
      recentActions: this.actionLog.filter((l) => l.tenantId === tenantId).reverse().slice(0, 10),
      matrix,
    };
  }

  summarizeImpact(action: string): { action: string; triggers: number; modules: string[]; description: string } | null {
    const links = INTEGRATION_MATRIX.filter((l) => l.sourceAction === action);
    if (links.length === 0) return null;
    return {
      action, triggers: links.length,
      modules: [...new Set(links.map((l) => l.targetModule))],
      description: `${action} triggers ${links.length} cross-module actions across ${new Set(links.map((l) => l.targetModule)).size} modules`,
    };
  }
}

export const crossModuleIntegrationService = new CrossModuleIntegrationService();
