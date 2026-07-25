import { DataStore } from "./DataStore";

interface CustomerProfile {
  id: string;
  tenantId: string;
  externalId?: string;
  email?: string;
  phone?: string;
  name: string;
  traits: Record<string, any>;
  segments: string[];
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  lifetimeValue: number;
  status: "active" | "inactive" | "churned";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerEvent {
  id: string;
  tenantId: string;
  profileId: string;
  type: string;
  properties: Record<string, any>;
  channel: "web" | "email" | "mobile" | "api" | "ads" | "social";
  source: string;
  timestamp: string;
  campaignId?: string;
  sessionId?: string;
}

interface CustomerSegment {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  color: string;
  rules: SegmentRule[];
  profileCount: number;
  isDynamic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SegmentRule {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in" | "exists" | "not_exists";
  value: any;
}

export class CDPService {
  getStats(tenantId: string) {
    const profiles = this.getProfiles(tenantId);
    const events = DataStore["mem"]().find("cdp_events", (e: any) => e.tenantId === tenantId);
    const segments = DataStore["mem"]().find("cdp_segments", (s: any) => s.tenantId === tenantId);
    return {
      totalProfiles: profiles.length,
      activeProfiles: profiles.filter(p => p.status === "active").length,
      totalEvents: events.length,
      eventTypes: [...new Set(events.map((e: any) => e.type))].length,
      totalSegments: segments.length,
      avgLifetimeValue: profiles.length ? Math.round(profiles.reduce((s: number, p: any) => s + (p.lifetimeValue || 0), 0) / profiles.length) : 0,
      topTraits: this.getTopTraits(profiles),
    };
  }

  private getTopTraits(profiles: any[]) {
    const traitCounts: Record<string, number> = {};
    profiles.forEach(p => {
      if (p.traits) Object.keys(p.traits).forEach(k => { traitCounts[k] = (traitCounts[k] || 0) + 1; });
    });
    return Object.entries(traitCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([trait, count]) => ({ trait, count }));
  }

