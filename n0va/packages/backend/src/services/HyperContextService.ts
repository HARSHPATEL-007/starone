import { MemoryStore } from "./MemoryStore";

export interface HyperContextLink {
  module: string;
  entityType: string;
  entityId: string;
  description: string;
  url: string;
  linkedAt: string;
}

export interface CrossModuleAction {
  actionId: string;
  sourceModule: string;
  sourceEntity: string;
  sourceEntityId: string;
  targetModule: string;
  targetEntityType: string;
  targetData: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export class HyperContextService {
  private actionCounter = 0;

  private mem(): MemoryStore {
    return MemoryStore.getInstance();
  }

  link(tenantId: string, sourceEntity: string, sourceEntityId: string, links: Omit<HyperContextLink, "linkedAt">[]): HyperContextLink[] {
    const result: HyperContextLink[] = links.map((l) => {
      const link: HyperContextLink = { ...l, linkedAt: new Date().toISOString() };
      this.mem().insert("hyper_context_links", { tenantId, sourceEntity, sourceEntityId, ...link });
      return link;
    });
    return result;
  }

  getLinks(tenantId: string, sourceEntity: string, sourceEntityId: string): HyperContextLink[] {
    return this.mem().find("hyper_context_links", (l: any) =>
      l.tenantId === tenantId && l.sourceEntity === sourceEntity && l.sourceEntityId === sourceEntityId
    );
  }

  getLinksByModule(tenantId: string, module: string): HyperContextLink[] {
    return this.mem().find("hyper_context_links", (l: any) =>
      l.tenantId === tenantId && l.module === module
    );
  }

  dispatchCrossModuleAction(
    tenantId: string, sourceModule: string, sourceEntity: string, sourceEntityId: string,
    targetModule: string, targetEntityType: string, targetData: Record<string, unknown>
  ): CrossModuleAction {
    const actionId = `hyper_${++this.actionCounter}`;
    const action: CrossModuleAction = {
      actionId, sourceModule, sourceEntity, sourceEntityId,
      targetModule, targetEntityType, targetData,
      status: "pending", createdAt: new Date().toISOString(),
    };
    this.mem().insert("cross_module_actions", { tenantId, ...action });
    action.status = "completed";
    return action;
  }

  linkCampaignToTasks(tenantId: string, campaignId: string, campaignName: string, taskTitles: string[]): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, taskTitles.map((title) => ({
      module: "tasks", entityType: "task", entityId: `task_${campaignId}`,
      description: title, url: `/tasks/${campaignId}`,
    })));
  }

  linkCampaignToCalendar(tenantId: string, campaignId: string, campaignName: string, eventDescriptions: { title: string; date: string }[]): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, eventDescriptions.map((ev) => ({
      module: "calendar", entityType: "event", entityId: `event_${campaignId}_${ev.title.replace(/\s+/g, "_")}`,
      description: ev.title, url: `/calendar/${campaignId}`,
    })));
  }

  linkCampaignToDocs(tenantId: string, campaignId: string, docTitle: string): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, [{
      module: "docs", entityType: "doc", entityId: `doc_${campaignId}`,
      description: docTitle, url: `/docs/${campaignId}`,
    }]);
  }

  linkCampaignToChat(tenantId: string, campaignId: string, chatRoomName: string): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, [{
      module: "chat", entityType: "war_room", entityId: `chat_${campaignId}`,
      description: chatRoomName, url: `/chat/${campaignId}`,
    }]);
  }

  linkCampaignToCRM(tenantId: string, campaignId: string): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, [{
      module: "crm", entityType: "opportunity", entityId: `crm_${campaignId}`,
      description: `Leads from campaign ${campaignId}`, url: `/crm/campaign/${campaignId}`,
    }]);
  }

  linkCampaignToFinance(tenantId: string, campaignId: string, spendAmount: number): HyperContextLink[] {
    return this.link(tenantId, "campaign", campaignId, [{
      module: "finance", entityType: "invoice", entityId: `inv_${campaignId}`,
      description: `Campaign spend: $${spendAmount.toLocaleString()}`, url: `/finance/campaign/${campaignId}`,
    }]);
  }

  getCampaignHyperContext(tenantId: string, campaignId: string): Record<string, HyperContextLink[]> {
    const allLinks = this.getLinks(tenantId, "campaign", campaignId);
    const grouped: Record<string, HyperContextLink[]> = {};
    for (const link of allLinks) {
      if (!grouped[link.module]) grouped[link.module] = [];
      grouped[link.module].push(link);
    }
    return grouped;
  }

  getConnectedModules(tenantId: string, campaignId: string): string[] {
    const links = this.getLinks(tenantId, "campaign", campaignId);
    return [...new Set(links.map((l) => l.module))];
  }
}

export const hyperContextService = new HyperContextService();
