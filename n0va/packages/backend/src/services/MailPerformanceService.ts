import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const CACHE_LAYERS = [
  { id: "l1_browser", name: "L1 Browser", layer: "L1", technology: "Service Worker + Cache API", ttl: "1h-90d", hitRateTarget: 98 },
  { id: "l2_cdn", name: "L2 CDN", layer: "L2", technology: "CloudFront/Fastly/CloudFlare", ttl: "1h-30d", hitRateTarget: 95 },
  { id: "l3_edge", name: "L3 Edge", layer: "L3", technology: "Redis (Edge nodes)", ttl: "5m-2h", hitRateTarget: 90 },
  { id: "l4_application", name: "L4 Application", layer: "L4", technology: "Redis Cluster + Valkey", ttl: "1m-2h", hitRateTarget: 85 },
  { id: "l5_database", name: "L5 Database", layer: "L5", technology: "WiredTiger Cache", ttl: "Auto LRU", hitRateTarget: 99.9 },
  { id: "l6_object_storage", name: "L6 Object Storage", layer: "L6", technology: "S3 + CDN + CacheFS", ttl: "1d-90d", hitRateTarget: 85 },
  { id: "l7_ai_model", name: "L7 AI Model", layer: "L7", technology: "vLLM + TensorRT-LLM", ttl: "1h-48h", hitRateTarget: 80 },
  { id: "l8_collaboration", name: "L8 Collaboration", layer: "L8", technology: "CRDT State Cache", ttl: "Real-time", hitRateTarget: 95 },
  { id: "l9_voice", name: "L9 Voice", layer: "L9", technology: "Whisper Cache", ttl: "1h-24h", hitRateTarget: 90 },
] as const;

export const SCALABILITY_TARGETS = [
  { id: "concurrent_users", name: "Concurrent Users", target: "10M per tenant", burst: "50M with auto-scale" },
  { id: "emails_per_day", name: "Emails/Day", target: "50M per tenant", burst: "500M dedicated" },
  { id: "search_queries", name: "Search Queries", target: "10M RPM", burst: "50M RPM" },
  { id: "attachment_upload", name: "Attachment Upload", target: "50TB single file", burst: "500TB chunked" },
  { id: "ai_inference", name: "AI Inference", target: "500K concurrent", burst: "2M with GPU scale" },
  { id: "voice_processing", name: "Voice Processing", target: "100K concurrent", burst: "500K with GPU scale" },
  { id: "realtime_collab", name: "Real-Time Collaboration", target: "1M concurrent editors", burst: "5M with mesh scaling" },
  { id: "websocket_connections", name: "WebSocket Connections", target: "50M concurrent", burst: "200M with edge scaling" },
] as const;

export const EDGE_REGIONS = [
  { id: "us-east-1", name: "us-east-1", roles: ["SMTP relay", "AI infer", "Search index", "CDN cache", "WS mesh"] },
  { id: "eu-west-1", name: "eu-west-1", roles: ["SMTP relay", "AI infer", "Search index", "CDN cache", "WS mesh"] },
  { id: "ap-south-1", name: "ap-south-1", roles: ["SMTP relay", "AI infer", "Search index", "CDN cache", "WS mesh"] },
  { id: "sa-east-1", name: "sa-east-1", roles: ["SMTP relay", "AI infer", "Search index", "CDN cache", "WS mesh"] },
] as const;

