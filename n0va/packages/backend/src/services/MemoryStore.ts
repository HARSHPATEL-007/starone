export class MemoryStore {
  private static instance: MemoryStore;
  private collections: Map<string, any[]> = new Map();
  private idCounter = 1000;

  private constructor() {
    this.seed();
  }

  static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  private genId(): string {
    return `mem_${++this.idCounter}_${Date.now()}`;
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  collection(name: string): any[] {
    if (!this.collections.has(name)) {
      this.collections.set(name, []);
    }
    return this.collections.get(name)!;
  }

  insert(collection: string, doc: Record<string, any>): any {
    const col = this.collection(collection);
    const record = { _id: this.genId(), ...doc, createdAt: this.timestamp(), updatedAt: this.timestamp() };
    col.push(record);
    return record;
  }

  find(collection: string, filter?: (doc: any) => boolean): any[] {
    const col = this.collection(collection);
    return filter ? col.filter(filter) : [...col];
  }

  findOne(collection: string, filter: (doc: any) => boolean): any | undefined {
    return this.collection(collection).find(filter);
  }

  update(collection: string, filter: (doc: any) => boolean, update: Record<string, any>): any | null {
    const col = this.collection(collection);
    const idx = col.findIndex(filter);
    if (idx === -1) return null;
    col[idx] = { ...col[idx], ...update, updatedAt: this.timestamp() };
    return col[idx];
  }

  delete(collection: string, filter: (doc: any) => boolean): boolean {
    const col = this.collection(collection);
    const idx = col.findIndex(filter);
    if (idx === -1) return false;
    col.splice(idx, 1);
    return true;
  }

  private seed(): void {
    const now = Date.now();
    const day = 86400000;

    const campaigns = [
      { tenantId: "tenant_001", name: "Q3 Enterprise SaaS Push", type: "performance", status: "active", budget: { daily: 5000, lifetime: 150000, currency: "USD", spent: 45200, remaining: 104800 }, platforms: ["meta", "google", "linkedin"], goal: "Drive Q3 enterprise signups", tags: ["saas", "enterprise", "q3"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Brand Awareness - Summer Campaign", type: "brand", status: "active", budget: { daily: 3000, lifetime: 90000, currency: "USD", spent: 28100, remaining: 61900 }, platforms: ["meta", "tiktok", "snapchat"], goal: "Increase brand recall by 20%", tags: ["brand", "summer"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Retargeting - Cart Abandoners", type: "retargeting", status: "active", budget: { daily: 1500, lifetime: 45000, currency: "USD", spent: 12300, remaining: 32700 }, platforms: ["meta", "google"], goal: "Recover abandoned carts", tags: ["retargeting", "ecommerce"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Prospecting - New Markets APAC", type: "prospecting", status: "draft", budget: { daily: 2000, lifetime: 60000, currency: "USD", spent: 0, remaining: 60000 }, platforms: ["google", "linkedin"], goal: "Enter APAC market", tags: ["apac", "prospecting"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Holiday Flash Sale", type: "performance", status: "paused", budget: { daily: 8000, lifetime: 80000, currency: "USD", spent: 32000, remaining: 48000 }, platforms: ["meta", "google", "tiktok"], goal: "Flash sale promotion", tags: ["holiday", "flash"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "LinkedIn Thought Leadership", type: "brand", status: "active", budget: { daily: 2500, lifetime: 75000, currency: "USD", spent: 18900, remaining: 56100 }, platforms: ["linkedin"], goal: "Establish executive thought leadership", tags: ["linkedin", "thought-leadership"], createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Webinar Registration Campaign", type: "performance", status: "active", budget: { daily: 1000, lifetime: 30000, currency: "USD", spent: 8400, remaining: 21600 }, platforms: ["meta", "google", "linkedin"], goal: "Drive webinar signups", tags: ["webinar", "lead-gen"], createdBy: "user_001" },
    ];

    for (const c of campaigns) this.insert("campaigns", c);

    for (let d = 30; d >= 0; d--) {
      const date = new Date(now - d * day).toISOString().split("T")[0];
      for (const c of campaigns.slice(0, 4)) {
        if (c.status === "draft") continue;
        this.insert("metrics", {
          tenantId: "tenant_001",
          campaignId: c.name.toLowerCase().replace(/\s+/g, "_"),
          platform: c.platforms[Math.floor(Math.random() * c.platforms.length)],
          date,
          impressions: Math.floor(Math.random() * 50000) + 10000,
          clicks: Math.floor(Math.random() * 2000) + 200,
          conversions: Math.floor(Math.random() * 100) + 5,
          spend: Math.floor(Math.random() * 2000) + 200,
          revenue: Math.floor(Math.random() * 8000) + 500,
          ctr: 0,
          cpc: 0,
          roas: 0,
        });
      }
    }

    const metrics = this.collection("metrics");
    for (const m of metrics) {
      m.ctr = parseFloat(((m.clicks / m.impressions) * 100).toFixed(2));
      m.cpc = parseFloat((m.spend / m.clicks).toFixed(2));
      m.roas = parseFloat((m.revenue / m.spend).toFixed(2));
    }

    const creatives = [
      { tenantId: "tenant_001", name: "Enterprise Hero Image", type: "image", status: "approved", headline: "Transform Your Business With AI", body: "Enterprise-grade AI solutions for modern teams", cta: "Learn More", tags: ["enterprise", "hero"], performance: { impressions: 145000, clicks: 4200, ctr: 2.9 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Product Demo Video 30s", type: "video", status: "active", headline: "See N0VA In Action", cta: "Watch Demo", tags: ["video", "demo"], performance: { impressions: 89000, clicks: 3100, ctr: 3.48 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Customer Success Carousel", type: "carousel", status: "active", headline: "Trusted By Industry Leaders", cta: "See Case Studies", tags: ["social-proof", "carousel"], performance: { impressions: 67000, clicks: 1900, ctr: 2.84 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Black Friday Offer", type: "image", status: "draft", headline: "50% Off — Limited Time", cta: "Shop Now", tags: ["holiday", "offer"], performance: { impressions: 0, clicks: 0, ctr: 0 }, createdBy: "user_001" },
    ];
    for (const cr of creatives) this.insert("creatives", cr);

    const audiences = [
      { tenantId: "tenant_001", name: "Enterprise Decision Makers", type: "custom", platform: "linkedin", size: 245000, status: "active", criteria: { job_titles: ["CTO", "VP Engineering", "Head of Product"], company_size: "500+", industries: ["technology", "finance"] }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "SaaS Lookalike - Top 10%", type: "lookalike", platform: "meta", size: 1800000, status: "active", criteria: { source: "customer_list", percentage: 10 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Cart Abandoners 30d", type: "retargeting", platform: "google", size: 45000, status: "active", criteria: { window: 30, pages: ["/cart", "/checkout"], behavior: "left_without_purchase" }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Webinar Attendees Q2", type: "saved", platform: "meta", size: 12000, status: "building", criteria: { event: "q2_webinar", attended: true }, createdBy: "user_001" },
    ];
    for (const a of audiences) this.insert("audiences", a);

    const agents = [
      { tenantId: "tenant_001", name: "Budget Agent", type: "budget", status: "running", frequency: "every_4_hours", config: { maxShiftPercent: 30, minRoas: 2.5 }, metrics: { runs: 127, successes: 124, failures: 3, actionsTaken: 89 }, hitlThreshold: 10000, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Creative Agent", type: "creative", status: "running", frequency: "every_6_hours", config: { fatigueThreshold: 20, generateVariants: true }, metrics: { runs: 84, successes: 82, failures: 2, actionsTaken: 156 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Audience Agent", type: "audience", status: "paused", frequency: "daily", config: { minLtvScore: 0.7, maxSegmentSize: 2000000 }, metrics: { runs: 42, successes: 40, failures: 2, actionsTaken: 67 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Bid Agent", type: "bid", status: "running", frequency: "every_2_hours", config: { cpcCap: 5.0, dayparting: true }, metrics: { runs: 310, successes: 305, failures: 5, actionsTaken: 420 }, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Fraud Agent", type: "fraud", status: "running", frequency: "realtime", config: { ivtThreshold: 90, autoPause: true }, metrics: { runs: 1500, successes: 1495, failures: 5, actionsTaken: 210 }, lastRun: new Date(Date.now() - 60000).toISOString(), createdBy: "user_001" },
    ];
    for (const ag of agents) this.insert("agents", ag);

    const recipes = [
      { tenantId: "tenant_001", name: "Auto-Budget-Reallocation-v2", description: "When ROAS drops 15% on Meta, shift 30% budget to Google, expand lookalike by 1%", trigger: "roas_drop > 0.15 on meta for 4h", steps: [{ action: "shift_budget", platform: "meta", params: { percent: -30 } }, { action: "shift_budget", platform: "google", params: { percent: 30 } }, { action: "expand_lookalike", platform: "meta", params: { percent: 1 } }], hitlGate: { threshold: 10000, field: "budget_shift" }, isCompiled: true, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Creative-Fatigue-Refresh", description: "When CTR drops 20% on any creative, generate 3 new variants and pause fatigued assets", trigger: "ctr_drop > 0.20 on creative for 6h", steps: [{ action: "pause_creative", platform: "*", params: { reason: "fatigue" } }, { action: "generate_variants", platform: "n0va_diffusion", params: { count: 3 } }, { action: "upload_creatives", platform: "*", params: {} }], isCompiled: true, createdBy: "user_001" },
      { tenantId: "tenant_001", name: "Fraud-Auto-Pause", description: "When IVT exceeds 90% on any placement, auto-pause and notify security team", trigger: "ivt_score > 90 on placement", steps: [{ action: "pause_placement", platform: "*", params: {} }, { action: "notify_chat", platform: "n0va", params: { channel: "security" } }, { action: "create_task", platform: "n0va", params: { assignee: "compliance" } }], isCompiled: false, createdBy: "user_001" },
    ];
    for (const r of recipes) this.insert("recipes", { ...r, compiledCode: null });

    const dailyMetrics: any[] = [];
    for (let d = 30; d >= 0; d--) {
      const date = new Date(now - d * day).toISOString().split("T")[0];
      const impressions = Math.floor(Math.random() * 200000) + 50000;
      const clicks = Math.floor(Math.random() * 8000) + 1000;
      const conversions = Math.floor(Math.random() * 300) + 30;
      const spend = Math.floor(Math.random() * 8000) + 1000;
      const revenue = Math.floor(Math.random() * 25000) + 3000;
      dailyMetrics.push({
        date,
        impressions,
        clicks,
        conversions,
        spend,
        revenue,
        ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
        cpc: parseFloat((spend / clicks).toFixed(2)),
        roas: parseFloat((revenue / spend).toFixed(2)),
      });
    }
    for (const dm of dailyMetrics) {
      this.insert("daily_metrics", dm);
    }

    this.collection("connected_accounts").push(
      { tenantId: "tenant_001", platform: "meta", label: "Main Business", status: "active", credentials: { scopes: ["read", "write"] }, metadata: { accountId: "act_123456789" }, createdAt: this.timestamp(), updatedAt: this.timestamp() },
      { tenantId: "tenant_001", platform: "google", label: "Google Ads Primary", status: "active", credentials: { scopes: ["read", "write"] }, metadata: { customerId: "123-456-7890" }, createdAt: this.timestamp(), updatedAt: this.timestamp() },
      { tenantId: "tenant_001", platform: "linkedin", label: "LinkedIn B2B", status: "active", credentials: { scopes: ["read", "write"] }, metadata: { accountId: "li_12345" }, createdAt: this.timestamp(), updatedAt: this.timestamp() },
    );
  }
}
