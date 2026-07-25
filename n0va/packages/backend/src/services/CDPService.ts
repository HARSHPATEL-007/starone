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

  // ─── Identity Resolution ──────────────────────────────────────────────

  resolveIdentities(tenantId: string): { matches: { profileId: string; matchedWith: string; method: string; confidence: number }[]; resolved: number; unresolved: number } {
    const profiles = DataStore["mem"]().find("cdp_profiles", (p: any) => p.tenantId === tenantId) as CustomerProfile[];
    const matches: { profileId: string; matchedWith: string; method: string; confidence: number }[] = [];
    let resolved = 0;

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const a = profiles[i];
        const b = profiles[j];
        if (a.id === b.id) continue;

        // Deterministic: exact email or phone match → 100%
        if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
          matches.push({ profileId: a.id, matchedWith: b.id, method: "email_match", confidence: 1.0 });
          resolved++;
          continue;
        }
        if (a.phone && b.phone && a.phone === b.phone) {
          matches.push({ profileId: a.id, matchedWith: b.id, method: "phone_match", confidence: 1.0 });
          resolved++;
          continue;
        }
        if (a.externalId && b.externalId && a.externalId === b.externalId) {
          matches.push({ profileId: a.id, matchedWith: b.id, method: "external_id_match", confidence: 1.0 });
          resolved++;
          continue;
        }

        // Probabilistic: name similarity + domain overlap
        const aName = (a.name || "").toLowerCase().split(" ").filter(Boolean);
        const bName = (b.name || "").toLowerCase().split(" ").filter(Boolean);
        const nameOverlap = aName.filter((n) => bName.includes(n)).length / Math.max(Math.max(aName.length, bName.length), 1);
        const aDomain = a.email?.split("@")[1] || "";
        const bDomain = b.email?.split("@")[1] || "";
        const domainMatch = aDomain && bDomain && aDomain === bDomain ? 0.3 : 0;

        if (nameOverlap >= 0.5 || domainMatch > 0) {
          const confidence = Math.min(0.95, nameOverlap * 0.6 + domainMatch);
          if (confidence >= 0.5) {
            matches.push({ profileId: a.id, matchedWith: b.id, method: "probabilistic", confidence: Math.round(confidence * 100) / 100 });
            resolved++;
          }
        }
      }
    }

    return { matches, resolved, unresolved: profiles.length - resolved };
  }

  mergeProfiles(tenantId: string, targetId: string, sourceId: string): CustomerProfile | null {
    const mem = DataStore["mem"]();
    const target = mem.findOne("cdp_profiles", (p: any) => p.tenantId === tenantId && p.id === targetId) as CustomerProfile;
    const source = mem.findOne("cdp_profiles", (p: any) => p.tenantId === tenantId && p.id === sourceId) as CustomerProfile;
    if (!target || !source) return null;

    const merged: CustomerProfile = {
      ...target,
      externalId: target.externalId || source.externalId,
      email: target.email || source.email,
      phone: target.phone || source.phone,
      name: target.name || source.name,
      traits: { ...source.traits, ...target.traits },
      segments: [...new Set([...target.segments, ...source.segments])],
      tags: [...new Set([...target.tags, ...source.tags])],
      firstSeen: target.firstSeen < source.firstSeen ? target.firstSeen : source.firstSeen,
      lastSeen: target.lastSeen > source.lastSeen ? target.lastSeen : source.lastSeen,
      eventCount: target.eventCount + source.eventCount,
      lifetimeValue: target.lifetimeValue + source.lifetimeValue,
      updatedAt: new Date().toISOString(),
    };
    mem.update("cdp_profiles", (p: any) => p.id === targetId, merged);
    mem.delete("cdp_profiles", (p: any) => p.id === sourceId);

    // Reassign events
    const events = mem.find("cdp_events", (e: any) => e.tenantId === tenantId && e.profileId === sourceId);
    events.forEach((e: any) => mem.update("cdp_events", (ev: any) => ev.id === e.id, { profileId: targetId }));

    return merged;
  }

  // ─── Lookalike Audience ─────────────────────────────────────────────

  generateLookalike(
    tenantId: string,
    seedProfileIds: string[],
    options?: { size?: number; similarityThreshold?: number; traitWeights?: Record<string, number> },
  ): { candidates: { profile: CustomerProfile; similarity: number; matchBreakdown: Record<string, number> }[]; seedCount: number; totalScored: number } {
    const profiles = this.getProfiles(tenantId);
    const seedProfiles = profiles.filter((p) => seedProfileIds.includes(p.id));
    if (seedProfiles.length === 0) return { candidates: [], seedCount: 0, totalScored: 0 };

    const seedVector = this.averageProfileVector(seedProfiles, options?.traitWeights);
    const size = options?.size ?? 20;
    const threshold = options?.similarityThreshold ?? 0.1;

    const scored = profiles
      .filter((p) => !seedProfileIds.includes(p.id))
      .map((p) => {
        const pVec = this.profileVector(p, options?.traitWeights);
        const breakdown: Record<string, number> = {};
        let totalSim = 0;
        let dims = 0;

        for (const key of Object.keys(seedVector)) {
          const sv = seedVector[key] ?? 0;
          const pv = pVec[key] ?? 0;
          if (sv === 0 && pv === 0) continue;
          const maxVal = Math.max(Math.abs(sv), Math.abs(pv));
          const dimSim = maxVal > 0 ? 1 - Math.abs(sv - pv) / maxVal : 1;
          breakdown[key] = Math.round(dimSim * 100) / 100;
          totalSim += dimSim;
          dims++;
        }
        const similarity = dims > 0 ? totalSim / dims : 0;
        return { profile: p, similarity: Math.round(similarity * 10000) / 10000, matchBreakdown: breakdown };
      })
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, size);

    return { candidates: scored, seedCount: seedProfiles.length, totalScored: profiles.length - seedProfiles.length };
  }

  private averageProfileVector(profiles: CustomerProfile[], traitWeights?: Record<string, number>): Record<string, number> {
    const vec: Record<string, number> = {};
    if (profiles.length === 0) return vec;

    const addToVec = (p: CustomerProfile) => {
      vec["_ltv"] = (vec["_ltv"] || 0) + Math.log2(Math.max(p.lifetimeValue, 1)) / 16;
      vec["_eventCount"] = (vec["_eventCount"] || 0) + Math.log2(Math.max(p.eventCount, 1)) / 8;
      vec["_status_active"] = (vec["_status_active"] || 0) + (p.status === "active" ? 1 : 0);
      vec["_status_inactive"] = (vec["_status_inactive"] || 0) + (p.status === "inactive" ? 1 : 0);

      if (p.traits) {
        for (const [k, v] of Object.entries(p.traits)) {
          const w = traitWeights?.[k] ?? 1;
          if (typeof v === "string") vec[`trait_${k}_${v}`] = (vec[`trait_${k}_${v}`] || 0) + w;
          else if (typeof v === "number") vec[`trait_num_${k}`] = (vec[`trait_num_${k}`] || 0) + Math.log2(Math.max(v as number, 1)) * w;
        }
      }

      if (p.tags) {
        p.tags.forEach((t) => { vec[`tag_${t}`] = (vec[`tag_${t}`] || 0) + 1; });
      }
    };

    profiles.forEach(addToVec);
    for (const key of Object.keys(vec)) {
      vec[key] /= profiles.length;
    }
    return vec;
  }

  private profileVector(profile: CustomerProfile, traitWeights?: Record<string, number>): Record<string, number> {
    const vec: Record<string, number> = {};
    vec["_ltv"] = Math.log2(Math.max(profile.lifetimeValue, 1)) / 16;
    vec["_eventCount"] = Math.log2(Math.max(profile.eventCount, 1)) / 8;
    vec["_status_active"] = profile.status === "active" ? 1 : 0;
    vec["_status_inactive"] = profile.status === "inactive" ? 1 : 0;

    if (profile.traits) {
      for (const [k, v] of Object.entries(profile.traits)) {
        const w = traitWeights?.[k] ?? 1;
        if (typeof v === "string") vec[`trait_${k}_${v}`] = w;
        else if (typeof v === "number") vec[`trait_num_${k}`] = Math.log2(Math.max(v as number, 1)) * w;
      }
    }
    if (profile.tags) {
      profile.tags.forEach((t) => { vec[`tag_${t}`] = 1; });
    }
    return vec;
  }

  // ─── Predictive LTV ─────────────────────────────────────────────────

  predictLTV(tenantId: string, profileId: string): {
    currentLTV: number;
    predictedLTV6Months: number;
    predictedLTV12Months: number;
    predictedLTV24Months: number;
    confidence: number;
    factors: { recency: number; frequency: number; monetary: number; engagement: number; churnRisk: number };
  } {
    const profile = this.getProfile(tenantId, profileId);
    if (!profile) throw new Error("Profile not found");
    const events = this.getEvents(tenantId, profileId);

    const now = Date.now();
    const daysSinceLastSeen = (now - new Date(profile.lastSeen).getTime()) / 86400000;
    const daysSinceFirstSeen = Math.max(1, (now - new Date(profile.firstSeen).getTime()) / 86400000);
    const activeDays = events.filter((e) => {
      const eTime = new Date(e.timestamp).getTime();
      return now - eTime < 90 * 86400000;
    }).length;

    // Recency: 0-1, higher = more recent
    const recency = Math.max(0, Math.min(1, 1 - daysSinceLastSeen / 365));
    // Frequency: events per month
    const frequency = Math.min(1, (profile.eventCount / Math.max(daysSinceFirstSeen / 30, 1)) / 50);
    // Monetary: normalized LTV
    const monetary = Math.min(1, profile.lifetimeValue / 100000);
    // Engagement: active days in last 90 days
    const engagement = Math.min(1, activeDays / 30);

    const churnRisk = Math.max(0, Math.min(1, (daysSinceLastSeen > 60 ? 0.4 : 0) + (activeDays < 2 ? 0.3 : 0) + (profile.status === "churned" ? 0.3 : 0)));

    const monthlyLTV = profile.lifetimeValue / Math.max(daysSinceFirstSeen / 30, 1);
    const retentionFactor = Math.pow(1 - churnRisk, 2);
    const growthFactor = 1 + (engagement > 0.5 ? 0.1 : engagement > 0.2 ? 0.05 : 0);

    const predicted6 = profile.lifetimeValue + monthlyLTV * 6 * retentionFactor * growthFactor;
    const predicted12 = profile.lifetimeValue + monthlyLTV * 12 * retentionFactor * growthFactor * 0.9;
    const predicted24 = profile.lifetimeValue + monthlyLTV * 24 * retentionFactor * growthFactor * 0.75;

    const confidence = Math.round((monetary * 0.3 + frequency * 0.25 + recency * 0.2 + (profile.eventCount > 20 ? 0.25 : 0.1)) * 100) / 100;

    return {
      currentLTV: profile.lifetimeValue,
      predictedLTV6Months: Math.round(predicted6 * 100) / 100,
      predictedLTV12Months: Math.round(predicted12 * 100) / 100,
      predictedLTV24Months: Math.round(predicted24 * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      factors: {
        recency: Math.round(recency * 100) / 100,
        frequency: Math.round(frequency * 100) / 100,
        monetary: Math.round(monetary * 100) / 100,
        engagement: Math.round(engagement * 100) / 100,
        churnRisk: Math.round(churnRisk * 100) / 100,
      },
    };
  }

  batchPredictLTV(tenantId: string): {
    predictions: { profileId: string; name: string; currentLTV: number; predictedLTV12Months: number; churnRisk: number; confidence: number }[];
    summary: { totalLTV: number; totalPredicted12Months: number; atRiskCount: number; highValueCount: number };
  } {
    const profiles = this.getProfiles(tenantId);
    const predictions = profiles.map((p) => {
      const pred = this.predictLTV(tenantId, p.id);
      return { profileId: p.id, name: p.name, currentLTV: pred.currentLTV, predictedLTV12Months: pred.predictedLTV12Months, churnRisk: pred.factors.churnRisk, confidence: pred.confidence };
    }).sort((a, b) => b.predictedLTV12Months - a.predictedLTV12Months);

    const totalLTV = predictions.reduce((s, p) => s + p.currentLTV, 0);
    const totalPredicted12Months = predictions.reduce((s, p) => s + p.predictedLTV12Months, 0);
    const atRiskCount = predictions.filter((p) => p.churnRisk > 0.5).length;
    const highValueCount = predictions.filter((p) => p.predictedLTV12Months > 20000).length;

    return { predictions, summary: { totalLTV: Math.round(totalLTV), totalPredicted12Months: Math.round(totalPredicted12Months), atRiskCount, highValueCount } };
  }
}

export const cdpService = new CDPService();