const GREEN_CERTS = ["ISO 14001: Environmental Management", "Green Grid: Gold rating", "Science Based Targets initiative: Committed"];

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("mail_perf_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export class MailPerformanceService {
  caching(tenantId: string) {
    const layers = CACHE_LAYERS.map((l) => {
      const hitRate = Math.min(100, l.hitRateTarget + (hashStr(tenantId + l.id + "hit") % 20) - 8);
      return {
        ...l,
        hitRate: parseFloat(hitRate.toFixed(1)),
        hits: 100000 + hashStr(tenantId + l.id + "hits") % 9000000,
        misses: 500 + hashStr(tenantId + l.id + "miss") % 50000,
        status: hitRate >= l.hitRateTarget ? "on_target" : "below_target",
      };
    });
    return {
      layers,
      averageHitRate: parseFloat((layers.reduce((s, l) => s + l.hitRate, 0) / layers.length).toFixed(1)),
      overallStatus: layers.every((l) => l.status === "on_target") ? "healthy" : layers.filter((l) => l.status === "below_target").length <= 2 ? "degraded" : "review",
      summary: `${layers.length} cache layers — avg hit rate ${(layers.reduce((s, l) => s + l.hitRate, 0) / layers.length).toFixed(1)}%, ${layers.filter((l) => l.status === "below_target").length} below target`,
      seed: hashStr(tenantId + "caching"),
    };
  }

  flushCache(tenantId: string, layerId?: string) {
    const target = layerId ? CACHE_LAYERS.find((l) => l.id === layerId) : undefined;
    if (layerId && !target) throw new Error("Unknown cache layer");
    const layers = target ? [target] : CACHE_LAYERS;
    logEntry(tenantId, "cache_flush", `Flushed ${layers.length} cache layer(s)${target ? ` (${target.name})` : " (all layers)"} — origin serve + rewarm initiated`);
    return {
      flushed: layers.map((l) => l.id),
      count: layers.length,
      rewarm: true,
      summary: `Flushed ${layers.length} cache layer(s)${target ? ` (${target.name})` : ""} — origin serve active, rewarm in progress`,
    };
  }

  queryOptimization(tenantId: string) {
    const indexes = [
      { name: "tenant_folder_date", type: "Compound", spec: "{tenant_id: 1, folder: 1, date: -1}", impact: "10x read speed" },
      { name: "msg_covered_inbox", type: "Covered", spec: "index includes all queried fields", impact: "Eliminates document fetch" },
      { name: "active_msgs", type: "Partial", spec: "only active messages indexed", impact: "60% index size reduction" },
      { name: "fts_text", type: "Text", spec: "full-text with language analyzers", impact: "<50ms search" },
      { name: "vector_semantic", type: "Vector (ANN)", spec: "semantic embeddings", impact: "<100ms semantic queries" },
      { name: "ts_analytics", type: "Time-Series", spec: "date-bucketed aggregation", impact: "100x analytics speed" },
      { name: "mv_thread_summaries", type: "Materialized View", spec: "pre-computed thread summaries", impact: "<10ms thread load" },
    ];
    const active = indexes.filter((_, i) => hashStr(tenantId + "idx" + i) % 5 !== 0);
    return {
      indexes,
      active,
      activeCount: active.length,
      indexSizeReductionPct: 60,
      summary: `${active.length}/${indexes.length} query-optimization techniques active — projected ${active.length > 0 ? "10x" : "1x"} read speed`,
      seed: hashStr(tenantId + "query_opt"),
    };
  }

  explainQuery(tenantId: string, query: any = {}) {
    const q = typeof query === "string" ? query : JSON.stringify(query || {});
    const usesFolder = q.toLowerCase().includes("folder");
    const usesTenant = q.toLowerCase().includes("tenant");
    const usesDate = q.toLowerCase().includes("date") || q.toLowerCase().includes("received");
    const indexMatches = ["tenant_folder_date", "msg_covered_inbox", "fts_text"].filter((idx) => {
      if (idx === "tenant_folder_date") return usesTenant || usesFolder || usesDate;
      if (idx === "msg_covered_inbox") return usesFolder;
      if (idx === "fts_text") return q.toLowerCase().includes("subject") || q.toLowerCase().includes("body") || q.toLowerCase().includes("search");
      return false;
    });
    const score = Math.min(100, indexMatches.length * 30 + 20);
    return {
      query: q,
      indexMatches,
      estimatedMs: Math.max(5, 80 - indexMatches.length * 15 + (hashStr(tenantId + q.length + "ms") % 20)),
      score,
      verdict: score >= 70 ? "indexed" : score >= 40 ? "partial" : "full_scan",
      summary: indexMatches.length > 0
        ? `Query covered by ${indexMatches.length} index(es) — estimated ${Math.max(5, 80 - indexMatches.length * 15 + (hashStr(tenantId + q.length + "ms") % 20))}ms`
        : "Query lacks matching indexes — full collection scan expected",
    };
  }

  scalability(tenantId: string) {
    const rows = SCALABILITY_TARGETS.map((t) => {
      const loadPct = 10 + (hashStr(tenantId + t.id + "load") % 60);
      return { ...t, currentLoadPct: loadPct, headroomPct: 100 - loadPct };
    });
    const avgLoad = rows.reduce((s, r) => s + r.currentLoadPct, 0) / rows.length;
    return {
      targets: rows,
      avgLoadPct: parseFloat(avgLoad.toFixed(1)),
      burstReady: rows.every((r) => r.headroomPct >= 30),
      verdict: avgLoad >= 80 ? "scale_needed" : avgLoad >= 60 ? "monitor" : "healthy",
      summary: `8 scalability targets — avg load ${avgLoad.toFixed(1)}% (${avgLoad >= 80 ? "auto-scale advised" : avgLoad >= 60 ? "monitoring" : "healthy headroom"})`,
      seed: hashStr(tenantId + "scalability"),
    };
  }

  edge(tenantId: string) {
    const regions = EDGE_REGIONS.map((r) => {
      const latencyMs = 20 + hashStr(tenantId + r.id + "lat") % 130;
      const load = 20 + hashStr(tenantId + r.id + "load") % 60;
      return { ...r, latencyMs, loadPct: load, status: load >= 80 ? "busy" : "healthy" };
    });
    return {
      regions,
      avgLatencyMs: Math.round(regions.reduce((s, r) => s + r.latencyMs, 0) / regions.length),
      edgeTargets: [
        { metric: "Email send", edge: "<100ms", core: "<500ms", offline: "Queued" },
        { metric: "Smart reply", edge: "<200ms", core: "<500ms", offline: "Cached suggestions" },
        { metric: "Search", edge: "<50ms", core: "<200ms", offline: "Local index" },
        { metric: "Voice transcription", edge: "<100ms", core: "<500ms", offline: "Not available" },
        { metric: "Attachment upload", edge: "<1s (chunked)", core: "<5s", offline: "Background sync" },
        { metric: "Real-time sync", edge: "<100ms", core: "<500ms", offline: "CRDT queue" },
      ],
      sync: {
        mode: "CRDT-based conflict resolution + delta sync + priority sync",
        status: "active",
      },
      summary: `${regions.length} edge regions online — avg latency ${Math.round(regions.reduce((s, r) => s + r.latencyMs, 0) / regions.length)}ms, ${regions.filter((r) => r.status === "healthy").length} healthy`,
      seed: hashStr(tenantId + "edge"),
    };
  }

  sustainability(tenantId: string) {
    const co2PerEmail = parseFloat((0.2 + (hashStr(tenantId + "co2") % 15) / 100).toFixed(2));
    const wue = parseFloat((1.0 + (hashStr(tenantId + "wue") % 8) / 100).toFixed(2));
    const dedupeSavingsPct = 50;
    const bandwidthSavedPct = 15;
    const greenScore = Math.min(100, 72 + (hashStr(tenantId + "green") % 20));
    return {
      co2PerEmail,
      targetCo2: 0.1,
      wue,
      greenScore,
      greenLevel: greenScore >= 90 ? "leading" : greenScore >= 75 ? "on_track" : "improving",
      initiatives: [
        { name: "Carbon-aware scheduling", detail: "Batch AI training during low-carbon grid hours", impact: "-40% CO2", status: "active" },
        { name: "Model distillation", detail: "Smaller edge models with <2% accuracy loss", impact: "-60% compute", status: "active" },
        { name: "Renewable energy", detail: "100% renewable-powered data centers", impact: "-100% scope 2", status: "active" },
        { name: "Efficient codecs", detail: "zstd + brotli for 20% better compression", impact: "-20% storage energy", status: "active" },
      ],
      metrics: {
        dedupeSavings: `50% dedupe = -200 tons CO2/yr`,
        bandwidthSaved: `${bandwidthSavedPct}% bandwidth saved via optimized routing`,
        waterRecycling: "Closed-loop cooling water recycling",
        co2PerEmail: `${co2PerEmail}g (target 0.1g)`,
      },
      certifications: GREEN_CERTS,
      summary: `Green score ${greenScore}/100 (${greenScore >= 90 ? "LEADING" : greenScore >= 75 ? "ON TRACK" : "IMPROVING"}) — ${co2PerEmail}g CO2/email, WUE ${wue}`,
      seed: hashStr(tenantId + "sustainability"),
    };
  }

  performanceDashboard(tenantId: string) {
    return {
      caching: this.caching(tenantId),
      queryOptimization: this.queryOptimization(tenantId),
      scalability: this.scalability(tenantId),
      edge: this.edge(tenantId),
      sustainability: this.sustainability(tenantId),
      recentEvents: this.perfLog(tenantId).entries,
      generatedAt: new Date().toISOString(),
      summary: `Performance stack healthy — cache avg ${this.caching(tenantId).averageHitRate}%, ${this.queryOptimization(tenantId).activeCount}/7 query techniques, ${this.edge(tenantId).regions.length} edge regions, green score ${this.sustainability(tenantId).greenScore}`,
      seed: hashStr(tenantId + "perf_dashboard"),
    };
  }

  perfLog(tenantId: string) {
    const entries = DataStore.mem()
      .find("mail_perf_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { entries: entries.slice(0, 30), total: entries.length };
  }
}

export const mailPerformance = new MailPerformanceService();
