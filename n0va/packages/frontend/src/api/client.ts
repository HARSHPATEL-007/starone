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
    shapley: (data?: Record<string, unknown>) =>
      request<any>("/attribution/shapley", { method: "POST", body: JSON.stringify(data || {}) }),
    markov: (data?: Record<string, unknown>) =>
      request<any>("/attribution/markov", { method: "POST", body: JSON.stringify(data || {}) }),
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
  predictiveForecasting: {
    forecast: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/forecast", { method: "POST", body: JSON.stringify(data) }),
    budget: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/budget", { method: "POST", body: JSON.stringify(data) }),
    conversions: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/conversions", { method: "POST", body: JSON.stringify(data) }),
  },
  abTestStatistics: {
    test: (data: Record<string, unknown>) =>
      request<any>("/ab-test-statistics/test", { method: "POST", body: JSON.stringify(data) }),
    sampleSize: (data: Record<string, unknown>) =>
      request<any>("/ab-test-statistics/sample-size", { method: "POST", body: JSON.stringify(data) }),
    estimateDuration: (data: Record<string, unknown>) =>
      request<any>("/ab-test-statistics/estimate-duration", { method: "POST", body: JSON.stringify(data) }),
  },
  anomalyDetection: {
    detect: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/detect", { method: "POST", body: JSON.stringify(data) }),
    scanCampaign: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/scan-campaign", { method: "POST", body: JSON.stringify(data) }),
  },
  portfolioBudgetOptimizer: {
    allocate: (data: Record<string, unknown>) =>
      request<any>("/portfolio-budget-optimizer/allocate", { method: "POST", body: JSON.stringify(data) }),
    efficientFrontier: (data: Record<string, unknown>) =>
      request<any>("/portfolio-budget-optimizer/efficient-frontier", { method: "POST", body: JSON.stringify(data) }),
  },
  campaignSaturation: {
    analyze: (campaignId: string) => request<any>(`/campaign-saturation/${campaignId}`),
    analyzeAll: () => request<any>("/campaign-saturation"),
  },
  oauth: {
    configs: () => request<any[]>("/oauth/configs"),
    authorize: (platform: string, redirectUri: string) =>
      request<{ authUrl: string; state: string; platform: string }>("/oauth/authorize", { method: "POST", body: JSON.stringify({ platform, redirectUri }) }),
    status: () => request<{ platforms: { platform: string; connected: boolean; active: boolean; label: string | null; expiresAt: string | null; accountId: string | null }[]; totalConnected: number }>("/oauth/status"),
    refresh: (platform: string) => request<any>(`/oauth/refresh/${platform}`, { method: "POST" }),
  },
  n0va1o: {
    dashboard: () => request<any>("/n0va1o/orchestrate/dashboard"),
    provisionJIT: (platform: string, scopes: string[]) =>
      request<any>("/n0va1o/orchestrate/jit", { method: "POST", body: JSON.stringify({ platform, scopes }) }),
    activeSessions: () => request<any>("/n0va1o/orchestrate/jit/sessions"),
    createSandbox: (script: string, runtime: string) =>
      request<any>("/n0va1o/orchestrate/sandbox", { method: "POST", body: JSON.stringify({ script, runtime }) }),
    intents: (platform: string) => request<any>(`/n0va1o/orchestrate/intents/${platform}`),
    resolveIntent: (intent: string, tenantPlatforms: string[]) =>
      request<any>("/n0va1o/orchestrate/intents/resolve", { method: "POST", body: JSON.stringify({ intent, tenantPlatforms }) }),
    registerWebhook: (source: string, eventType: string, callbackUrl: string) =>
      request<any>("/n0va1o/orchestrate/webhooks", { method: "POST", body: JSON.stringify({ source, eventType, callbackUrl }) }),
    webhooks: () => request<any>("/n0va1o/orchestrate/webhooks"),
    catalog: () => request<any>("/n0va1o/orchestrate/catalog"),
  },
  marketingIntelligence: {
    attributionDashboard: (model?: string) =>
      request<any>(`/marketing-intelligence/attribution/dashboard${model ? `?model=${model}` : ""}`),
    createAttributionPath: (data: Record<string, unknown>) =>
      request<any>("/marketing-intelligence/attribution/path", { method: "POST", body: JSON.stringify(data) }),
    attributionModels: () => request<any>("/marketing-intelligence/attribution/models"),
    incrementalityTest: (campaignId: string, testDays?: number) =>
      request<any>("/marketing-intelligence/attribution/incrementality", { method: "POST", body: JSON.stringify({ campaignId, testDays: testDays || 30 }) }),
    channelCredits: (model?: string) =>
      request<any>(`/marketing-intelligence/attribution/channels${model ? `?model=${model}` : ""}`),
    predictROAS: (platform: string, recentROAS?: number) =>
      request<any>("/marketing-intelligence/budget/predict", { method: "POST", body: JSON.stringify({ platform, recentROAS }) }),
    optimizeBudget: (platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number, urgency?: string) =>
      request<any>("/marketing-intelligence/budget/optimize", { method: "POST", body: JSON.stringify({ platforms, totalBudget, urgency }) }),
    spendPacing: (dailyBudgets: Record<string, number>) =>
      request<any>("/marketing-intelligence/budget/pacing", { method: "POST", body: JSON.stringify({ dailyBudgets }) }),
    budgetAdvice: (platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number) =>
      request<any>("/marketing-intelligence/budget/advice", { method: "POST", body: JSON.stringify({ platforms, totalBudget }) }),
    budgetForecast: (platforms: string[], totalBudget: number, days: number) =>
      request<any>("/marketing-intelligence/budget/forecast", { method: "POST", body: JSON.stringify({ platforms, totalBudget, days }) }),
  },
  agentIntelligence: {
    definitions: () => request<any[]>("/agent-intelligence/agents/definitions"),
    definition: (type: string) => request<any>(`/agent-intelligence/agents/definitions/${type}`),
    schedules: () => request<any[]>("/agent-intelligence/agents/schedules"),
    status: () => request<any[]>("/agent-intelligence/agents/status"),
    compliance: () => request<any[]>("/agent-intelligence/agents/compliance"),
    agentDashboard: () => request<any>("/agent-intelligence/agents/dashboard"),
    crossModuleMatrix: (action?: string) =>
      request<any>(`/agent-intelligence/cross-module/matrix${action ? `?action=${action}` : ""}`),
    executeCrossModule: (sourceAction: string, sourceEntity: string) =>
      request<any>("/agent-intelligence/cross-module/execute", { method: "POST", body: JSON.stringify({ sourceAction, sourceEntity }) }),
    crossModuleHistory: () => request<any[]>("/agent-intelligence/cross-module/history"),
    crossModuleDashboard: () => request<any>("/agent-intelligence/cross-module/dashboard"),
    crossModuleSummary: (action: string) => request<any>(`/agent-intelligence/cross-module/summarize/${action}`),
    securityModifiers: () => request<any[]>("/agent-intelligence/security/modifiers"),
    validateAction: (action: string, params: Record<string, unknown>) =>
      request<any>("/agent-intelligence/security/validate", { method: "POST", body: JSON.stringify({ action, params }) }),
    createInterrogation: (actionId: string, actionDescription: string, value: number, threshold: number) =>
      request<any>("/agent-intelligence/security/interrogate", { method: "POST", body: JSON.stringify({ actionId, actionDescription, value, threshold }) }),
    resolveInterrogation: (id: string, approved: boolean, signature: string) =>
      request<any>(`/agent-intelligence/security/interrogate/${id}/resolve`, { method: "POST", body: JSON.stringify({ approved, signature }) }),
    pendingInterrogations: () => request<any[]>("/agent-intelligence/security/interrogate/pending"),
  },
  predictiveBidding: {
    config: () => request<any>("/predictive-bidding/config"),
    recommend: (state: Record<string, unknown>, campaignId?: string) =>
      request<any>("/predictive-bidding/recommend", { method: "POST", body: JSON.stringify({ state, campaignId }) }),
    reward: (campaignId: string, state: Record<string, unknown>, actionIndex: number, reward: number) =>
      request<any>("/predictive-bidding/reward", { method: "POST", body: JSON.stringify({ campaignId, state, actionIndex, reward }) }),
    simulate: (campaignId: string, initialState: Record<string, unknown>, steps?: number) =>
      request<any>("/predictive-bidding/simulate", { method: "POST", body: JSON.stringify({ campaignId, initialState, steps }) }),
    qtable: (campaignId: string) => request<any>(`/predictive-bidding/qtable/${campaignId}`),
    history: (campaignId: string) => request<any>(`/predictive-bidding/history/${campaignId}`),
    sampleState: (platformId?: string) =>
      request<any>("/predictive-bidding/sample-state", { method: "POST", body: JSON.stringify({ platformId }) }),
  },
  clv: {
    predict: (customer: Record<string, unknown>, forecastPeriodDays?: number) =>
      request<any>("/clv/predict", { method: "POST", body: JSON.stringify({ customer, forecastPeriodDays }) }),
    batchPredict: (customers: Record<string, unknown>[], forecastPeriodDays?: number) =>
      request<any>("/clv/batch-predict", { method: "POST", body: JSON.stringify({ customers, forecastPeriodDays }) }),
    cohortAnalysis: (customers: Record<string, unknown>[]) =>
      request<any>("/clv/cohort-analysis", { method: "POST", body: JSON.stringify({ customers }) }),
    segment: (customers: Record<string, unknown>[]) =>
      request<any>("/clv/segment", { method: "POST", body: JSON.stringify({ customers }) }),
    sampleCustomers: (count?: number) => request<any>(`/clv/sample-customers?count=${count || 20}`),
  },
  nlp: {
    sentiment: (text: string) =>
      request<any>("/nlp/sentiment", { method: "POST", body: JSON.stringify({ text }) }),
    keywords: (text: string) =>
      request<any>("/nlp/keywords", { method: "POST", body: JSON.stringify({ text }) }),
    readability: (text: string) =>
      request<any>("/nlp/readability", { method: "POST", body: JSON.stringify({ text }) }),
    tone: (text: string) =>
      request<any>("/nlp/tone", { method: "POST", body: JSON.stringify({ text }) }),
    optimize: (text: string) =>
      request<any>("/nlp/optimize", { method: "POST", body: JSON.stringify({ text }) }),
  },
  marketingMixModel: {
    run: (channels: string[], historicalData: Record<string, unknown>[], adstockParams?: Record<string, unknown>, saturationParams?: Record<string, unknown>) =>
      request<any>("/marketing-mix-model/run", { method: "POST", body: JSON.stringify({ channels, historicalData, adstockParams, saturationParams }) }),
    scenario: (mmmResult: Record<string, unknown>, scenario: Record<string, unknown>, baseSpend: Record<string, number>) =>
      request<any>("/marketing-mix-model/scenario", { method: "POST", body: JSON.stringify({ mmmResult, scenario, baseSpend }) }),
    sampleData: () => request<any>("/marketing-mix-model/sample-data"),
  },
  campaignSimulation: {
    simulate: (channels: Record<string, unknown>[], scenario: Record<string, unknown>, trials?: number, seed?: number) =>
      request<any>("/campaign-simulation/simulate", { method: "POST", body: JSON.stringify({ channels, scenario, trials, seed }) }),
    multiScenario: (channels: Record<string, unknown>[], scenarios: Record<string, unknown>[], trials?: number) =>
      request<any>("/campaign-simulation/multi-scenario", { method: "POST", body: JSON.stringify({ channels, scenarios, trials }) }),
    sampleChannels: () => request<any>("/campaign-simulation/sample-channels"),
    sampleScenarios: () => request<any>("/campaign-simulation/sample-scenarios"),
  },
  realTimeBidding: {
    evaluateBid: (bidReq: Record<string, unknown>, targetCPA: number) =>
      request<any>("/real-time-bidding/evaluate-bid", { method: "POST", body: JSON.stringify({ request: bidReq, targetCPA }) }),
    recordResult: (result: Record<string, unknown>) =>
      request<any>("/real-time-bidding/record-result", { method: "POST", body: JSON.stringify({ result }) }),
    simulateAuction: (bids: { bidderId: string; bidAmount: number }[], secondPrice?: boolean) =>
      request<any>("/real-time-bidding/simulate-auction", { method: "POST", body: JSON.stringify({ bids, secondPrice }) }),
    publisherScore: (publisherId: string) => request<any>(`/real-time-bidding/publisher-score/${publisherId}`),
    winRateModel: () => request<any>("/real-time-bidding/win-rate-model"),
    sampleRequest: () => request<any>("/real-time-bidding/sample-request"),
  },
  creativeAI: {
    mabSelect: (variants: string[]) =>
      request<any>("/creative-ai/enhanced/mab/select", { method: "POST", body: JSON.stringify({ variants }) }),
    mabRecord: (variantKey: string, converted: boolean) =>
      request<any>("/creative-ai/enhanced/mab/record", { method: "POST", body: JSON.stringify({ variantKey, converted }) }),
    mabVariants: () => request<any>("/creative-ai/enhanced/mab/variants"),
    detectFatigue: (creativeHistory: Record<string, unknown>[]) =>
      request<any>("/creative-ai/enhanced/fatigue", { method: "POST", body: JSON.stringify({ creativeHistory }) }),
    simulateABTest: (variants: Record<string, unknown>[], visitorsPerDay?: number, days?: number) =>
      request<any>("/creative-ai/enhanced/ab-test-simulate", { method: "POST", body: JSON.stringify({ variants, visitorsPerDay, days }) }),
  },
  audienceInsights: {
    pca: (data: number[][], nComponents?: number) =>
      request<any>("/audience-insights/enhanced/pca", { method: "POST", body: JSON.stringify({ data, nComponents }) }),
    gmm: (data: number[][], k?: number) =>
      request<any>("/audience-insights/enhanced/gmm", { method: "POST", body: JSON.stringify({ data, k }) }),
    rfm: (customers: Record<string, unknown>[]) =>
      request<any>("/audience-insights/enhanced/rfm", { method: "POST", body: JSON.stringify({ customers }) }),
    lookalike: (seedAudience: Record<string, unknown>[], candidatePool: Record<string, unknown>[], targetSize?: number) =>
      request<any>("/audience-insights/enhanced/lookalike", { method: "POST", body: JSON.stringify({ seedAudience, candidatePool, targetSize }) }),
  },
  adCopyPersonalization: {
    scoreElement: (element: Record<string, unknown>, userContext: Record<string, unknown>) =>
      request<any>("/ad-copy-personalization/score-element", { method: "POST", body: JSON.stringify({ element, userContext }) }),
    personalize: (elements: Record<string, unknown>[], userContext: Record<string, unknown>) =>
      request<any>("/ad-copy-personalization/personalize", { method: "POST", body: JSON.stringify({ elements, userContext }) }),
    mvt: (variants: Record<string, unknown>[], totalVisitors?: number) =>
      request<any>("/ad-copy-personalization/mvt", { method: "POST", body: JSON.stringify({ variants, totalVisitors }) }),
    sampleElements: () => request<any>("/ad-copy-personalization/sample-elements"),
    sampleUser: () => request<any>("/ad-copy-personalization/sample-user"),
    sampleMVTVariants: () => request<any>("/ad-copy-personalization/sample-mvt-variants"),
  },
  predictiveForecastingEnhanced: {
    decompose: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/enhanced/decompose", { method: "POST", body: JSON.stringify(data) }),
    changepoints: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/enhanced/changepoints", { method: "POST", body: JSON.stringify(data) }),
    arima: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/enhanced/arima", { method: "POST", body: JSON.stringify(data) }),
    ensemble: (data: Record<string, unknown>) =>
      request<any>("/predictive-forecasting/enhanced/ensemble", { method: "POST", body: JSON.stringify(data) }),
  },
  incrementalityTesting: {
    did: (data: Record<string, unknown>) =>
      request<any>("/incrementality-testing/did", { method: "POST", body: JSON.stringify(data) }),
    syntheticControl: (data: Record<string, unknown>) =>
      request<any>("/incrementality-testing/synthetic-control", { method: "POST", body: JSON.stringify(data) }),
    cuped: (data: Record<string, unknown>) =>
      request<any>("/incrementality-testing/cuped", { method: "POST", body: JSON.stringify(data) }),
    powerAnalysis: (data: Record<string, unknown>) =>
      request<any>("/incrementality-testing/power-analysis", { method: "POST", body: JSON.stringify(data) }),
    geoExperiment: (data: Record<string, unknown>) =>
      request<any>("/incrementality-testing/geo-experiment", { method: "POST", body: JSON.stringify(data) }),
    sampleData: (regions?: string, days?: number, treatment?: string) =>
      request<any>(`/incrementality-testing/sample-data${regions ? `?regions=${regions}` : ""}${days ? `${regions ? "&" : "?"}days=${days}` : ""}${treatment ? `${(regions || days) ? "&" : "?"}treatment=${treatment}` : ""}`),
  },
  searchIntelligence: {
    cluster: (data: Record<string, unknown>) =>
      request<any>("/search-intelligence/cluster", { method: "POST", body: JSON.stringify(data) }),
    qualityScore: (data: Record<string, unknown>) =>
      request<any>("/search-intelligence/quality-score", { method: "POST", body: JSON.stringify(data) }),
    auctionInsights: (data: Record<string, unknown>) =>
      request<any>("/search-intelligence/auction-insights", { method: "POST", body: JSON.stringify(data) }),
    bidRecommendation: (data: Record<string, unknown>) =>
      request<any>("/search-intelligence/bid-recommendation", { method: "POST", body: JSON.stringify(data) }),
    tfidf: (data: Record<string, unknown>) =>
      request<any>("/search-intelligence/tfidf", { method: "POST", body: JSON.stringify(data) }),
    sampleKeywords: () => request<any>("/search-intelligence/sample-keywords"),
    sampleCompetitors: (keyword?: string) =>
      request<any>(`/search-intelligence/sample-competitors${keyword ? `?keyword=${keyword}` : ""}`),
    sampleQualityHistory: () => request<any>("/search-intelligence/sample-quality-history"),
  },
  anomalyDetectionEnhanced: {
    detect: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/enhanced/detect", { method: "POST", body: JSON.stringify(data) }),
    multivariate: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/enhanced/multivariate", { method: "POST", body: JSON.stringify(data) }),
    drift: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/enhanced/drift", { method: "POST", body: JSON.stringify(data) }),
    scanCampaign: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/enhanced/scan-campaign", { method: "POST", body: JSON.stringify(data) }),
    ensemble: (data: Record<string, unknown>) =>
      request<any>("/anomaly-detection/enhanced/ensemble", { method: "POST", body: JSON.stringify(data) }),
  },
  campaignHealth: {
    healthScore: (metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/health-score", { method: "POST", body: JSON.stringify({ metrics }) }),
    riskFactors: (metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/risk-factors", { method: "POST", body: JSON.stringify({ metrics }) }),
    earlyWarning: (metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/early-warning", { method: "POST", body: JSON.stringify({ metrics }) }),
    survivalAnalysis: (metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/survival-analysis", { method: "POST", body: JSON.stringify({ metrics }) }),
    report: (campaignId: string, metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/report", { method: "POST", body: JSON.stringify({ campaignId, metrics }) }),
    sampleMetrics: (days?: number) => request<any>(`/campaign-health-predictor/sample-metrics?days=${days || 30}`),
  },
  dsAlgorithms: {
    trie: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/trie", { method: "POST", body: JSON.stringify(data) }),
    fenwick: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/fenwick", { method: "POST", body: JSON.stringify(data) }),
    segmentTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/segment-tree", { method: "POST", body: JSON.stringify(data) }),
    unionFind: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/union-find", { method: "POST", body: JSON.stringify(data) }),
    bloomFilter: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/bloom-filter", { method: "POST", body: JSON.stringify(data) }),
    minHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/min-heap", { method: "POST", body: JSON.stringify(data) }),
    lruCache: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/lru-cache", { method: "POST", body: JSON.stringify(data) }),
    sort: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/sort", { method: "POST", body: JSON.stringify(data) }),
    quickSelect: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/quick-select", { method: "POST", body: JSON.stringify(data) }),
    binarySearch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/binary-search", { method: "POST", body: JSON.stringify(data) }),
    ternarySearch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ternary-search", { method: "POST", body: JSON.stringify(data) }),
    bfs: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/bfs", { method: "POST", body: JSON.stringify(data) }),
    dfs: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/dfs", { method: "POST", body: JSON.stringify(data) }),
    dijkstra: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/dijkstra", { method: "POST", body: JSON.stringify(data) }),
    topologicalSort: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/topological-sort", { method: "POST", body: JSON.stringify(data) }),
    detectCycle: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/detect-cycle", { method: "POST", body: JSON.stringify(data) }),
    kmp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/kmp", { method: "POST", body: JSON.stringify(data) }),
    rabinKarp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/rabin-karp", { method: "POST", body: JSON.stringify(data) }),
    levenshtein: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/levenshtein", { method: "POST", body: JSON.stringify(data) }),
    zAlgorithm: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/z-algorithm", { method: "POST", body: JSON.stringify(data) }),
    knapSack: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/knapsack", { method: "POST", body: JSON.stringify(data) }),
    lcs: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/lcs", { method: "POST", body: JSON.stringify(data) }),
    lis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/lis", { method: "POST", body: JSON.stringify(data) }),
    coinChange: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/coin-change", { method: "POST", body: JSON.stringify(data) }),
    maxSubarray: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/max-subarray", { method: "POST", body: JSON.stringify(data) }),
    convexHull: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/convex-hull", { method: "POST", body: JSON.stringify(data) }),
    kClosest: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/k-closest", { method: "POST", body: JSON.stringify(data) }),
    avl: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/avl", { method: "POST", body: JSON.stringify(data) }),
    dequeSlidingWindow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deque-sliding-window", { method: "POST", body: JSON.stringify(data) }),
    sparseTable: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/sparse-table", { method: "POST", body: JSON.stringify(data) }),
    countingBloom: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/counting-bloom", { method: "POST", body: JSON.stringify(data) }),
    pqDecreaseKey: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/pq-decrease-key", { method: "POST", body: JSON.stringify(data) }),
    rollbackDsu: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/rollback-dsu", { method: "POST", body: JSON.stringify(data) }),
    bellmanFord: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/bellman-ford", { method: "POST", body: JSON.stringify(data) }),
    floydWarshall: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/floyd-warshall", { method: "POST", body: JSON.stringify(data) }),
    kruskalMst: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/kruskal-mst", { method: "POST", body: JSON.stringify(data) }),
    maxFlow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/max-flow", { method: "POST", body: JSON.stringify(data) }),
    aStar: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/a-star", { method: "POST", body: JSON.stringify(data) }),
    tarjanScc: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/tarjan-scc", { method: "POST", body: JSON.stringify(data) }),
    manacher: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/manacher", { method: "POST", body: JSON.stringify(data) }),
    suffixArray: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/suffix-array", { method: "POST", body: JSON.stringify(data) }),
    matrixChain: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/matrix-chain", { method: "POST", body: JSON.stringify(data) }),
    editDistanceFull: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/edit-distance-full", { method: "POST", body: JSON.stringify(data) }),
    pidPacing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/pid-pacing", { method: "POST", body: JSON.stringify(data) }),
    shapley: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/shapley", { method: "POST", body: JSON.stringify(data) }),
    minCostFlow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/min-cost-flow", { method: "POST", body: JSON.stringify(data) }),
    frequencyCap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/frequency-cap", { method: "POST", body: JSON.stringify(data) }),
    jaccardOverlap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/jaccard-overlap", { method: "POST", body: JSON.stringify(data) }),
    cosineLookalike: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/cosine-lookalike", { method: "POST", body: JSON.stringify(data) }),
    expSmoothing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/exp-smoothing", { method: "POST", body: JSON.stringify(data) }),
    trieEnhanced: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/trie-enhanced", { method: "POST", body: JSON.stringify(data) }),
    segmentTreeLazy: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/segment-tree-lazy", { method: "POST", body: JSON.stringify(data) }),
    fenwick2D: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/fenwick-2d", { method: "POST", body: JSON.stringify(data) }),
    biDijkstra: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/bi-dijkstra", { method: "POST", body: JSON.stringify(data) }),

    // Depth 3 - Deeper Data Structures
    skipList: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/skip-list", { method: "POST", body: JSON.stringify(data) }),
    redBlackTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/red-black-tree", { method: "POST", body: JSON.stringify(data) }),
    intervalTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/interval-tree", { method: "POST", body: JSON.stringify(data) }),
    treap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/treap", { method: "POST", body: JSON.stringify(data) }),
    fibonacciHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/fibonacci-heap", { method: "POST", body: JSON.stringify(data) }),
    radixTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/radix-tree", { method: "POST", body: JSON.stringify(data) }),

    // Depth 3 - Deeper Algorithms
    dinicMaxFlow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/dinic-max-flow", { method: "POST", body: JSON.stringify(data) }),
    hungarian: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/hungarian", { method: "POST", body: JSON.stringify(data) }),
    hopcroftKarp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/hopcroft-karp", { method: "POST", body: JSON.stringify(data) }),
    johnsons: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/johnsons", { method: "POST", body: JSON.stringify(data) }),
    medianOfMedians: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/median-of-medians", { method: "POST", body: JSON.stringify(data) }),
    hpFilter: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/hp-filter", { method: "POST", body: JSON.stringify(data) }),

    // Depth 3 - String / DP
    longestCommonSubstring: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/longest-common-substring", { method: "POST", body: JSON.stringify(data) }),
    jaroWinkler: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/jaro-winkler", { method: "POST", body: JSON.stringify(data) }),
    hammingDistance: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/hamming-distance", { method: "POST", body: JSON.stringify(data) }),
    palindromePartitioning: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/palindrome-partitioning", { method: "POST", body: JSON.stringify(data) }),
    eggDrop: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/egg-drop", { method: "POST", body: JSON.stringify(data) }),
    tsp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/tsp", { method: "POST", body: JSON.stringify(data) }),

    // Depth 3 - Enhanced Existing
    medianHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/median-heap", { method: "POST", body: JSON.stringify(data) }),
    trieWildcard: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/trie-wildcard", { method: "POST", body: JSON.stringify(data) }),
    fenwickRangeUpdate: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/fenwick-range-update", { method: "POST", body: JSON.stringify(data) }),
    segmentTreeAdvanced: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/segment-tree-advanced", { method: "POST", body: JSON.stringify(data) }),
    bloomFilterUnion: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/bloom-filter-union", { method: "POST", body: JSON.stringify(data) }),
    lfuCache: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/lfu-cache", { method: "POST", body: JSON.stringify(data) }),

    // Depth 3 - Marketing Depth
    vcgPayments: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/vcg", { method: "POST", body: JSON.stringify(data) }),
    markovChain: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/markov-chain", { method: "POST", body: JSON.stringify(data) }),
    bangBangPacing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/bang-bang", { method: "POST", body: JSON.stringify(data) }),
    pageRankAudience: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/page-rank", { method: "POST", body: JSON.stringify(data) }),
    submodularMaximization: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/submodular", { method: "POST", body: JSON.stringify(data) }),
    adSequencing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/ad-sequence", { method: "POST", body: JSON.stringify(data) }),
    optimalStopping: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/optimal-stopping", { method: "POST", body: JSON.stringify(data) }),
    littleLaw: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/little-law", { method: "POST", body: JSON.stringify(data) }),
    thompsonSampling: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/thompson-sampling", { method: "POST", body: JSON.stringify(data) }),
    differentialPrivacy: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/differential-privacy", { method: "POST", body: JSON.stringify(data) }),

    // Depth 4 - Advanced Data Structures
    bTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/b-tree", { method: "POST", body: JSON.stringify(data) }),
    kdTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/kd-tree", { method: "POST", body: JSON.stringify(data) }),
    quadTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/quad-tree", { method: "POST", body: JSON.stringify(data) }),
    cartesianTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/cartesian-tree", { method: "POST", body: JSON.stringify(data) }),
    bitArray: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/bit-array", { method: "POST", body: JSON.stringify(data) }),

    // Depth 4 - Advanced Algorithms
    stoerWagner: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/stoer-wagner", { method: "POST", body: JSON.stringify(data) }),
    galeShapley: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/gale-shapley", { method: "POST", body: JSON.stringify(data) }),
    pushRelabel: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/push-relabel", { method: "POST", body: JSON.stringify(data) }),
    simulatedAnnealing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/simulated-annealing", { method: "POST", body: JSON.stringify(data) }),
    beamSearch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/beam-search", { method: "POST", body: JSON.stringify(data) }),
    eulerianPath: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/eulerian-path", { method: "POST", body: JSON.stringify(data) }),
    chinesePostman: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/chinese-postman", { method: "POST", body: JSON.stringify(data) }),

    // Depth 4 - String / DP
    ahoCorasick: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/aho-corasick", { method: "POST", body: JSON.stringify(data) }),
    bwt: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/bwt", { method: "POST", body: JSON.stringify(data) }),
    needlemanWunsch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/needleman-wunsch", { method: "POST", body: JSON.stringify(data) }),
    minWindow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/min-window", { method: "POST", body: JSON.stringify(data) }),
    longestPalindromicSubseq: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/lps", { method: "POST", body: JSON.stringify(data) }),
    balloonBurst: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/balloon-burst", { method: "POST", body: JSON.stringify(data) }),
    wildcardMatch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/wildcard-match", { method: "POST", body: JSON.stringify(data) }),

    // Depth 4 - Enhanced Existing
    persistentSegmentTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/persistent-segment-tree", { method: "POST", body: JSON.stringify(data) }),
    minMaxHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/min-max-heap", { method: "POST", body: JSON.stringify(data) }),
    orderStatisticTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/order-statistic-tree", { method: "POST", body: JSON.stringify(data) }),
    concurrentLRU: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/concurrent-lru", { method: "POST", body: JSON.stringify(data) }),
    ropeString: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/rope-string", { method: "POST", body: JSON.stringify(data) }),

    // Depth 4 - Marketing Depth
    multiTouchAttribution: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/multi-touch", { method: "POST", body: JSON.stringify(data) }),
    budgetSmoothing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/budget-smoothing", { method: "POST", body: JSON.stringify(data) }),
    adFatigue: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/ad-fatigue", { method: "POST", body: JSON.stringify(data) }),
    churnHeuristic: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/churn-heuristic", { method: "POST", body: JSON.stringify(data) }),
    chiSquare: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/chi-square", { method: "POST", body: JSON.stringify(data) }),
    bidLandscape: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/bid-landscape", { method: "POST", body: JSON.stringify(data) }),
    incrementality: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/incrementality", { method: "POST", body: JSON.stringify(data) }),
    clvCalculation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/clv", { method: "POST", body: JSON.stringify(data) }),
    reachFrequency: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/reach-frequency", { method: "POST", body: JSON.stringify(data) }),
    marketingMixModel: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/mmm", { method: "POST", body: JSON.stringify(data) }),

    // Depth 5 - Advanced DS
    sparseTableRMQ: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/sparse-table-rmq", { method: "POST", body: JSON.stringify(data) }),
    xorLinkedList: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/xor-linked-list", { method: "POST", body: JSON.stringify(data) }),
    bit2d: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/bit-2d", { method: "POST", body: JSON.stringify(data) }),
    cartesianTreeBuild: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/cartesian-tree-build", { method: "POST", body: JSON.stringify(data) }),
    dsu: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/dsu", { method: "POST", body: JSON.stringify(data) }),
    treapImplicit: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/treap-implicit", { method: "POST", body: JSON.stringify(data) }),

    // Depth 5 - Advanced Algorithms
    minCostMaxFlow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/min-cost-max-flow", { method: "POST", body: JSON.stringify(data) }),
    bronKerbosch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/bron-kerbosch", { method: "POST", body: JSON.stringify(data) }),
    mstCalc: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/mst", { method: "POST", body: JSON.stringify(data) }),
    kosaraju: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/kosaraju", { method: "POST", body: JSON.stringify(data) }),
    articulationPts: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/articulation-points", { method: "POST", body: JSON.stringify(data) }),
    bipartiteMatch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/bipartite-matching", { method: "POST", body: JSON.stringify(data) }),

    // Depth 5 - String / DP
    manacherAlgo: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/manacher-algo", { method: "POST", body: JSON.stringify(data) }),
    zAlgo: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/z-algo", { method: "POST", body: JSON.stringify(data) }),
    levenshteinDist: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/levenshtein-path", { method: "POST", body: JSON.stringify(data) }),
    longestIS: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/lis-path", { method: "POST", body: JSON.stringify(data) }),
    tspBitmask: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/tsp-bitmask", { method: "POST", body: JSON.stringify(data) }),
    regexMatch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/regex-match", { method: "POST", body: JSON.stringify(data) }),
    damerauLevenshtein: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/damerau-lev", { method: "POST", body: JSON.stringify(data) }),

    // Depth 5 - Enhanced Existing
    lruCacheOps: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/lru-cache-ops", { method: "POST", body: JSON.stringify(data) }),
    bloomFilterAdvanced: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/bloom-filter-advanced", { method: "POST", body: JSON.stringify(data) }),
    segTreeLazy: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/segment-tree-lazy", { method: "POST", body: JSON.stringify(data) }),
    deque: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/deque-ops", { method: "POST", body: JSON.stringify(data) }),
    priorityQueue: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/priority-queue", { method: "POST", body: JSON.stringify(data) }),
    hashMap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/hash-map", { method: "POST", body: JSON.stringify(data) }),
    circularBuffer: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/circular-buffer", { method: "POST", body: JSON.stringify(data) }),

    // Depth 5 - Marketing Depth
    exp3Bandit: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/exp3", { method: "POST", body: JSON.stringify(data) }),
    thompsonGaussian: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/thompson-gaussian", { method: "POST", body: JSON.stringify(data) }),
    kaplanMeier: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/kaplan-meier", { method: "POST", body: JSON.stringify(data) }),
    upliftModeling: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/uplift", { method: "POST", body: JSON.stringify(data) }),
    causalDml: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/causal-dml", { method: "POST", body: JSON.stringify(data) }),
    optimalTransport: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/optimal-transport", { method: "POST", body: JSON.stringify(data) }),
    shapleyAttribution: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/shapley-attr", { method: "POST", body: JSON.stringify(data) }),
    brierScore: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/brier-score", { method: "POST", body: JSON.stringify(data) }),
    funnelAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/funnel-analysis", { method: "POST", body: JSON.stringify(data) }),
    responseSurface: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/response-surface", { method: "POST", body: JSON.stringify(data) }),

    // Depth 6 - Advanced DS
    sqrtDecomposition: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/sqrt-decomposition", { method: "POST", body: JSON.stringify(data) }),
    waveletTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/wavelet-tree", { method: "POST", body: JSON.stringify(data) }),
    dancingLinks: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/dancing-links", { method: "POST", body: JSON.stringify(data) }),
    linkCutTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/link-cut-tree", { method: "POST", body: JSON.stringify(data) }),
    vanEmdeBoas: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/van-emde-boas", { method: "POST", body: JSON.stringify(data) }),
    pairingHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/pairing-heap", { method: "POST", body: JSON.stringify(data) }),
    intervalMapStabbing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/interval-map-stabbing", { method: "POST", body: JSON.stringify(data) }),

    // Depth 6 - Advanced Algorithms
    blossomMatching: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/blossom", { method: "POST", body: JSON.stringify(data) }),
    gomoryHuTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/gomory-hu", { method: "POST", body: JSON.stringify(data) }),
    fftMultiply: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/fft", { method: "POST", body: JSON.stringify(data) }),
    kargerMinCut: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/karger", { method: "POST", body: JSON.stringify(data) }),
    nQueens: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/n-queens", { method: "POST", body: JSON.stringify(data) }),
    majorityElement: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/majority-element", { method: "POST", body: JSON.stringify(data) }),

    // Depth 6 - String / DP
    suffixAutomaton: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/suffix-automaton", { method: "POST", body: JSON.stringify(data) }),
    lyndonFactorization: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/lyndon", { method: "POST", body: JSON.stringify(data) }),
    runLengthEncoding: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/rle", { method: "POST", body: JSON.stringify(data) }),
    soundexPhonetic: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/soundex", { method: "POST", body: JSON.stringify(data) }),
    dpRodCutting: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/rod-cutting", { method: "POST", body: JSON.stringify(data) }),
    dpOptimalBST: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/optimal-bst", { method: "POST", body: JSON.stringify(data) }),

    // Depth 6 - Enhanced Existing
    multiSetBag: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/multi-set-bag", { method: "POST", body: JSON.stringify(data) }),
    fenwickRangePoint: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/fenwick-range-point", { method: "POST", body: JSON.stringify(data) }),
    unionBySize: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/union-by-size", { method: "POST", body: JSON.stringify(data) }),
    binaryTrieXor: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/binary-trie-xor", { method: "POST", body: JSON.stringify(data) }),

    // Depth 6 - Marketing Depth
    holtWinters: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/holt-winters", { method: "POST", body: JSON.stringify(data) }),
    garchVolatility: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/garch", { method: "POST", body: JSON.stringify(data) }),
    bayesianAB: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/bayesian-ab", { method: "POST", body: JSON.stringify(data) }),
    confidenceInterval: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/confidence-interval", { method: "POST", body: JSON.stringify(data) }),
    tTest: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/t-test", { method: "POST", body: JSON.stringify(data) }),
    monteCarloCLV: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/monte-carlo-clv", { method: "POST", body: JSON.stringify(data) }),
    adstock: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/adstock", { method: "POST", body: JSON.stringify(data) }),
    efficientFrontier: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/efficient-frontier", { method: "POST", body: JSON.stringify(data) }),
    mediaSaturation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/media-saturation", { method: "POST", body: JSON.stringify(data) }),
    timeDecayAttr: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/time-decay-attr", { method: "POST", body: JSON.stringify(data) }),

    // Depth 7 - Advanced DS
    cuckooFilter: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/cuckoo-filter", { method: "POST", body: JSON.stringify(data) }),
    suffixTreeSim: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/suffix-tree-sim", { method: "POST", body: JSON.stringify(data) }),
    rTreeSpatial: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/r-tree", { method: "POST", body: JSON.stringify(data) }),
    persistentArray: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/persistent-array", { method: "POST", body: JSON.stringify(data) }),
    minMaxStack: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/min-max-stack", { method: "POST", body: JSON.stringify(data) }),
    dAryHeap: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/d-ary-heap", { method: "POST", body: JSON.stringify(data) }),
    intervalTreeDynamic: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/interval-tree-dynamic", { method: "POST", body: JSON.stringify(data) }),

    // Depth 7 - Advanced Algorithms
    longestPathDag: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/longest-path-dag", { method: "POST", body: JSON.stringify(data) }),
    graphColoring: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/graph-coloring", { method: "POST", body: JSON.stringify(data) }),
    vertexCover: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/vertex-cover", { method: "POST", body: JSON.stringify(data) }),
    hamiltonianPath: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/hamiltonian-path", { method: "POST", body: JSON.stringify(data) }),
    baumWelch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/baum-welch", { method: "POST", body: JSON.stringify(data) }),
    fordFulkerson: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/ford-fulkerson", { method: "POST", body: JSON.stringify(data) }),

    // Depth 7 - String / DP
    kmp2d: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/kmp-2d", { method: "POST", body: JSON.stringify(data) }),
    longestRepeatedSubstring: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/longest-repeated", { method: "POST", body: JSON.stringify(data) }),
    textJustify: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/text-justify", { method: "POST", body: JSON.stringify(data) }),
    affineEdit: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/affine-edit", { method: "POST", body: JSON.stringify(data) }),
    boxStacking: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/box-stacking", { method: "POST", body: JSON.stringify(data) }),
    longestChain: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/longest-chain", { method: "POST", body: JSON.stringify(data) }),
    maxSumRectangle: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/max-sum-rectangle", { method: "POST", body: JSON.stringify(data) }),

    // Depth 7 - Enhanced Existing
    segmentTreePersistent: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/segment-tree-persistent", { method: "POST", body: JSON.stringify(data) }),
    dsuPersistent: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/dsu-persistent", { method: "POST", body: JSON.stringify(data) }),
    scalableBloom: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/scalable-bloom", { method: "POST", body: JSON.stringify(data) }),
    lfuAdvanced: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/lfu-advanced", { method: "POST", body: JSON.stringify(data) }),
    treapOrderStats: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/treap-order-stats", { method: "POST", body: JSON.stringify(data) }),

    // Depth 7 - Marketing Depth
    doublyRobust: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/doubly-robust", { method: "POST", body: JSON.stringify(data) }),
    linucbBandit: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/linucb", { method: "POST", body: JSON.stringify(data) }),
    bidShading: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/bid-shading", { method: "POST", body: JSON.stringify(data) }),
    markovComplete: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/markov-complete", { method: "POST", body: JSON.stringify(data) }),
    roasPortfolio: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/roas-portfolio", { method: "POST", body: JSON.stringify(data) }),
    causalImpact: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/causal-impact", { method: "POST", body: JSON.stringify(data) }),
    multiPeriodBudget: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/multi-period-budget", { method: "POST", body: JSON.stringify(data) }),
    lookalikeEnsemble: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/lookalike-ensemble", { method: "POST", body: JSON.stringify(data) }),
    churnLogistic: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/churn-logistic", { method: "POST", body: JSON.stringify(data) }),
    keywordPortfolio: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/keyword-portfolio", { method: "POST", body: JSON.stringify(data) }),
  },

  autonomousCampaignManager: {
    analyze: (campaignId: string) => request<any>(`/autonomous-campaign-manager/analyze/${campaignId}`),
    portfolio: () => request<any>("/autonomous-campaign-manager/portfolio"),
    optimize: (campaignId: string) => request<any>(`/autonomous-campaign-manager/optimize/${campaignId}`, { method: "POST" }),
    autoAdjustBudget: (campaignId: string) => request<any>("/autonomous-campaign-manager/auto-adjust-budget", { method: "POST", body: JSON.stringify({ campaignId }) }),
    autoAdjustBids: (campaignId: string) => request<any>("/autonomous-campaign-manager/auto-adjust-bids", { method: "POST", body: JSON.stringify({ campaignId }) }),
    scheduleChange: (campaignId: string, type: string, action: string, rationale: string) =>
      request<any>("/autonomous-campaign-manager/schedule-change", { method: "POST", body: JSON.stringify({ campaignId, type, action, rationale }) }),
    scheduledChanges: (campaignId?: string) =>
      request<any>(`/autonomous-campaign-manager/scheduled-changes${campaignId ? `?campaignId=${campaignId}` : ""}`),
    executeScheduled: (campaignId?: string) =>
      request<any>("/autonomous-campaign-manager/execute-scheduled", { method: "POST", body: JSON.stringify({ campaignId }) }),
    anomalies: (campaignId: string) => request<any>(`/autonomous-campaign-manager/anomalies/${campaignId}`),
    executiveReport: () => request<any>("/autonomous-campaign-manager/executive-report"),
    forecast: (campaignId: string, days?: number) =>
      request<any>(`/autonomous-campaign-manager/forecast/${campaignId}${days ? `?days=${days}` : ""}`),
    budgetAllocation: () => request<any>("/autonomous-campaign-manager/budget-allocation"),
    pacingTargets: () => request<any>("/autonomous-campaign-manager/pacing-targets"),
    scheduleOptimization: (campaignId: string) => request<any>(`/autonomous-campaign-manager/schedule-optimization/${campaignId}`),
    abTestRecommendation: (campaignId: string) => request<any>(`/autonomous-campaign-manager/ab-test-recommendation/${campaignId}`),
    competitiveLandscape: (campaignId: string) => request<any>(`/autonomous-campaign-manager/competitive-landscape/${campaignId}`),
    actionItems: () => request<any>("/autonomous-campaign-manager/action-items"),
    simulate: (campaignId: string, scenario: string, adjustments: Record<string, unknown>) =>
      request<any>(`/autonomous-campaign-manager/simulate/${campaignId}`, { method: "POST", body: JSON.stringify({ scenario, adjustments }) }),
    healthTrend: (campaignId: string) => request<any>(`/autonomous-campaign-manager/health-trend/${campaignId}`),
    autoPause: () => request<any>("/autonomous-campaign-manager/auto-pause", { method: "POST" }),
    weeklyReport: (weekStart?: string) =>
      request<any>(`/autonomous-campaign-manager/weekly-report${weekStart ? `?weekStart=${weekStart}` : ""}`),
    actionItemsList: () => request<any>("/autonomous-campaign-manager/action-items/list"),
    actionItemsClear: () => request<any>("/autonomous-campaign-manager/action-items/clear", { method: "POST" }),
  },

  unifiedAdsPipeline: {
    initialize: (campaignId: string) => request<any>("/unified-ads-pipeline/initialize", { method: "POST", body: JSON.stringify({ campaignId }) }),
    get: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}`),
    list: (campaignId?: string) => request<any>(`/unified-ads-pipeline${campaignId ? `?campaignId=${campaignId}` : ""}`),
    advance: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/advance`, { method: "POST" }),
    configure: (pipelineId: string, config: Record<string, unknown>) =>
      request<any>(`/unified-ads-pipeline/${pipelineId}/configure`, { method: "POST", body: JSON.stringify({ config }) }),
    activate: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/activate`, { method: "POST" }),
    monitor: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/monitor`),
    optimize: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/optimize`, { method: "POST" }),
    report: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/report`),
    timeline: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/timeline`),
    archive: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/archive`, { method: "POST" }),
    health: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/health`),
    validate: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/validate`),
    rollback: (pipelineId: string) => request<any>(`/unified-ads-pipeline/${pipelineId}/rollback`, { method: "POST" }),
  },
};