  getProfiles(tenantId: string, search?: string, segment?: string): CustomerProfile[] {
    const mem = DataStore["mem"]();
    let profiles = mem.find("cdp_profiles", (p: any) => p.tenantId === tenantId) as CustomerProfile[];
    if (!profiles.length) {
      const seed: Partial<CustomerProfile>[] = [
        { externalId: "u_001", email: "alice@company.com", name: "Alice Johnson", traits: { role: "Marketing Director", company: "Acme Corp", revenue: "50M+", tier: "enterprise" }, status: "active", lifetimeValue: 12500, tags: ["saas", "high-value"] },
        { externalId: "u_002", email: "bob@startup.io", name: "Bob Smith", traits: { role: "CEO", company: "Startup IO", revenue: "5M-10M", tier: "growth" }, status: "active", lifetimeValue: 4800, tags: ["saas", "startup"] },
        { externalId: "u_003", email: "carol@retail.com", name: "Carol Williams", traits: { role: "E-commerce Manager", company: "RetailCo", revenue: "100M+", tier: "enterprise" }, status: "active", lifetimeValue: 22000, tags: ["ecommerce", "high-value"] },
        { externalId: "u_004", email: "dave@agency.co", name: "Dave Brown", traits: { role: "Media Buyer", company: "Agency Co", revenue: "10M-50M", tier: "growth" }, status: "inactive", lifetimeValue: 3200, tags: ["agency"] },
        { externalId: "u_005", email: "eve@finance.com", name: "Eve Davis", traits: { role: "CMO", company: "Finance Inc", revenue: "500M+", tier: "enterprise" }, status: "active", lifetimeValue: 45000, tags: ["finance", "high-value", "executive"] },
        { externalId: "u_006", email: "frank@dev.com", name: "Frank Miller", traits: { role: "Developer", company: "Dev Shop", revenue: "1M-5M", tier: "starter" }, status: "active", lifetimeValue: 1200, tags: ["dev"] },
        { externalId: "u_007", email: "grace@edu.edu", name: "Grace Wilson", traits: { role: "Admissions Director", company: "Edu University", revenue: "N/A", tier: "education" }, status: "active", lifetimeValue: 6800, tags: ["education"] },
      ];
      seed.forEach((s, i) => {
        const profile: CustomerProfile = {
          id: `cdp_${i + 1}`,
          tenantId, ...s as any,
          segments: [],
          firstSeen: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
          lastSeen: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
          eventCount: Math.floor(Math.random() * 200) + 10,
          createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mem.insert("cdp_profiles", profile);
      });
      profiles = mem.find("cdp_profiles", (p: any) => p.tenantId === tenantId) as CustomerProfile[];
    }
    if (search) {
      const q = search.toLowerCase();
      profiles = profiles.filter(p => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.externalId?.toLowerCase().includes(q));
    }
    if (segment) {
      profiles = profiles.filter(p => p.segments?.includes(segment));
    }
    return profiles;
  }

  getProfile(tenantId: string, id: string): CustomerProfile | undefined {
    return DataStore["mem"]().findOne("cdp_profiles", (p: any) => p.tenantId === tenantId && p.id === id);
  }

  updateProfile(tenantId: string, id: string, data: Partial<CustomerProfile>): CustomerProfile | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("cdp_profiles", (p: any) => p.tenantId === tenantId && p.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    mem.update("cdp_profiles", (p: any) => p.id === id, updated);
    return updated;
  }

  getEvents(tenantId: string, profileId?: string, type?: string, limit = 50): CustomerEvent[] {
    const mem = DataStore["mem"]();
    let events = mem.find("cdp_events", (e: any) => e.tenantId === tenantId) as CustomerEvent[];
    if (!events.length) {
      const profiles = mem.find("cdp_profiles", (p: any) => p.tenantId === tenantId);
      const eventTypes = ["page_view", "click", "form_submit", "purchase", "signup", "login", "logout", "email_open", "email_click", "ad_click", "ad_impression", "search", "download", "share", "comment"];
      const channels = ["web", "email", "mobile", "api", "ads", "social"] as const;
      for (let i = 0; i < 100; i++) {
        const profile = profiles[Math.floor(Math.random() * profiles.length)];
        if (!profile) continue;
        const event: CustomerEvent = {
          id: `evt_${i}_${Date.now()}`,
          tenantId,
          profileId: profile.id,
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          properties: { value: Math.random() * 500, source: "seed" },
          channel: channels[Math.floor(Math.random() * channels.length)],
          source: "seed_data",
          timestamp: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
        };
        mem.insert("cdp_events", event);
        const p = mem.findOne("cdp_profiles", (pr: any) => pr.id === profile.id);
        if (p) mem.update("cdp_profiles", (pr: any) => pr.id === profile.id, { eventCount: (p.eventCount || 0) + 1, lastSeen: event.timestamp });
      }
      events = mem.find("cdp_events", (e: any) => e.tenantId === tenantId) as CustomerEvent[];
    }
    if (profileId) events = events.filter(e => e.profileId === profileId);
    if (type) events = events.filter(e => e.type === type);
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  getEventTypes(tenantId: string): string[] {
    const events = DataStore["mem"]().find("cdp_events", (e: any) => e.tenantId === tenantId);
    return [...new Set(events.map((e: any) => e.type))].sort();
  }

  trackEvent(tenantId: string, data: { profileId: string; type: string; properties?: Record<string, any>; channel?: string; source?: string; campaignId?: string }): CustomerEvent {
    const mem = DataStore["mem"]();
    const event: CustomerEvent = {
      id: `evt_${Date.now()}`,
      tenantId,
      profileId: data.profileId,
      type: data.type,
      properties: data.properties || {},
      channel: (data.channel as any) || "api",
      source: data.source || "manual",
      timestamp: new Date().toISOString(),
      campaignId: data.campaignId,
    };
    mem.insert("cdp_events", event);
    const profile = mem.findOne("cdp_profiles", (p: any) => p.id === data.profileId);
    if (profile) {
      mem.update("cdp_profiles", (p: any) => p.id === data.profileId, { lastSeen: event.timestamp, eventCount: (profile.eventCount || 0) + 1, updatedAt: new Date().toISOString() });
    }
    return event;
  }

  getSegments(tenantId: string): CustomerSegment[] {
    const mem = DataStore["mem"]();
    let segments = mem.find("cdp_segments", (s: any) => s.tenantId === tenantId) as CustomerSegment[];
    if (!segments.length) {
      const seed: Partial<CustomerSegment>[] = [
        { name: "High Value Customers", description: "Customers with LTV > $10,000", color: "#10b981", rules: [{ field: "lifetimeValue", operator: "greater_than", value: 10000 }], isDynamic: true },
        { name: "Enterprise Tier", description: "Enterprise accounts", color: "#4f46e5", rules: [{ field: "traits.tier", operator: "equals", value: "enterprise" }], isDynamic: true },
        { name: "Recently Active", description: "Active in last 7 days", color: "#f59e0b", rules: [{ field: "status", operator: "equals", value: "active" }], isDynamic: true },
        { name: "SaaS Customers", description: "Tagged as SaaS", color: "#8b5cf6", rules: [{ field: "tags", operator: "contains", value: "saas" }], isDynamic: true },
        { name: "Churned Risk", description: "Inactive for 30+ days", color: "#ef4444", rules: [{ field: "status", operator: "equals", value: "inactive" }], isDynamic: true },
      ];
      seed.forEach(s => {
        const segment: CustomerSegment = {
          id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tenantId, ...s as any,
          profileCount: 0,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        mem.insert("cdp_segments", segment);
      });
      segments = mem.find("cdp_segments", (s: any) => s.tenantId === tenantId) as CustomerSegment[];
    }
    const profiles = mem.find("cdp_profiles", (p: any) => p.tenantId === tenantId);
    return segments.map(s => ({
      ...s,
      profileCount: profiles.filter((p: any) => {
        if (!s.rules?.length) return false;
        return s.rules.every(r => {
          const val = r.field === "lifetimeValue" ? p.lifetimeValue : r.field === "status" ? p.status : r.field === "tags" ? p.tags : r.field.startsWith("traits.") ? p.traits?.[r.field.replace("traits.", "")] : undefined;
          if (r.operator === "equals") return val === r.value;
          if (r.operator === "greater_than") return Number(val) > Number(r.value);
          if (r.operator === "less_than") return Number(val) < Number(r.value);
          if (r.operator === "contains") return Array.isArray(val) ? val.includes(r.value) : String(val).includes(r.value);
          return true;
        });
      }).length,
    }));
  }

  updateSegment(tenantId: string, id: string, data: Partial<CustomerSegment>): CustomerSegment | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("cdp_segments", (s: any) => s.tenantId === tenantId && s.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    mem.update("cdp_segments", (s: any) => s.id === id, updated);
    return updated;
  }

  deleteSegment(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("cdp_segments", (s: any) => s.tenantId === tenantId && s.id === id);
  }

  getEventTypeStats(tenantId: string): { type: string; count: number; lastOccurrence: string }[] {
    const events = DataStore["mem"]().find("cdp_events", (e: any) => e.tenantId === tenantId) as CustomerEvent[];
    const grouped: Record<string, { count: number; last: string }> = {};
    events.forEach(e => {
      if (!grouped[e.type]) grouped[e.type] = { count: 0, last: e.timestamp };
      grouped[e.type].count++;
      if (e.timestamp > grouped[e.type].last) grouped[e.type].last = e.timestamp;
    });
    return Object.entries(grouped).map(([type, data]) => ({ type, count: data.count, lastOccurrence: data.last })).sort((a, b) => b.count - a.count);
  }
}

export const cdpService = new CDPService();
