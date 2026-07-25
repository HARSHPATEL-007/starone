const API_BASE = "/api/v1";

function getToken(): string | null {
  return localStorage.getItem("n0va_token");
}

function getTenantId(): string {
  try {
    const user = localStorage.getItem("n0va_user");
    if (user) return JSON.parse(user).tenantId || "tenant_001";
  } catch {}
  return "tenant_001";
}

async function requestFormData<T>(path: string, fd: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-tenant-id": getTenantId(),
  };
  const response = await fetch(url, { method: "POST", headers, body: fd });
  if (response.status === 401) {
    localStorage.removeItem("n0va_token");
    localStorage.removeItem("n0va_user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-tenant-id": getTenantId(),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("n0va_token");
    localStorage.removeItem("n0va_user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  campaigns: {
    list: (params?: string) => request<any>(`/campaigns${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/campaigns/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/campaigns/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    updateBudget: (id: string, budget: { daily: number; lifetime: number }) =>
      request<any>(`/campaigns/${id}/budget`, { method: "PATCH", body: JSON.stringify(budget) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    clone: (id: string) =>
      request<any>(`/campaigns/${id}/clone`, { method: "POST" }),
    delete: (id: string) => request<void>(`/campaigns/${id}`, { method: "DELETE" }),
    dashboard: () => request<any>("/campaigns/dashboard"),
    bulk: (data: Record<string, unknown>) =>
      request<any>("/campaigns/bulk", { method: "POST", body: JSON.stringify(data) }),
    metricsTimeseries: (days = "30") => request<any>(`/campaigns/metrics/timeseries?days=${days}`),
  },
  agents: {
    list: () => request<any[]>("/agents"),
    get: (id: string) => request<any>(`/agents/${id}`),
    defaults: () => request<any[]>("/agents/defaults"),
    create: (data: Record<string, unknown>) =>
      request<any>("/agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/agents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    recordRun: (id: string, data: Record<string, unknown>) =>
      request<any>(`/agents/${id}/record-run`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: "DELETE" }),
  },
  platforms: {
    list: () => request<any[]>("/platforms"),
    get: (id: string) => request<any>(`/platforms/${id}`),
    connected: () => request<any[]>("/platforms/connected"),
    connect: (data: Record<string, unknown>) =>
      request<any>("/platforms/connect", { method: "POST", body: JSON.stringify(data) }),
    execute: (data: Record<string, unknown>) =>
      request<any>("/platforms/execute", { method: "POST", body: JSON.stringify(data) }),
    disconnect: (id: string) =>
      request<void>(`/platforms/connected/${id}`, { method: "DELETE" }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/platforms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    health: () => request<any>("/platforms/health"),
  },
  creatives: {
    list: (params?: string) => request<any[]>(`/creatives${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/creatives/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/creatives", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/creatives/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/creatives/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/creatives/${id}`, { method: "DELETE" }),
  },
  audiences: {
    list: (params?: string) => request<any[]>(`/audiences${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/audiences/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/audiences", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/audiences/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/audiences/${id}`, { method: "DELETE" }),
  },
  analytics: {
    overview: (days = "30") => request<any>(`/analytics/overview?days=${days}`),
    campaign: (id: string, days = "30") => request<any>(`/analytics/campaign/${id}?days=${days}`),
    crossPlatform: (days = "30") => request<any>(`/analytics/cross-platform?days=${days}`),
    overlap: () => request<any>("/analytics/audience/overlap"),
  },
  recipes: {
    list: () => request<any[]>("/recipes"),
    get: (id: string) => request<any>(`/recipes/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/recipes", { method: "POST", body: JSON.stringify(data) }),
    compile: (id: string) =>
      request<any>(`/recipes/${id}/compile`, { method: "POST" }),
    execute: (id: string) =>
      request<any>(`/recipes/${id}/execute`, { method: "POST" }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/recipes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/recipes/${id}`, { method: "DELETE" }),
  },
  attribution: {
    models: () => request<any>("/attribution/models"),
    analyze: (data: Record<string, unknown>) =>
      request<any>("/attribution/analyze", { method: "POST", body: JSON.stringify(data) }),
    compare: () => request<any>("/attribution/compare", { method: "POST" }),
    savePath: (data: Record<string, unknown>) =>
      request<any>("/attribution/paths", { method: "POST", body: JSON.stringify(data) }),
    getPaths: () => request<any[]>("/attribution/paths"),
    getReports: () => request<any[]>("/attribution/reports"),
  },
  fraud: {
    health: () => request<any>("/fraud/health"),
    evaluate: (data: Record<string, unknown>) =>
      request<any>("/fraud/evaluate", { method: "POST", body: JSON.stringify(data) }),
    flags: (campaignId: string) => request<any[]>(`/fraud/flags/${campaignId}`),
    resolveFlag: (flagId: string) =>
      request<any>(`/fraud/flags/${flagId}/resolve`, { method: "POST" }),
    sample: (campaignId?: string) =>
      request<any>("/fraud/sample", { method: "POST", body: JSON.stringify({ campaignId: campaignId || "" }) }),
    simulate: () => request<any>("/fraud/simulate", { method: "POST" }),
  },
  optimizer: {
    budget: (data?: Record<string, unknown>) =>
      request<any>("/optimizer/budget", { method: "POST", body: JSON.stringify(data || {}) }),
    budgetMock: () => request<any>("/optimizer/budget/mock"),
    budgetHistory: () => request<any[]>("/optimizer/budget/history"),
    creativeFatigue: (data?: Record<string, unknown>) =>
      request<any>("/optimizer/creative/fatigue", { method: "POST", body: JSON.stringify(data || {}) }),
    creativeMock: () => request<any>("/optimizer/creative/mock"),
    abTest: (type = "creative") => request<any>(`/optimizer/ab-test/${type}`),
    listABTests: () => request<any[]>("/optimizer/ab-test"),
    createABTest: (data: Record<string, unknown>) =>
      request<any>("/optimizer/ab-test", { method: "POST", body: JSON.stringify(data) }),
    updateABTest: (id: string, data: Record<string, unknown>) =>
      request<any>(`/optimizer/ab-test/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  hypercontext: {
    tasks: {
      list: () => request<any[]>("/hypercontext/tasks"),
      get: (id: string) => request<any>(`/hypercontext/tasks/${id}`),
      create: (data: Record<string, unknown>) =>
        request<any>("/hypercontext/tasks", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<any>(`/hypercontext/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/hypercontext/tasks/${id}`, { method: "DELETE" }),
    },
    docs: {
      list: () => request<any[]>("/hypercontext/docs"),
      get: (id: string) => request<any>(`/hypercontext/docs/${id}`),
      create: (data: Record<string, unknown>) =>
        request<any>("/hypercontext/docs", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<any>(`/hypercontext/docs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/hypercontext/docs/${id}`, { method: "DELETE" }),
    },
    sheets: {
      list: () => request<any[]>("/hypercontext/sheets"),
      get: (id: string) => request<any>(`/hypercontext/sheets/${id}`),
      create: (data: Record<string, unknown>) =>
        request<any>("/hypercontext/sheets", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<any>(`/hypercontext/sheets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/hypercontext/sheets/${id}`, { method: "DELETE" }),
    },
    calendar: {
      list: () => request<any[]>("/hypercontext/calendar"),
      get: (id: string) => request<any>(`/hypercontext/calendar/${id}`),
      create: (data: Record<string, unknown>) =>
        request<any>("/hypercontext/calendar", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<any>(`/hypercontext/calendar/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/hypercontext/calendar/${id}`, { method: "DELETE" }),
    },
  },
  notifications: {
    list: (params?: string) => request<any[]>(`/notifications${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/notifications/${id}`),
    unreadCount: () => request<{ count: number }>("/notifications/unread-count"),
    create: (data: Record<string, unknown>) =>
      request<any>("/notifications", { method: "POST", body: JSON.stringify(data) }),
    markRead: (id: string) =>
      request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      request<any>("/notifications/read-all", { method: "PATCH" }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/notifications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/notifications/${id}`, { method: "DELETE" }),
  },
  activity: {
    list: (params?: string) => request<any[]>(`/activity${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/activity", { method: "POST", body: JSON.stringify(data) }),
  },
  webhooks: {
    list: () => request<any[]>("/webhooks"),
    create: (data: Record<string, unknown>) =>
      request<any>("/webhooks", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/webhooks/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/webhooks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deliveries: (id: string) => request<any[]>(`/webhooks/${id}/deliveries`),
    delete: (id: string) => request<void>(`/webhooks/${id}`, { method: "DELETE" }),
    testEmit: (data: Record<string, unknown>) =>
      request<any>("/webhooks/test-emit", { method: "POST", body: JSON.stringify(data) }),
    sampleConfig: () => request<any>("/webhooks/sample/config"),
  },
  settings: {
    pricing: () => request<any>("/settings/pricing"),
    tenant: () => request<any>("/settings/tenant"),
    updateTenant: (data: Record<string, unknown>) =>
      request<any>("/settings/tenant", { method: "PUT", body: JSON.stringify(data) }),
    modules: () => request<any>("/settings/modules"),
  },
  entities: {
    list: (entityType: string, params?: string) =>
      request<any[]>(`/entities/${entityType}${params ? `?${params}` : ""}`),
    get: (entityType: string, id: string) =>
      request<any>(`/entities/${entityType}/${id}`),
    create: (entityType: string, data: Record<string, unknown>) =>
      request<any>(`/entities/${entityType}`, { method: "POST", body: JSON.stringify(data) }),
    update: (entityType: string, id: string, data: Record<string, unknown>) =>
      request<any>(`/entities/${entityType}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (entityType: string, id: string) =>
      request<void>(`/entities/${entityType}/${id}`, { method: "DELETE" }),
    deleteAll: (entityType: string) =>
      request<{ deleted: number }>(`/entities/${entityType}`, { method: "DELETE" }),
  },
  insights: {
    health: {
      all: () => request<any[]>("/insights/health"),
      get: (campaignId: string) => request<any>(`/insights/health/${campaignId}`),
      sample: () => request<any[]>("/insights/health/sample"),
    },
    leadScoring: {
      defaultModel: () => request<any>("/insights/lead-scoring/models/default"),
      evaluate: (model: any, lead: any) =>
        request<any>("/insights/lead-scoring/evaluate", { method: "POST", body: JSON.stringify({ model, lead }) }),
      sample: () => request<any>("/insights/lead-scoring/sample"),
    },
    roi: {
      calculate: (data: Record<string, unknown>) =>
        request<any>("/insights/roi/calculate", { method: "POST", body: JSON.stringify(data) }),
      compare: (scenarios: Record<string, unknown>[]) =>
        request<any>("/insights/roi/compare", { method: "POST", body: JSON.stringify({ scenarios }) }),
      sample: () => request<any[]>("/insights/roi/sample"),
    },
  },
  search: {
    global: (q: string) => request<{ entityType: string; _id: string; label: string; subtitle: string }[]>(`/search?q=${encodeURIComponent(q)}`),
  },
  team: {
    list: () => request<any[]>("/team"),
    create: (data: Record<string, unknown>) =>
      request<any>("/team", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/team/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/team/${id}`, { method: "DELETE" }),
  },
  comments: {
    list: (entityType: string, entityId: string) =>
      request<any[]>(`/comments/${entityType}/${entityId}`),
    create: (entityType: string, entityId: string, data: Record<string, unknown>) =>
      request<any>(`/comments/${entityType}/${entityId}`, { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/comments/${id}`, { method: "DELETE" }),
  },
  approvals: {
    list: (status?: string) =>
      request<any[]>(`/approvals${status ? `?status=${status}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/approvals", { method: "POST", body: JSON.stringify(data) }),
    act: (id: string, action: string) =>
      request<any>(`/approvals/${id}/${action}`, { method: "PATCH" }),
  },
  billing: {
    subscription: () => request<any>("/billing/subscription"),
    invoices: () => request<any[]>("/billing/invoices"),
    getInvoice: (id: string) => request<any>(`/billing/invoices/${id}`),
    updateSubscription: (data: Record<string, unknown>) =>
      request<any>("/billing/subscription", { method: "POST", body: JSON.stringify(data) }),
    createInvoice: (data: Record<string, unknown>) =>
      request<any>("/billing/invoices", { method: "POST", body: JSON.stringify(data) }),
  },
  scheduler: {
    list: () => request<any[]>("/scheduler"),
    get: (id: string) => request<any>(`/scheduler/${id}`),
    schedule: (data: { campaignId: string; type: string; executeAt: string; params?: Record<string, unknown> }) =>
      request<any>("/scheduler", { method: "POST", body: JSON.stringify(data) }),
    cancel: (id: string) => request<void>(`/scheduler/${id}`, { method: "DELETE" }),
  },
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>("/auth/login", {
        method: "POST", body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name: string) =>
      request<{ token: string; user: any }>("/auth/register", {
        method: "POST", body: JSON.stringify({ email, password, name }),
      }),
    verify: () => request<{ valid: boolean; userId: string; tenantId: string; role: string }>("/auth/verify"),
  },
  costTracker: {
    list: (params?: string) => request<any>(`/cost-tracker${params ? `?${params}` : ""}`),
    categories: () => request<any>("/cost-tracker/categories"),
    daily: () => request<any>("/cost-tracker/daily"),
  },
  funnel: {
    list: (params?: string) => request<any[]>(`/funnel${params ? `?${params}` : ""}`),
    summary: () => request<any>("/funnel/summary"),
  },
  goals: {
    list: (params?: string) => request<any[]>(`/goals${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/goals/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/goals/${id}`, { method: "DELETE" }),
  },
  keywords: {
    list: (params?: string) => request<any[]>(`/keywords${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/keywords", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/keywords/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/keywords/${id}`, { method: "DELETE" }),
    updateBid: (id: string, bid: number) =>
      request<any>(`/keywords/${id}/bid`, { method: "PATCH", body: JSON.stringify({ bid }) }),
  },
  landingPages: {
    list: (params?: string) => request<any[]>(`/landing-pages${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/landing-pages/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/landing-pages", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/landing-pages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/landing-pages/${id}`, { method: "DELETE" }),
  },
  segmentation: {
    list: (params?: string) => request<any[]>(`/segmentation${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/segmentation", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/segmentation/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/segmentation/${id}`, { method: "DELETE" }),
    analysis: (id: string) => request<any>(`/segmentation/${id}/analysis`),
  },
  utmBuilder: {
    list: (params?: string) => request<any[]>(`/utm-builder${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/utm-builder", { method: "POST", body: JSON.stringify(data) }),
    performance: () => request<any>("/utm-builder/performance"),
  },
  mediaKit: {
    list: () => request<any[]>("/media-kit"),
    create: (data: Record<string, unknown>) =>
      request<any>("/media-kit", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/media-kit/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  competitiveIntel: {
    list: (params?: string) => request<any[]>(`/competitive-intel${params ? `?${params}` : ""}`),
    summary: () => request<any>("/competitive-intel/summary"),
    create: (data: Record<string, unknown>) =>
      request<any>("/competitive-intel", { method: "POST", body: JSON.stringify(data) }),
  },
  contentLibrary: {
    list: (params?: string) => request<any[]>(`/content-library${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/content-library/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/content-library", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/content-library/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/content-library/${id}`, { method: "DELETE" }),
  },
  marketingForms: {
    list: (params?: string) => request<any[]>(`/marketing-forms${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/marketing-forms/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/marketing-forms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/marketing-forms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/marketing-forms/${id}`, { method: "DELETE" }),
    submissions: (id: string) => request<any[]>(`/marketing-forms/${id}/submissions`),
  },
  customerJourney: {
    list: (params?: string) => request<any[]>(`/customer-journey${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/customer-journey/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/customer-journey", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/customer-journey/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/customer-journey/${id}`, { method: "DELETE" }),
  },
  abTesting: {
    list: (params?: string) => request<any[]>(`/ab-testing${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/ab-testing/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/ab-testing", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/ab-testing/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/ab-testing/${id}`, { method: "DELETE" }),
    end: (id: string) => request<any>(`/ab-testing/${id}/end`, { method: "POST" }),
    significance: (params: string) => request<any>(`/ab-testing/significance?${params}`),
  },
  comparison: {
    list: (ids: string[]) => request<any>(`/comparison?ids=${ids.join(",")}`),
    dimensions: () => request<any>("/comparison/dimensions"),
  },
  forecast: {
    get: (params?: string) => request<any>(`/forecast${params ? `?${params}` : ""}`),
    scenario: (data: Record<string, unknown>) =>
      request<any>("/forecast/scenario", { method: "POST", body: JSON.stringify(data) }),
  },
  health: {
    list: () => request<any[]>("/health"),
    get: (id: string) => request<any>(`/health/${id}`),
    trends: () => request<any>("/health/trends"),
  },
  channelPerformance: {
    list: () => request<any>("/channel-performance"),
  },
  automationRules: {
    list: (params?: string) => request<any[]>(`/automation-rules${params ? `?${params}` : ""}`),
    get: (id: string) => request<any>(`/automation-rules/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/automation-rules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/automation-rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/automation-rules/${id}`, { method: "DELETE" }),
    evaluate: (id: string) => request<any>(`/automation-rules/${id}/evaluate`, { method: "POST" }),
    evaluateAll: () => request<any[]>("/automation-rules/evaluate-all", { method: "POST" }),
    executions: () => request<any[]>("/automation-rules/executions"),
    toggle: (id: string) => request<any>(`/automation-rules/${id}/toggle`, { method: "POST" }),
  },
  templates: {
    list: () => request<any[]>("/templates"),
    get: (id: string) => request<any>(`/templates/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/templates/${id}`, { method: "DELETE" }),
    apply: (id: string, data: Record<string, unknown>) =>
      request<any>(`/templates/${id}/apply`, { method: "POST", body: JSON.stringify(data) }),
    stats: () => request<any>("/templates/stats"),
  },
  approvalsNew: {
    list: (params?: string) => request<any[]>(`/approvals${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/approvals", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/approvals/${id}`),
    act: (id: string, action: string, comment?: string, approver?: string) =>
      request<any>(`/approvals/${id}/act`, { method: "PATCH", body: JSON.stringify({ action, comment, approver }) }),
    pendingCount: () => request<{ count: number }>("/approvals/pending-count"),
    history: () => request<any[]>("/approvals/history"),
  },
  creativeAI: {
    generate: (data: Record<string, unknown>) =>
      request<any>("/creative-ai/generate", { method: "POST", body: JSON.stringify(data) }),
    headlines: (data: Record<string, unknown>) =>
      request<any>("/creative-ai/headlines", { method: "POST", body: JSON.stringify(data) }),
    body: (data: Record<string, unknown>) =>
      request<any>("/creative-ai/body", { method: "POST", body: JSON.stringify(data) }),
    suggestTone: (data: Record<string, unknown>) =>
      request<any>("/creative-ai/suggest-tone", { method: "POST", body: JSON.stringify(data) }),
    expand: (data: Record<string, unknown>) =>
      request<any>("/creative-ai/expand", { method: "POST", body: JSON.stringify(data) }),
  },
  snapshots: {
    capture: (data: Record<string, unknown>) =>
      request<any>("/snapshots/capture", { method: "POST", body: JSON.stringify(data) }),
    compare: (id1: string, id2: string) => request<any>(`/snapshots/compare?id1=${id1}&id2=${id2}`),
    timeline: (campaignId: string) => request<any[]>(`/snapshots/timeline/${campaignId}`),
    autoCapture: () => request<any>("/snapshots/auto-capture", { method: "POST" }),
    delete: (id: string) => request<void>(`/snapshots/${id}`, { method: "DELETE" }),
  },
  reports: {
    generate: (data: Record<string, unknown>) =>
      request<any>("/reports/generate", { method: "POST", body: JSON.stringify(data) }),
    list: () => request<any[]>("/reports"),
    get: (id: string) => request<any>(`/reports/${id}`),
    schedule: (id: string, data: Record<string, unknown>) =>
      request<any>(`/reports/${id}/schedule`, { method: "POST", body: JSON.stringify(data) }),
    schedules: () => request<any[]>("/reports/schedules"),
    cancelSchedule: (id: string) => request<void>(`/reports/schedules/${id}`, { method: "DELETE" }),
    export: (id: string) => request<any>(`/reports/${id}/export`, { method: "POST", body: JSON.stringify({ format: "json" }) }),
  },
  notificationPreferences: {
    get: () => request<any>("/notification-preferences"),
    save: (data: Record<string, unknown>) =>
      request<any>("/notification-preferences", { method: "PUT", body: JSON.stringify(data) }),
    defaults: () => request<any>("/notification-preferences/defaults"),
  },
  bulkImport: {
    import: (data: Record<string, unknown>) =>
      request<any>("/bulk-import", { method: "POST", body: JSON.stringify(data) }),
    validate: (data: Record<string, unknown>) =>
      request<any>("/bulk-import/validate", { method: "POST", body: JSON.stringify(data) }),
    template: (entityType: string) => request<any>(`/bulk-import/templates/${entityType}`),
  },
  upload: {
    single: (file: File, entityType?: string, entityId?: string) => {
      const fd = new FormData();
      fd.append("file", file);
      if (entityType) fd.append("entityType", entityType);
      if (entityId) fd.append("entityId", entityId);
      return requestFormData<any>("/upload", fd);
    },
    multiple: (files: File[], entityType?: string, entityId?: string) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (entityType) fd.append("entityType", entityType);
      if (entityId) fd.append("entityId", entityId);
      return requestFormData<any>("/upload/multiple", fd);
    },
    list: (entityType?: string) =>
      request<any[]>(`/upload${entityType ? `?entityType=${entityType}` : ""}`),
    get: (id: string) => request<any>(`/upload/${id}`),
    delete: (id: string) => request<void>(`/upload/${id}`, { method: "DELETE" }),
  },
  users: {
    me: () => request<any>("/users/me"),
    updateProfile: (data: Record<string, unknown>) =>
      request<any>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<any>("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  },
  recommendations: {
    list: () => request<any[]>("/recommendations"),
    crossCampaign: () => request<any[]>("/recommendations/cross-campaign"),
    campaign: (id: string) => request<any[]>(`/recommendations/campaign/${id}`),
    all: () => request<{ recommendations: any[]; crossCampaign: any[]; total: number }>("/recommendations/all"),
  },
  delivery: {
    send: (data: Record<string, unknown>) =>
      request<any>("/delivery/send", { method: "POST", body: JSON.stringify(data) }),
    retry: (id: string) => request<any>(`/delivery/retry/${id}`, { method: "POST" }),
    list: (params?: string) => request<any[]>(`/delivery${params ? `?${params}` : ""}`),
    stats: () => request<{ total: number; byChannel: Record<string, number>; byStatus: Record<string, number>; successRate: number }>("/delivery/stats"),
    get: (id: string) => request<any>(`/delivery/${id}`),
  },
  annotations: {
    list: (campaignId: string) => request<any[]>(`/annotations/campaign/${campaignId}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/annotations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/annotations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/annotations/${id}`, { method: "DELETE" }),
  },
  pacing: {
    list: () => request<any[]>("/pacing"),
    summary: () => request<{ results: any[]; summary: any }>("/pacing/summary"),
    campaign: (id: string) => request<any>(`/pacing/campaign/${id}`),
  },
  creativeVersions: {
    list: (creativeId: string) => request<any[]>(`/creative-versions/${creativeId}`),
    create: (creativeId: string, data: Record<string, unknown>) =>
      request<any>(`/creative-versions/${creativeId}`, { method: "POST", body: JSON.stringify(data) }),
    latest: (creativeId: string) => request<any>(`/creative-versions/${creativeId}/latest`),
    delete: (versionId: string) => request<void>(`/creative-versions/${versionId}`, { method: "DELETE" }),
  },
  summaries: {
    list: () => request<any[]>("/summaries"),
    portfolio: () => request<any>("/summaries/portfolio"),
    campaign: (id: string) => request<any>(`/summaries/campaign/${id}`),
  },
  exportData: {
    csv: (entityType: string, fields?: string[], filters?: Record<string, unknown>) => {
      const params = new URLSearchParams();
      const url = `/export-data`;
      return request<any>(url, {
        method: "POST",
        body: JSON.stringify({ entityType, fields, format: "csv", filters }),
      });
    },
    json: (entityType: string, fields?: string[], filters?: Record<string, unknown>) =>
      request<any>("/export-data", {
        method: "POST", body: JSON.stringify({ entityType, fields, format: "json", filters }),
      }),
    fields: (entityType: string) => request<{ entityType: string; fields: string[] }>(`/export-data/fields/${entityType}`),
  },
  shares: {
    create: (data: Record<string, unknown>) =>
      request<any>("/shares", { method: "POST", body: JSON.stringify(data) }),
    list: () => request<any[]>("/shares"),
    get: (id: string) => request<any>(`/shares/${id}`),
    delete: (id: string) => request<void>(`/shares/${id}`, { method: "DELETE" }),
    access: (token: string, password?: string) =>
      request<any>(`/shares/access/${token}${password ? `?password=${password}` : ""}`),
  },
  mentions: {
    create: (data: Record<string, unknown>) =>
      request<any>("/mentions", { method: "POST", body: JSON.stringify(data) }),
    list: (unreadOnly?: boolean) =>
      request<any[]>(`/mentions${unreadOnly ? "?unreadOnly=true" : ""}`),
    unreadCount: () => request<{ count: number }>("/mentions/unread-count"),
    markRead: (id: string) => request<any>(`/mentions/${id}/read`, { method: "PATCH" }),
    markAllRead: () => request<any>("/mentions/read-all", { method: "POST" }),
  },
  playbookExecution: {
    list: () => request<any[]>("/playbook-execution"),
    get: (id: string) => request<any>(`/playbook-execution/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/playbook-execution", { method: "POST", body: JSON.stringify(data) }),
    start: (id: string) => request<any>(`/playbook-execution/${id}/start`, { method: "POST" }),
    completeStep: (execId: string, stepId: string, result?: any) =>
      request<any>(`/playbook-execution/${execId}/steps/${stepId}/complete`, { method: "POST", body: JSON.stringify({ result }) }),
    failStep: (execId: string, stepId: string, error: string) =>
      request<any>(`/playbook-execution/${execId}/steps/${stepId}/fail`, { method: "POST", body: JSON.stringify({ error }) }),
    pause: (id: string) => request<any>(`/playbook-execution/${id}/pause`, { method: "POST" }),
    resume: (id: string) => request<any>(`/playbook-execution/${id}/resume`, { method: "POST" }),
    delete: (id: string) => request<void>(`/playbook-execution/${id}`, { method: "DELETE" }),
    templates: () => request<any[]>("/playbook-execution/templates"),
  },
  landingPageBuilder: {
    templates: () => request<any[]>("/landing-page-builder/templates"),
    list: () => request<any[]>("/landing-page-builder"),
    get: (id: string) => request<any>(`/landing-page-builder/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/landing-page-builder", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/landing-page-builder/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    publish: (id: string) => request<any>(`/landing-page-builder/${id}/publish`, { method: "POST" }),
    delete: (id: string) => request<void>(`/landing-page-builder/${id}`, { method: "DELETE" }),
  },
  influencers: {
    platforms: () => request<any[]>("/influencers/platforms"),
    search: (params?: string) => request<any[]>(`/influencers/search${params ? `?${params}` : ""}`),
    listCampaign: (campaignId?: string) =>
      request<any[]>(campaignId ? `/influencers/campaign/${campaignId}` : "/influencers/campaign-list"),
    addToCampaign: (data: Record<string, unknown>) =>
      request<any>("/influencers/campaign", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, data: Record<string, unknown>) =>
      request<any>(`/influencers/campaign/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  campaignIssues: {
    list: (campaignId?: string) =>
      request<any[]>(`/campaign-issues${campaignId ? `?campaignId=${campaignId}` : ""}`),
    stats: () => request<any>("/campaign-issues/stats"),
    create: (data: Record<string, unknown>) =>
      request<any>("/campaign-issues", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/campaign-issues/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/campaign-issues/${id}`, { method: "DELETE" }),
  },
  cdp: {
    stats: () => request<any>("/cdp/stats"),
    profiles: (search?: string, segment?: string) =>
      request<any[]>(`/cdp/profiles${search ? `?search=${search}` : ""}${segment ? `${search ? "&" : "?"}segment=${segment}` : ""}`),
    getProfile: (id: string) => request<any>(`/cdp/profiles/${id}`),
    updateProfile: (id: string, data: Record<string, unknown>) =>
      request<any>(`/cdp/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    events: (profileId?: string, type?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (profileId) params.set("profileId", profileId);
      if (type) params.set("type", type);
      if (limit) params.set("limit", String(limit));
      return request<any[]>(`/cdp/events?${params.toString()}`);
    },
    eventTypes: () => request<string[]>("/cdp/event-types"),
    eventTypeStats: () => request<any[]>("/cdp/event-type-stats"),
    trackEvent: (data: Record<string, unknown>) =>
      request<any>("/cdp/events", { method: "POST", body: JSON.stringify(data) }),
    segments: () => request<any[]>("/cdp/segments"),
    updateSegment: (id: string, data: Record<string, unknown>) =>
      request<any>(`/cdp/segments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteSegment: (id: string) => request<void>(`/cdp/segments/${id}`, { method: "DELETE" }),
  },
  workflowBuilder: {
    list: () => request<any[]>("/workflow-builder"),
    get: (id: string) => request<any>(`/workflow-builder/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/workflow-builder", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/workflow-builder/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/workflow-builder/${id}`, { method: "DELETE" }),
    activate: (id: string) => request<any>(`/workflow-builder/${id}/activate`, { method: "POST" }),
    deactivate: (id: string) => request<any>(`/workflow-builder/${id}/deactivate`, { method: "POST" }),
    testRun: (id: string) => request<any>(`/workflow-builder/${id}/test-run`, { method: "POST" }),
    executions: (id: string) => request<any[]>(`/workflow-builder/${id}/executions`),
    nodeTypes: () => request<any[]>("/workflow-builder/node-types"),
    categories: () => request<any[]>("/workflow-builder/categories"),
  },
  campaignScorecard: {
    get: (campaignId?: string) =>
      request<any>(`/campaign-scorecard${campaignId ? `?campaignId=${campaignId}` : ""}`),
  },
  admin: {
    stats: () => request<any>("/admin/stats"),
    tenants: () => request<any[]>("/admin/tenants"),
    getTenant: (id: string) => request<any>(`/admin/tenants/${id}`),
    updateTenant: (id: string, data: Record<string, unknown>) =>
      request<any>(`/admin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    features: () => request<string[]>("/admin/features"),
    auditLog: (limit?: number) => request<any[]>(`/admin/audit-log${limit ? `?limit=${limit}` : ""}`),
  },
  competitiveBenchmarking: {
    get: (industry?: string) =>
      request<any>(`/competitive-benchmarking${industry ? `?industry=${industry}` : ""}`),
    industries: () => request<any[]>("/competitive-benchmarking/industries"),
  },
  developerPortal: {
    keys: () => request<any[]>("/developer-portal/keys"),
    createKey: (data: Record<string, unknown>) =>
      request<any>("/developer-portal/keys", { method: "POST", body: JSON.stringify(data) }),
    revokeKey: (id: string) => request<any>(`/developer-portal/keys/${id}/revoke`, { method: "POST" }),
    deleteKey: (id: string) => request<void>(`/developer-portal/keys/${id}`, { method: "DELETE" }),
    scopes: () => request<any[]>("/developer-portal/scopes"),
    webhookLogs: () => request<any[]>("/developer-portal/webhook-logs"),
    usage: () => request<any>("/developer-portal/usage"),
  },
  audienceInsights: {
    insights: (audienceId?: string) =>
      request<any>(`/audience-insights/insights${audienceId ? `?audienceId=${audienceId}` : ""}`),
    lookalike: () => request<any>("/audience-insights/lookalike"),
  },
  reportBuilder: {
    list: () => request<any[]>("/report-builder/reports"),
    get: (id: string) => request<any>(`/report-builder/reports/${id}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/report-builder/reports", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/report-builder/reports/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/report-builder/reports/${id}`, { method: "DELETE" }),
    generate: (id: string) => request<any>(`/report-builder/reports/${id}/generate`, { method: "POST" }),
    schedule: (id: string, data: Record<string, unknown>) =>
      request<any>(`/report-builder/reports/${id}/schedule`, { method: "POST", body: JSON.stringify(data) }),
    unschedule: (id: string) => request<any>(`/report-builder/reports/${id}/unschedule`, { method: "POST" }),
    metrics: () => request<{ metrics: any[]; chartTypes: any[] }>("/report-builder/metrics"),
    defaultWidgets: () => request<any[]>("/report-builder/default-widgets"),
  },
  optimizerV2: {
    dashboard: () => request<{ suggestions: any[]; counts: { high: number; medium: number; low: number }; totalPotentialValue: number; totalOpen: number }>("/optimizer-v2/dashboard"),
    suggestions: () => request<any[]>("/optimizer-v2/suggestions"),
    applySuggestion: (id: string) => request<any>(`/optimizer-v2/suggestions/${id}/apply`, { method: "POST" }),
    dismissSuggestion: (id: string) => request<any>(`/optimizer-v2/suggestions/${id}/dismiss`, { method: "POST" }),
    platforms: () => request<any[]>("/optimizer-v2/platforms"),
    portfolio: () => request<any>("/optimizer-v2/portfolio", { method: "POST" }),
  },
  oauth: {
    configs: () => request<any[]>("/oauth/configs"),
    authorize: (platform: string, redirectUri: string) =>
      request<{ authUrl: string; state: string; platform: string }>("/oauth/authorize", { method: "POST", body: JSON.stringify({ platform, redirectUri }) }),
    status: () => request<{ platforms: { platform: string; connected: boolean; active: boolean; label: string | null; expiresAt: string | null; accountId: string | null }[]; totalConnected: number }>("/oauth/status"),
    refresh: (platform: string) => request<any>(`/oauth/refresh/${platform}`, { method: "POST" }),
  },
};
