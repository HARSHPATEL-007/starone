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
      statusQuickView: () => request<any>("/insights/health/status-quick-view"),
      alertDigest: () => request<any>("/insights/health/alert-digest"),
      batchResolveIssues: (campaignIds: string[], issueTypes: string[]) =>
        request<any>("/insights/health/batch-resolve-issues", { method: "POST", body: JSON.stringify({ campaignIds, issueTypes }) }),
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
  snapshots: {
    capture: (data: Record<string, unknown>) =>
      request<any>("/snapshots/capture", { method: "POST", body: JSON.stringify(data) }),
    compare: (id1: string, id2: string) => request<any>(`/snapshots/compare?id1=${id1}&id2=${id2}`),
    timeline: (campaignId: string) => request<any[]>(`/snapshots/timeline/${campaignId}`),
    autoCapture: () => request<any>("/snapshots/auto-capture", { method: "POST" }),
    trend: (snapshotId: string, campaignId: string) =>
      request<any>(`/snapshots/${snapshotId}/trend?campaignId=${campaignId}`),
    anomalies: (snapshotId: string, campaignId: string) =>
      request<any>(`/snapshots/${snapshotId}/anomalies?campaignId=${campaignId}`),
    forecast: (snapshotId: string, campaignId: string) =>
      request<any>(`/snapshots/${snapshotId}/forecast?campaignId=${campaignId}`),
    health: (snapshotId: string, campaignId: string) =>
      request<any>(`/snapshots/${snapshotId}/health?campaignId=${campaignId}`),
    metrics: (snapshotId: string) =>
      request<any>(`/snapshots/${snapshotId}/metrics`),
    changeSummary: (id1: string, id2: string) =>
      request<any>(`/snapshots/change-summary?id1=${id1}&id2=${id2}`),
    benchmark: (snapshotId: string) =>
      request<any>(`/snapshots/${snapshotId}/benchmark`),
    regressionReport: (id1: string, id2: string) =>
      request<any>(`/snapshots/regression-report?id1=${id1}&id2=${id2}`),
    export: (snapshotId: string) =>
      request<any>(`/snapshots/${snapshotId}/export`),
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
    snapshot: (id: string) => request<any>(`/summaries/campaign/${id}/snapshot`),
    budgetHealth: () => request<any>("/summaries/budget-health"),
    platformComparison: () => request<any>("/summaries/platform-comparison"),
    riskAssessment: () => request<any>("/summaries/risk-assessment"),
    optimizationPriorities: () => request<any>("/summaries/optimization-priorities"),
    historicalComparison: () => request<any>("/summaries/historical-comparison"),
    anomalyReport: () => request<any>("/summaries/anomaly-report"),
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
    batchUpdate: (issueIds: string[], updates: Record<string, unknown>) =>
      request<any>("/campaign-issues/batch-update", { method: "POST", body: JSON.stringify({ issueIds, updates }) }),
    priorityQueue: () => request<any>("/campaign-issues/priority-queue"),
    autoAssignment: () => request<any>("/campaign-issues/auto-assignment"),
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
    setWeights: (weights: Record<string, unknown>) =>
      request<any>("/campaign-scorecard/weights", { method: "POST", body: JSON.stringify(weights) }),
    trends: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/trends`),
    dimensions: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/dimensions`),
    anomalies: () =>
      request<any>("/campaign-scorecard/anomalies"),
    improvementPlan: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/improvement-plan`),
    peerComparison: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/peer-comparison`),
    benchmark: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/benchmark`),
    distribution: (campaignId?: string) =>
      request<any>(`/campaign-scorecard/distribution${campaignId ? `?campaignId=${campaignId}` : ""}`),
    factorImportance: () =>
      request<any>("/campaign-scorecard/factor-importance"),
    weightSimulation: (campaignId: string) =>
      request<any>(`/campaign-scorecard/${campaignId}/weight-simulation`),
    historical: (campaignId?: string) =>
      request<any>(`/campaign-scorecard/historical${campaignId ? `?campaignId=${campaignId}` : ""}`),
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
    pca: (data: number[][], nComponents?: number) =>
      request<any>("/audience-insights/enhanced/pca", { method: "POST", body: JSON.stringify({ data, nComponents }) }),
    gmm: (data: number[][], k?: number) =>
      request<any>("/audience-insights/enhanced/gmm", { method: "POST", body: JSON.stringify({ data, k }) }),
    rfm: (customers: Record<string, unknown>[]) =>
      request<any>("/audience-insights/enhanced/rfm", { method: "POST", body: JSON.stringify({ customers }) }),
    lookalike: (seedAudience: Record<string, unknown>[], candidatePool: Record<string, unknown>[], targetSize?: number) =>
      request<any>("/audience-insights/enhanced/lookalike", { method: "POST", body: JSON.stringify({ seedAudience, candidatePool, targetSize }) }),
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
    quickActions: () => request<any>("/optimizer-v2/quick-actions"),
    autoApply: (minConfidence?: number) => request<any>("/optimizer-v2/auto-apply", { method: "POST", body: JSON.stringify({ minConfidence }) }),
    dismissLowValue: (maxImpact?: string) => request<any>("/optimizer-v2/dismiss-low-value", { method: "POST", body: JSON.stringify({ maxImpact }) }),
    oneClickFix: () => request<any>("/optimizer-v2/one-click-fix"),
    portfolioSummary: () => request<any>("/optimizer-v2/portfolio-summary"),
    scheduleOptimization: (suggestionId: string, applyAt: string) => request<any>("/optimizer-v2/schedule", { method: "POST", body: JSON.stringify({ suggestionId, applyAt }) }),
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
    saturationForecast: (campaignId: string, periods?: number) =>
      request<any>(`/campaign-saturation/${campaignId}/forecast${periods ? `?periods=${periods}` : ""}`),
    saturationByChannel: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/saturation-by-channel`),
    saturationRecovery: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/recovery`),
    saturationBenchmark: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/benchmark`),
    saturationOptimizationSuggestions: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/optimization-suggestions`),
    creativeFatigueAnalysis: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/creative-fatigue`),
    fatiguePrediction: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/fatigue-prediction`),
    audienceSaturation: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/audience-saturation`),
    budgetReallocationSuggestions: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/budget-reallocation`),
    saturationTrends: (campaignId: string) =>
      request<any>(`/campaign-saturation/${campaignId}/trends`),
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
    sensitivity: (channel: Record<string, unknown>, seed?: number) =>
      request<any>("/campaign-simulation/sensitivity", { method: "POST", body: JSON.stringify({ channel, seed }) }),
    budgetOptimization: (channels: Record<string, unknown>[], totalBudget: number, seed?: number) =>
      request<any>("/campaign-simulation/budget-optimization", { method: "POST", body: JSON.stringify({ channels, totalBudget, seed }) }),
    riskAssessment: (channels: Record<string, unknown>[], scenarios: Record<string, unknown>[], seed?: number) =>
      request<any>("/campaign-simulation/risk-assessment", { method: "POST", body: JSON.stringify({ channels, scenarios, seed }) }),
    channelEfficiency: (channel: Record<string, unknown>, seed?: number) =>
      request<any>("/campaign-simulation/channel-efficiency", { method: "POST", body: JSON.stringify({ channel, seed }) }),
    monteCarloForecast: (channel: Record<string, unknown>, budget: number, trials?: number, seed?: number) =>
      request<any>("/campaign-simulation/monte-carlo-forecast", { method: "POST", body: JSON.stringify({ channel, budget, trials, seed }) }),
    budgetElasticity: (channel: Record<string, unknown>, seed?: number) =>
      request<any>("/campaign-simulation/budget-elasticity", { method: "POST", body: JSON.stringify({ channel, seed }) }),
    optimalChannelMix: (channels: Record<string, unknown>[], totalBudget: number, targetROAS: number, seed?: number) =>
      request<any>("/campaign-simulation/optimal-channel-mix", { method: "POST", body: JSON.stringify({ channels, totalBudget, targetROAS, seed }) }),
    simulationSummary: (channels: Record<string, unknown>[], scenarios: Record<string, unknown>[], seed?: number) =>
      request<any>("/campaign-simulation/simulation-summary", { method: "POST", body: JSON.stringify({ channels, scenarios, seed }) }),
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
    healthTrendForecast: (metrics: Record<string, unknown>[], days?: number) =>
      request<any>("/campaign-health-predictor/health-trend-forecast", { method: "POST", body: JSON.stringify({ metrics, days }) }),
    healthDimensionBreakdown: (campaignInputs: { campaignId: string; metrics: Record<string, unknown>[] }[]) =>
      request<any>("/campaign-health-predictor/health-dimension-breakdown", { method: "POST", body: JSON.stringify({ campaignInputs }) }),
    healthAnomalyDetection: (metrics: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/health-anomaly-detection", { method: "POST", body: JSON.stringify({ metrics }) }),
    healthImprovementPlan: (healthScore: Record<string, unknown>, riskFactors?: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/health-improvement-plan", { method: "POST", body: JSON.stringify({ healthScore, riskFactors }) }),
    healthPeerComparison: (campaignId: string, ownMetrics: Record<string, unknown>[], peerMetricsList?: { campaignId: string; metrics: Record<string, unknown>[] }[]) =>
      request<any>("/campaign-health-predictor/health-peer-comparison", { method: "POST", body: JSON.stringify({ campaignId, ownMetrics, peerMetricsList }) }),
    healthBenchmark: (metrics: Record<string, unknown>[], benchmarks?: Record<string, unknown>[]) =>
      request<any>("/campaign-health-predictor/health-benchmark", { method: "POST", body: JSON.stringify({ metrics, benchmarks }) }),
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
    // Depth 8: Advanced Data Structures
    hllCardinality: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/hll-cardinality", { method: "POST", body: JSON.stringify(data) }),
    countMinSketch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/count-min-sketch", { method: "POST", body: JSON.stringify(data) }),
    weightedBloomFilter: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/weighted-bloom", { method: "POST", body: JSON.stringify(data) }),
    segmentTreeBeats: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/segment-tree-beats", { method: "POST", body: JSON.stringify(data) }),
    lcaBinaryLifting: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/lca-binary-lifting", { method: "POST", body: JSON.stringify(data) }),
    dynamicLIS: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/dynamic-lis", { method: "POST", body: JSON.stringify(data) }),
    rangeModeQuery: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/range-mode", { method: "POST", body: JSON.stringify(data) }),
    // Depth 8: Advanced Algorithms
    kuhnMunkres: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/kuhn-munkres", { method: "POST", body: JSON.stringify(data) }),
    tabuSearch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/tabu-search", { method: "POST", body: JSON.stringify(data) }),
    iterativeDeepening: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/iterative-deepening", { method: "POST", body: JSON.stringify(data) }),
    geneticAlgorithm: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/genetic", { method: "POST", body: JSON.stringify(data) }),
    antColony: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/ant-colony", { method: "POST", body: JSON.stringify(data) }),
    edmondsKarp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/edmonds-karp", { method: "POST", body: JSON.stringify(data) }),
    twoSat: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/algo/2-sat", { method: "POST", body: JSON.stringify(data) }),
    // Depth 8: String / DP
    wordBreak: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/word-break", { method: "POST", body: JSON.stringify(data) }),
    interleavingString: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/interleaving-string", { method: "POST", body: JSON.stringify(data) }),
    palindromeQueries: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/palindrome-queries", { method: "POST", body: JSON.stringify(data) }),
    damLevDistance: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/damlev", { method: "POST", body: JSON.stringify(data) }),
    burstBalloon: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/burst-balloon", { method: "POST", body: JSON.stringify(data) }),
    booleanParenthesization: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/boolean-parenthesization", { method: "POST", body: JSON.stringify(data) }),
    countDistinctSubseq: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/distinct-subseq", { method: "POST", body: JSON.stringify(data) }),
    // Depth 8: Enhanced Existing
    treapSplitMerge: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/treap-split-merge", { method: "POST", body: JSON.stringify(data) }),
    dsuRollback: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/dsu-rollback", { method: "POST", body: JSON.stringify(data) }),
    rangeKthQuery: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/range-kth", { method: "POST", body: JSON.stringify(data) }),
    matrixMedian: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/matrix-median", { method: "POST", body: JSON.stringify(data) }),
    nextGreaterElement: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/nge", { method: "POST", body: JSON.stringify(data) }),
    maxSlidingWindow: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/max-sliding-window", { method: "POST", body: JSON.stringify(data) }),
    skylineProblem: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ds/skyline", { method: "POST", body: JSON.stringify(data) }),
    // Depth 8: Marketing Depth
    inverseProbabilityWeighting: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/ipw", { method: "POST", body: JSON.stringify(data) }),
    syntheticControl: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/synthetic-control", { method: "POST", body: JSON.stringify(data) }),
    survivalAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/survival-analysis", { method: "POST", body: JSON.stringify(data) }),
    propensityScoreMatching: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/propensity-score", { method: "POST", body: JSON.stringify(data) }),
    marketBasketAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/market-basket", { method: "POST", body: JSON.stringify(data) }),
    priceElasticity: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/price-elasticity", { method: "POST", body: JSON.stringify(data) }),
    cohortRetention: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/cohort-retention", { method: "POST", body: JSON.stringify(data) }),
    // Depth 9: Campaign Intelligence & Attribution
    campaignAttributionShapley: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/campaign-attribution-shapley", { method: "POST", body: JSON.stringify(data) }),
    budgetPacingKalman: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/budget-pacing-kalman", { method: "POST", body: JSON.stringify(data) }),
    creativePerformanceForecast: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/creative-forecast", { method: "POST", body: JSON.stringify(data) }),
    campaignSaturationTimeDecay: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/saturation-time-decay", { method: "POST", body: JSON.stringify(data) }),
    adFrequencyOptimizer: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/ad-frequency-optimizer", { method: "POST", body: JSON.stringify(data) }),
    conversionAttributionMarkov: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/conversion-attribution-markov", { method: "POST", body: JSON.stringify(data) }),
    customerJourneyClustering: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/journey-clustering", { method: "POST", body: JSON.stringify(data) }),
    // Depth 9: Audience & Segmentation
    audienceLookalikeScoring: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/lookalike-scoring", { method: "POST", body: JSON.stringify(data) }),
    sentimentTimeSeries: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/sentiment-time-series", { method: "POST", body: JSON.stringify(data) }),
    customerLtvMonteCarlo: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/customer-ltv-monte-carlo", { method: "POST", body: JSON.stringify(data) }),
    rfmSegmentation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/rfm-segmentation", { method: "POST", body: JSON.stringify(data) }),
    audienceOverlapAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/audience-overlap", { method: "POST", body: JSON.stringify(data) }),
    personaAffinityMatrix: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/persona-affinity", { method: "POST", body: JSON.stringify(data) }),
    predictiveLeadScoring: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/predictive-lead-scoring", { method: "POST", body: JSON.stringify(data) }),
    // Depth 9: Bidding & Budget Optimization
    adaptiveBidStrategy: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/adaptive-bid-strategy", { method: "POST", body: JSON.stringify(data) }),
    budgetReallocator: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/budget-reallocator", { method: "POST", body: JSON.stringify(data) }),
    pacingControlChart: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/pacing-control-chart", { method: "POST", body: JSON.stringify(data) }),
    multiTouchAttributionTimeDecay: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/multi-touch-time-decay", { method: "POST", body: JSON.stringify(data) }),
    campaignOptimizerEvolutionary: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/campaign-optimizer-evolutionary", { method: "POST", body: JSON.stringify(data) }),
    costCurveFitting: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/cost-curve-fitting", { method: "POST", body: JSON.stringify(data) }),
    marginalROICalculation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/marginal-roi", { method: "POST", body: JSON.stringify(data) }),
    // Depth 9: Marketing Analytics
    mediaMixDecomposer: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/media-mix-decomposer", { method: "POST", body: JSON.stringify(data) }),
    incrementalLiftAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/incremental-lift", { method: "POST", body: JSON.stringify(data) }),
    campaignHealthComposite: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/campaign-health-composite", { method: "POST", body: JSON.stringify(data) }),
    anomalyDetectionMarketing: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/anomaly-detection-kpi", { method: "POST", body: JSON.stringify(data) }),
    keywordClustering: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/keyword-clustering", { method: "POST", body: JSON.stringify(data) }),
    adCopyEffectiveness: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/ad-copy-effectiveness", { method: "POST", body: JSON.stringify(data) }),
    competitivePriceIndex: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/competitive-price-index", { method: "POST", body: JSON.stringify(data) }),
    // Depth 9: Forecasting & Prediction
    demandForecastSeasonal: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/demand-forecast-seasonal", { method: "POST", body: JSON.stringify(data) }),
    churnPredictionTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/churn-prediction-tree", { method: "POST", body: JSON.stringify(data) }),
    revenueForecastMonteCarlo: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/revenue-forecast-monte-carlo", { method: "POST", body: JSON.stringify(data) }),
    campaignLiftPrediction: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/campaign-lift-prediction", { method: "POST", body: JSON.stringify(data) }),
    customerAcquisitionCost: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/customer-acquisition-cost", { method: "POST", body: JSON.stringify(data) }),
    attributionFunnelAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/attribution-funnel", { method: "POST", body: JSON.stringify(data) }),
    marketingRoiDecomposition: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/marketing/roi-decomposition", { method: "POST", body: JSON.stringify(data) }),
    // Depth 10: Advanced Graph
    kCenters: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/k-centers", { method: "POST", body: JSON.stringify(data) }),
    maxBipMatch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/max-bip-match", { method: "POST", body: JSON.stringify(data) }),
    dominatorTree: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/dominator-tree", { method: "POST", body: JSON.stringify(data) }),
    boruvkaMst: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/boruvka-mst", { method: "POST", body: JSON.stringify(data) }),
    treeCentroidDecomp: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/graph/tree-centroid-decomp", { method: "POST", body: JSON.stringify(data) }),
    // Depth 10: String & Geometry
    manacherPalindromes: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/manacher-palindromes", { method: "POST", body: JSON.stringify(data) }),
    suffixArrayLinear: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/suffix-array", { method: "POST", body: JSON.stringify(data) }),
    rollingHashSearch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/rolling-hash", { method: "POST", body: JSON.stringify(data) }),
    ahocorasickMatch: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/string/ahocorasick", { method: "POST", body: JSON.stringify(data) }),
    closestPairPoints: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/geo/closest-pair", { method: "POST", body: JSON.stringify(data) }),
    rotatingCalipers: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/geo/rotating-calipers", { method: "POST", body: JSON.stringify(data) }),
    halfplaneIntersect: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/geo/halfplane-intersect", { method: "POST", body: JSON.stringify(data) }),
    // Depth 10: Math & Number Theory
    fastFourierTransform: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/fft", { method: "POST", body: JSON.stringify(data) }),
    matrixExponentiation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/matrix-expo", { method: "POST", body: JSON.stringify(data) }),
    linearDiophantine: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/linear-diophantine", { method: "POST", body: JSON.stringify(data) }),
    chineseRemainder: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/chinese-remainder", { method: "POST", body: JSON.stringify(data) }),
    berlekampMassey: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/berlekamp-massey", { method: "POST", body: JSON.stringify(data) }),
    millRabinPrimality: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/miller-rabin", { method: "POST", body: JSON.stringify(data) }),
    pollardRhoFactor: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/math/pollard-rho", { method: "POST", body: JSON.stringify(data) }),
    // Depth 10: DP & Optimization
    divideAndConquerDP: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/divide-conquer", { method: "POST", body: JSON.stringify(data) }),
    bitmaskDP: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/bitmask", { method: "POST", body: JSON.stringify(data) }),
    convexHullTrick: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/convex-hull-trick", { method: "POST", body: JSON.stringify(data) }),
    knuthDP: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/knuth", { method: "POST", body: JSON.stringify(data) }),
    dpWithProfile: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/with-profile", { method: "POST", body: JSON.stringify(data) }),
    maxRectHistogram: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/max-rect-histogram", { method: "POST", body: JSON.stringify(data) }),
    longestPathDAG: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/dp/longest-path-dag", { method: "POST", body: JSON.stringify(data) }),
    // Depth 10: Data Science & Analytics
    kernelDensityEstimate: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/kde", { method: "POST", body: JSON.stringify(data) }),
    pcaWhitening: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/pca-whitening", { method: "POST", body: JSON.stringify(data) }),
    knnRegression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/knn-regression", { method: "POST", body: JSON.stringify(data) }),
    arimaForecast: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/arima", { method: "POST", body: JSON.stringify(data) }),
    decisionTreeRegressor: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/decision-tree", { method: "POST", body: JSON.stringify(data) }),
    quantileRegression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/quantile-regression", { method: "POST", body: JSON.stringify(data) }),
    gaussianProcess: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/ml/gaussian-process", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Data Structures
    splayTreeOps: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/splay-tree", { method: "POST", body: JSON.stringify(data) }),
    huffmanCoding: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/huffman-coding", { method: "POST", body: JSON.stringify(data) }),
    lzwCompression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/lzw-compression", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Regression & Classification
    linearRegressionGD: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/linear-regression-gd", { method: "POST", body: JSON.stringify(data) }),
    logisticRegressionGD: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/logistic-regression-gd", { method: "POST", body: JSON.stringify(data) }),
    naiveBayesClassifier: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/naive-bayes", { method: "POST", body: JSON.stringify(data) }),
    randomForestRegressor: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/random-forest", { method: "POST", body: JSON.stringify(data) }),
    knnClassifier: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/knn-classifier", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Time Series & Statistics
    timeSeriesDecompose: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/time-series-decompose", { method: "POST", body: JSON.stringify(data) }),
    bootstrapCI: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/bootstrap-ci", { method: "POST", body: JSON.stringify(data) }),
    kolmogorovSmirnovTest: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/ks-test", { method: "POST", body: JSON.stringify(data) }),
    pearsonCorrelation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/pearson-correlation", { method: "POST", body: JSON.stringify(data) }),
    spearmanRankCorrelation: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/spearman-correlation", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Dimensionality & Clustering
    pcaDecomposition: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/pca-decomposition", { method: "POST", body: JSON.stringify(data) }),
    factorAnalysis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/factor-analysis", { method: "POST", body: JSON.stringify(data) }),
    kMedoidsClustering: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/k-medoids", { method: "POST", body: JSON.stringify(data) }),
    dbscanCluster: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/dbscan", { method: "POST", body: JSON.stringify(data) }),
    hierarchicalCluster: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/hierarchical-cluster", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Ensemble & Advanced ML
    gaussianNaiveBayes: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/gaussian-naive-bayes", { method: "POST", body: JSON.stringify(data) }),
    adaboostClassify: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/adaboost", { method: "POST", body: JSON.stringify(data) }),
    gradientBoostRegress: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/gradient-boost", { method: "POST", body: JSON.stringify(data) }),
    markovChainSim: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/markov-chain-sim", { method: "POST", body: JSON.stringify(data) }),
    monteCarloOption: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/monte-carlo-option", { method: "POST", body: JSON.stringify(data) }),
    baggingEnsemble: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/bagging-ensemble", { method: "POST", body: JSON.stringify(data) }),
    crossValidationKFold: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/cross-validation", { method: "POST", body: JSON.stringify(data) }),
    // Deeper Enhancements: Regularized Regression
    ridgeRegression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/ridge-regression", { method: "POST", body: JSON.stringify(data) }),
    lassoRegression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/lasso-regression", { method: "POST", body: JSON.stringify(data) }),
    elasticNetRegression: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/elastic-net", { method: "POST", body: JSON.stringify(data) }),
    mcmcSamplingMetropolis: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/mcmc-sampling", { method: "POST", body: JSON.stringify(data) }),
    expectationMaximization: (data: Record<string, unknown>) =>
      request<any>("/ds-algorithms/deeper/em-algorithm", { method: "POST", body: JSON.stringify(data) }),

    // Depth 11: Number Theory, Numerical Methods & Advanced Analytics
    sieveOfEratosthenes: (limit: number) =>
      request<any>("/ds-algorithms/depth11/sieve-of-eratosthenes", { method: "POST", body: JSON.stringify({ limit }) }),
    extendedEuclidean: (a: number, b: number) =>
      request<any>("/ds-algorithms/depth11/extended-euclidean", { method: "POST", body: JSON.stringify({ a, b }) }),
    binomialCoefficient: (n: number, k: number) =>
      request<any>("/ds-algorithms/depth11/binomial-coefficient", { method: "POST", body: JSON.stringify({ n, k }) }),
    catalanNumber: (n: number) =>
      request<any>("/ds-algorithms/depth11/catalan-number", { method: "POST", body: JSON.stringify({ n }) }),
    stirlingSecond: (n: number, k: number) =>
      request<any>("/ds-algorithms/depth11/stirling-second", { method: "POST", body: JSON.stringify({ n, k }) }),
    integerPartitions: (n: number) =>
      request<any>("/ds-algorithms/depth11/integer-partitions", { method: "POST", body: JSON.stringify({ n }) }),
    bisectionMethod: (a: number, b: number, tolerance?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/bisection-method", { method: "POST", body: JSON.stringify({ a, b, tolerance, maxIter }) }),
    newtonRaphson: (guess: number, tolerance?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/newton-raphson", { method: "POST", body: JSON.stringify({ guess, tolerance, maxIter }) }),
    secantMethod: (x0: number, x1: number, tolerance?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/secant-method", { method: "POST", body: JSON.stringify({ x0, x1, tolerance, maxIter }) }),
    particleSwarm: (bounds: number[], swarmSize?: number, iterations?: number) =>
      request<any>("/ds-algorithms/depth11/particle-swarm", { method: "POST", body: JSON.stringify({ bounds, swarmSize, iterations }) }),
    hillClimbing: (bounds: number[], maxIter?: number, stepSize?: number) =>
      request<any>("/ds-algorithms/depth11/hill-climbing", { method: "POST", body: JSON.stringify({ bounds, maxIter, stepSize }) }),
    smithWaterman: (seqA: string, seqB: string, matchScore?: number, mismatchPenalty?: number, gapPenalty?: number) =>
      request<any>("/ds-algorithms/depth11/smith-waterman", { method: "POST", body: JSON.stringify({ seqA, seqB, matchScore, mismatchPenalty, gapPenalty }) }),
    nGramModel: (text: string, n: number) =>
      request<any>("/ds-algorithms/depth11/ngram-model", { method: "POST", body: JSON.stringify({ text, n }) }),
    tfidfVectorize: (documents: string[]) =>
      request<any>("/ds-algorithms/depth11/tfidf-vectorize", { method: "POST", body: JSON.stringify({ documents }) }),
    aprioriItemsets: (transactions: string[][], minSupport: number) =>
      request<any>("/ds-algorithms/depth11/apriori-itemsets", { method: "POST", body: JSON.stringify({ transactions, minSupport }) }),
    kernalDensityEstimate: (data: number[], points: number[], bandwidth?: number) =>
      request<any>("/ds-algorithms/depth11/kde", { method: "POST", body: JSON.stringify({ data, points, bandwidth }) }),
    isolationForest: (data: number[][], nTrees?: number, sampleSize?: number) =>
      request<any>("/ds-algorithms/depth11/isolation-forest", { method: "POST", body: JSON.stringify({ data, nTrees, sampleSize }) }),
    localOutlierFactor: (data: number[][], k?: number) =>
      request<any>("/ds-algorithms/depth11/local-outlier-factor", { method: "POST", body: JSON.stringify({ data, k }) }),
    zScoreAnomaly: (data: number[], threshold?: number) =>
      request<any>("/ds-algorithms/depth11/zscore-anomaly", { method: "POST", body: JSON.stringify({ data, threshold }) }),
    jackknifeResample: (data: number[]) =>
      request<any>("/ds-algorithms/depth11/jackknife-resample", { method: "POST", body: JSON.stringify({ data }) }),
    welchTtest: (sampleA: number[], sampleB: number[]) =>
      request<any>("/ds-algorithms/depth11/welch-ttest", { method: "POST", body: JSON.stringify({ sampleA, sampleB }) }),
    truncatedNormalSample: (mean: number, std: number, lower: number, upper: number, n?: number) =>
      request<any>("/ds-algorithms/depth11/truncated-normal-sample", { method: "POST", body: JSON.stringify({ mean, std, lower, upper, n }) }),
    multivariateNormalSample: (mean: number[], cov: number[][], n?: number) =>
      request<any>("/ds-algorithms/depth11/multivariate-normal-sample", { method: "POST", body: JSON.stringify({ mean, cov, n }) }),
    meanShiftCluster: (data: number[][], bandwidth?: number) =>
      request<any>("/ds-algorithms/depth11/mean-shift-cluster", { method: "POST", body: JSON.stringify({ data, bandwidth }) }),
    affinityPropagation: (data: number[][], damping?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/affinity-propagation", { method: "POST", body: JSON.stringify({ data, damping, maxIter }) }),
    opticsCluster: (data: number[][], eps?: number, minPts?: number) =>
      request<any>("/ds-algorithms/depth11/optics-cluster", { method: "POST", body: JSON.stringify({ data, eps, minPts }) }),
    spectralCluster: (data: number[][], nClusters?: number, sigma?: number) =>
      request<any>("/ds-algorithms/depth11/spectral-cluster", { method: "POST", body: JSON.stringify({ data, nClusters, sigma }) }),
    gaussianMixtureCluster: (data: number[][], nComponents?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/gaussian-mixture-cluster", { method: "POST", body: JSON.stringify({ data, nComponents, maxIter }) }),
    fuzzyCMeans: (data: number[][], nClusters?: number, m?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/fuzzy-cmeans", { method: "POST", body: JSON.stringify({ data, nClusters, m, maxIter }) }),
    miniBatchKMeans: (data: number[][], k?: number, batchSize?: number, maxIter?: number) =>
      request<any>("/ds-algorithms/depth11/mini-batch-kmeans", { method: "POST", body: JSON.stringify({ data, k, batchSize, maxIter }) }),
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

  adsMarketingModule: {
    health: () => request<any>("/ads-marketing-module/health"),
    stats: () => request<any>("/ads-marketing-module/stats"),
    campaignHealth: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health`),
    healthDetailedBreakdown: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health-detailed-breakdown`),
    healthTrendForecast: (campaignId: string, periods?: number) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health-trend-forecast${periods ? `?periods=${periods}` : ""}`),
    healthBenchmark: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health-benchmark`),
    healthImprovementPlan: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health-improvement-plan`),
    healthDriverAttribution: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/health-driver-attribution`),
    healthRanking: () => request<any>("/ads-marketing-module/health-ranking"),
    campaignOptimize: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/optimize`, { method: "POST" }),
    campaignLifecycle: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/lifecycle`),
    campaignAnalysis: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/analysis`),
    dashboard: () => request<any>("/ads-marketing-module/dashboard"),
    portfolioOverview: () => request<any>("/ads-marketing-module/portfolio-overview"),
    report: () => request<any>("/ads-marketing-module/report"),
    competitiveBenchmark: () => request<any>("/ads-marketing-module/competitive-benchmark"),
    realtimeMonitor: () => request<any>("/ads-marketing-module/realtime-monitor"),
    budgetRebalance: () => request<any>("/ads-marketing-module/budget-rebalance", { method: "POST" }),
    forecast: (days?: number) => request<any>(`/ads-marketing-module/forecast${days ? `?days=${days}` : ""}`),
    anomalyScan: () => request<any>("/ads-marketing-module/anomaly-scan"),
    executiveBriefing: () => request<any>("/ads-marketing-module/executive-briefing"),
    audienceOverlap: () => request<any>("/ads-marketing-module/audience-overlap"),
    crossPlatformAudienceSync: () => request<any>("/ads-marketing-module/cross-platform-audience-sync"),
    creativePerformanceMatrix: () => request<any>("/ads-marketing-module/creative-performance-matrix"),
    placementIntelligence: () => request<any>("/ads-marketing-module/placement-intelligence"),
    channelAttributionSummary: () => request<any>("/ads-marketing-module/channel-attribution-summary"),
    portfolioScenarioPlanner: (scenarios: any[]) =>
      request<any>("/ads-marketing-module/portfolio-scenario-planner", { method: "POST", body: JSON.stringify({ scenarios }) }),
    budgetSimulation: () => request<any>("/ads-marketing-module/budget-simulation"),
    budgetOptimizationAllocation: (totalBudget: number) =>
      request<any>("/ads-marketing-module/budget-optimization-allocation", { method: "POST", body: JSON.stringify({ totalBudget }) }),
    budgetScenarioComparison: () => request<any>("/ads-marketing-module/budget-scenario-comparison"),
    budgetRiskAssessment: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/budget-risk-assessment`),
    budgetSensitivity: (campaignId: string, minBudget?: number, maxBudget?: number, steps?: number) =>
      request<any>(`/ads-marketing-module/campaign/${campaignId}/budget-sensitivity`, { method: "POST", body: JSON.stringify({ minBudget, maxBudget, steps }) }),
    budgetWhatIf: (campaignId: string, whatIfBudget: number) =>
      request<any>(`/ads-marketing-module/campaign/${campaignId}/budget-what-if`, { method: "POST", body: JSON.stringify({ whatIfBudget }) }),
    budgetROICurve: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/budget-roi-curve`),
    budgetQuickSimulation: (campaignId: string, percentageChange: number, runs?: number) =>
      request<any>("/ads-marketing-module/budget-quick-simulation", { method: "POST", body: JSON.stringify({ campaignId, percentageChange, runs }) }),
    budgetPortfolioOverview: () => request<any>("/ads-marketing-module/budget-portfolio-overview"),
    batchUpdateStatus: (updates: { id: string; status: string }[]) =>
      request<any>("/ads-marketing-module/batch-update-status", { method: "POST", body: JSON.stringify({ updates }) }),
    batchUpdateBudget: (updates: { id: string; daily?: number; lifetime?: number }[]) =>
      request<any>("/ads-marketing-module/batch-update-budget", { method: "POST", body: JSON.stringify({ updates }) }),
    dailyOpsOverview: () => request<any>("/ads-marketing-module/daily-ops-overview"),
    goalDashboard: () => request<any>("/ads-marketing-module/goal-dashboard"),
    goalQuickCheck: () => request<any>("/ads-marketing-module/goal-quick-check"),
    scorecardDailySnapshot: () => request<any>("/ads-marketing-module/scorecard-daily-snapshot"),
    realTimePortfolioSummary: () => request<any>("/ads-marketing-module/real-time-portfolio-summary"),
    realTimeBatchResolveAlerts: (campaignId: string, alertIds: string[], action?: string) =>
      request<any>("/ads-marketing-module/real-time-batch-resolve-alerts", { method: "POST", body: JSON.stringify({ campaignId, alertIds, action }) }),
    diagnosticsPriorityList: () => request<any>("/ads-marketing-module/diagnostics-priority-list"),
    funnelPortfolioHealth: () => request<any>("/ads-marketing-module/funnel-portfolio-health"),
    healthPredictorQuickView: (campaignInputs: { campaignId: string; campaignName?: string; metrics: any[] }[]) =>
      request<any>("/ads-marketing-module/health-predictor-quick-view", { method: "POST", body: JSON.stringify({ campaignInputs }) }),
    creativePortfolioHealth: () => request<any>("/ads-marketing-module/creative-portfolio-health"),
    saturationPortfolioOverview: () => request<any>("/ads-marketing-module/saturation-portfolio-overview"),
    biddingPortfolioOverview: () => request<any>("/ads-marketing-module/bidding-portfolio-overview"),
    snapshotPortfolioSummary: () => request<any>("/ads-marketing-module/snapshot-portfolio-summary"),
    summaryPortfolioQuickView: () => request<any>("/ads-marketing-module/summary-portfolio-quick-view"),
    biddingBatchApplyAdjustments: (priorityOnly: boolean = true) =>
      request<any>("/ads-marketing-module/bidding-batch-apply-adjustments", { method: "POST", body: JSON.stringify({ priorityOnly }) }),
    snapshotBatchCapture: (name?: string) =>
      request<any>("/ads-marketing-module/snapshot-batch-capture", { method: "POST", body: JSON.stringify({ name }) }),
    saturationBatchMitigation: () => request<any>("/ads-marketing-module/saturation-batch-mitigation"),
    diagnosticsBatchFixPlan: () => request<any>("/ads-marketing-module/diagnostics-batch-fix-plan"),
    creativeBatchRefreshPlan: () => request<any>("/ads-marketing-module/creative-batch-refresh-plan"),
    goalBatchStatus: () => request<any>("/ads-marketing-module/goal-batch-status"),
    budgetRebalancePlan: () => request<any>("/ads-marketing-module/budget-rebalance-plan"),
    dailyExecutionDashboard: () => request<any>("/ads-marketing-module/daily-execution-dashboard"),
    commandCenterSummary: () => request<any>("/ads-marketing-module/command-center-summary"),
    dailyBriefing: () => request<any>("/ads-marketing-module/daily-briefing"),
    parseVoiceCommand: (text: string) =>
      request<any>("/ads-marketing-module/parse-voice-command", { method: "POST", body: JSON.stringify({ text }) }),
    quickActions: () => request<any>("/ads-marketing-module/quick-actions"),
    approvalGetSettings: () => request<any>("/ads-marketing-module/approval-settings"),
    approvalUpdateSettings: (updates: Record<string, any>) =>
      request<any>("/ads-marketing-module/approval-settings", { method: "POST", body: JSON.stringify({ updates }) }),
    approvalEvaluate: (action: Record<string, any>) =>
      request<any>("/ads-marketing-module/approval-evaluate", { method: "POST", body: JSON.stringify({ action }) }),
    approvalEvaluateBatch: (actions: Record<string, any>[]) =>
      request<any>("/ads-marketing-module/approval-evaluate-batch", { method: "POST", body: JSON.stringify({ actions }) }),
    approvalApproveAll: (actions: Record<string, any>[]) =>
      request<any>("/ads-marketing-module/approval-approve-all", { method: "POST", body: JSON.stringify({ actions }) }),
    approvalDecide: (actionId: string, decision: string) =>
      request<any>("/ads-marketing-module/approval-decide", { method: "POST", body: JSON.stringify({ actionId, decision }) }),
    approvalDecisionLog: () => request<any>("/ads-marketing-module/approval-decision-log"),
    triageAlert: (alert: Record<string, any>) =>
      request<any>("/ads-marketing-module/triage-alert", { method: "POST", body: JSON.stringify({ alert }) }),
    triageBatch: (alerts: Record<string, any>[]) =>
      request<any>("/ads-marketing-module/triage-batch", { method: "POST", body: JSON.stringify({ alerts }) }),
    triageExecute: (alert: Record<string, any>) =>
      request<any>("/ads-marketing-module/triage-execute", { method: "POST", body: JSON.stringify({ alert }) }),
    triageHistory: () => request<any>("/ads-marketing-module/triage-history"),
    campaignTemplates: () => request<any>("/ads-marketing-module/campaign-templates"),
    campaignTemplateGet: (templateId: string) => request<any>(`/ads-marketing-module/campaign-templates/${templateId}`),
    campaignTemplateInstantiate: (templateId: string, inputs: Record<string, any>) =>
      request<any>("/ads-marketing-module/campaign-templates/instantiate", { method: "POST", body: JSON.stringify({ templateId, inputs }) }),
    campaignTemplateLaunch: (templateId: string, inputs: Record<string, any>) =>
      request<any>("/ads-marketing-module/campaign-templates/launch", { method: "POST", body: JSON.stringify({ templateId, inputs }) }),
    campaignTemplateLaunchHistory: () => request<any>("/ads-marketing-module/campaign-templates/launch-history"),
    audienceBuild: (name: string, segments: Record<string, any>[], options: Record<string, any> = {}) =>
      request<any>("/ads-marketing-module/audiences/build", { method: "POST", body: JSON.stringify({ name, segments, options }) }),
    audienceSyncToPlatforms: (audienceId: string) =>
      request<any>("/ads-marketing-module/audiences/sync", { method: "POST", body: JSON.stringify({ audienceId }) }),
    audienceQualityScoring: () => request<any>("/ads-marketing-module/audiences/quality"),
    audienceLtvRanking: () => request<any>("/ads-marketing-module/audiences/ltv-ranking"),
    audienceApplyAutoActions: () =>
      request<any>("/ads-marketing-module/audiences/auto-actions", { method: "POST" }),
    audienceSyncStatus: () => request<any>("/ads-marketing-module/audiences/sync-status"),
    autopilotEnable: (config: Record<string, any>) =>
      request<any>("/ads-marketing-module/autopilot/enable", { method: "POST", body: JSON.stringify({ config }) }),
    autopilotStatus: () => request<any>("/ads-marketing-module/autopilot/status"),
    autopilotRunCycle: () => request<any>("/ads-marketing-module/autopilot/cycle", { method: "POST" }),
    autopilotSpendAlerts: () => request<any>("/ads-marketing-module/autopilot/alerts"),
    autopilotDailySummary: () => request<any>("/ads-marketing-module/autopilot/daily-summary"),
    weeklyReview: () => request<any>("/ads-marketing-module/weekly-review"),
    monthlyStrategyDeck: () => request<any>("/ads-marketing-module/monthly-strategy-deck"),
    aiOptimizationLog: () => request<any>("/ads-marketing-module/ai-optimization-log"),
    launchWizard: (payload: Record<string, any>) =>
      request<any>("/ads-marketing-module/launch-wizard", { method: "POST", body: JSON.stringify({ request: payload }) }),
    duplicateCampaign: (campaignId: string) =>
      request<any>("/ads-marketing-module/campaigns/duplicate", { method: "POST", body: JSON.stringify({ campaignId }) }),
    mirrorCampaign: (campaignId: string, platforms: string[]) =>
      request<any>("/ads-marketing-module/campaigns/mirror", { method: "POST", body: JSON.stringify({ campaignId, platforms }) }),
    launchReadiness: (campaignId: string) => request<any>(`/ads-marketing-module/campaigns/${campaignId}/launch-readiness`),
    creativeGenerate: (description: string, count: number = 3) =>
      request<any>("/ads-marketing-module/creatives/generate", { method: "POST", body: JSON.stringify({ description, count }) }),
    creativeDetectFatigue: () => request<any>("/ads-marketing-module/creatives/fatigue"),
    creativeRunAutoRefresh: () => request<any>("/ads-marketing-module/creatives/auto-refresh", { method: "POST" }),
    assetUpload: (asset: Record<string, any>) =>
      request<any>("/ads-marketing-module/assets/upload", { method: "POST", body: JSON.stringify({ asset }) }),
    assetLibraryStatus: () => request<any>("/ads-marketing-module/assets/library-status"),
    quickFixes: () => request<any>("/ads-marketing-module/quick-fixes"),
    applyQuickFix: (fixId: string) =>
      request<any>("/ads-marketing-module/quick-fixes/apply", { method: "POST", body: JSON.stringify({ fixId }) }),
    fixAll: () => request<any>("/ads-marketing-module/quick-fixes/fix-all", { method: "POST" }),
    campaignWorkflow: (campaignId: string) =>
      request<any>("/ads-marketing-module/campaigns/workflow", { method: "POST", body: JSON.stringify({ campaignId }) }),
    workflowLog: () => request<any>("/ads-marketing-module/workflow-log"),
    fraudProtectionStatus: () => request<any>("/ads-marketing-module/fraud-protection-status"),
    placementMonitor: () => request<any>("/ads-marketing-module/placements/monitor"),
    placementAutoPause: () => request<any>("/ads-marketing-module/placements/auto-pause", { method: "POST" }),
    crisisResponse: () => request<any>("/ads-marketing-module/brand-safety/crisis"),
    escalateToLegal: (crisisId: string) =>
      request<any>("/ads-marketing-module/brand-safety/escalate", { method: "POST", body: JSON.stringify({ crisisId }) }),
    resumeOnSafeInventory: (crisisId: string) =>
      request<any>("/ads-marketing-module/brand-safety/resume", { method: "POST", body: JSON.stringify({ crisisId }) }),
    guardianLog: () => request<any>("/ads-marketing-module/guardian-log"),
    attributionReport: () => request<any>("/ads-marketing-module/attribution-report"),
    attributionQuery: (query: string) =>
      request<any>("/ads-marketing-module/attribution-query", { method: "POST", body: JSON.stringify({ query }) }),
    crossPlatformPerformance: () => request<any>("/ads-marketing-module/cross-platform-performance"),
    adCompliance: (adCopy: string) => request<any>("/ads-marketing-module/ad-compliance", { method: "POST", body: JSON.stringify({ adCopy }) }),
    taxonomyAudit: () => request<any>("/ads-marketing-module/taxonomy-audit"),
    segmentOverlap: () => request<any>("/ads-marketing-module/segment-overlap"),
    marketingCalendar: (month?: number, year?: number) =>
      request<any>(`/ads-marketing-module/marketing-calendar${month ? `?month=${month}` : ""}${year ? `${month ? "&" : "?"}year=${year}` : ""}`),
    creativeAssetPerformance: () => request<any>("/ads-marketing-module/creative-asset-performance"),
    insightsDashboard: () => request<any>("/ads-marketing-module/insights-dashboard"),
    correlationAnalysis: () => request<any>("/ads-marketing-module/correlation-analysis"),
    performanceTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/trends`),
    budgetEfficiency: () => request<any>("/ads-marketing-module/budget-efficiency"),
    crossCampaignAttribution: () => request<any>("/ads-marketing-module/cross-campaign-attribution"),
    predictiveAlerts: () => request<any>("/ads-marketing-module/predictive-alerts"),
    diagnose: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/diagnose`),
    rootCauses: () => request<any>("/ads-marketing-module/root-causes"),
    crossCampaignDiagnostics: () => request<any>("/ads-marketing-module/cross-campaign-diagnostics"),
    metricHealth: () => request<any>("/ads-marketing-module/metric-health"),
    recoveryPlan: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/recovery-plan`),
    remediate: (findingId: string, action: string, metricBefore: number, metricAfter: number) =>
      request<any>("/ads-marketing-module/remediate", { method: "POST", body: JSON.stringify({ findingId, action, metricBefore, metricAfter }) }),
    daypartingAnalysis: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/dayparting`),
    daypartingSchedule: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/dayparting-schedule`),
    daypartingPlan: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/dayparting-plan`),
    daypartingTimePatterns: () => request<any>("/ads-marketing-module/dayparting/time-patterns"),
    daypartingScheduleConflicts: () => request<any>("/ads-marketing-module/dayparting/schedule-conflicts"),
    daypartingTimezonePerformance: () => request<any>("/ads-marketing-module/dayparting/timezone-performance"),
    roiDecomposition: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/roi-decomposition`),
    factorAttribution: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/factor-attribution`),
    marginalReturns: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/marginal-returns`),
    roiSensitivity: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/roi-sensitivity`),
    roiForecast: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/roi-forecast`),
    decompositionTrends: () => request<any>("/ads-marketing-module/decomposition-trends"),
    adQuality: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/ad-quality`),
    qualityScore: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/quality-score`),
    adRelevance: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/relevance`),
    qualityImprovementPlan: (campaignId: string, target?: number) =>
      request<any>(`/ads-marketing-module/campaign/${campaignId}/quality-improvement${target ? `?target=${target}` : ""}`),
    competitiveAdQuality: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/competitive-quality`),
    qualityTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/quality-trends`),
    audienceExpansion: (seedAudienceId?: string) =>
      request<any>(`/ads-marketing-module/audience-expansion${seedAudienceId ? `?seedAudienceId=${seedAudienceId}` : ""}`),
    expansionRecommendations: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/expansion-recommendations`),
    audienceSimilarity: (audienceA: string, audienceB: string) =>
      request<any>(`/ads-marketing-module/audience-similarity?audienceA=${encodeURIComponent(audienceA)}&audienceB=${encodeURIComponent(audienceB)}`),
    expansionQuality: (seedAudienceId: string, expandedAudienceId: string) =>
      request<any>(`/ads-marketing-module/expansion-quality?seedAudienceId=${encodeURIComponent(seedAudienceId)}&expandedAudienceId=${encodeURIComponent(expandedAudienceId)}`),
    crossPlatformUnification: () => request<any>("/ads-marketing-module/cross-platform-unification"),
    expansionPerformance: (audienceId: string) => request<any>(`/ads-marketing-module/expansion-performance?audienceId=${encodeURIComponent(audienceId)}`),
    crossDevice: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/cross-device`),
    deviceRecommendations: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/device-recommendations`),
    crossDeviceConversionPaths: () => request<any>("/ads-marketing-module/cross-device-conversion-paths"),
    deviceBidAdjustments: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/device-bid-adjustments`),
    deviceAudienceOverlap: () => request<any>("/ads-marketing-module/device-audience-overlap"),
    deviceTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/device-trends`),
    geoPerformance: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/geo-performance`),
    geoRecommendations: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/geo-recommendations`),
    geoExpansion: () => request<any>("/ads-marketing-module/geo-expansion-opportunities"),
    geoBidAdjustments: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/geo-bid-adjustments`),
    geoAudienceOverlap: () => request<any>("/ads-marketing-module/geo-audience-overlap"),
    geoTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/geo-trends`),
    frequencyDistribution: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/frequency-distribution`),
    frequencyRecommendations: () => request<any>("/ads-marketing-module/frequency-recommendations"),
    wearOutAnalysis: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/wear-out-curve`),
    frequencyCapping: () => request<any>("/ads-marketing-module/frequency-capping"),
    crossCampaignFrequency: () => request<any>("/ads-marketing-module/cross-campaign-frequency"),
    frequencyImpactPrediction: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/frequency-impact`),
    discoveredSegments: () => request<any>("/ads-marketing-module/discovered-segments"),
    segmentPerformance: () => request<any>("/ads-marketing-module/segment-performance"),
    segmentTargeting: () => request<any>("/ads-marketing-module/segment-targeting"),
    segmentComparison: () => request<any>("/ads-marketing-module/segment-comparison"),
    segmentTrends: () => request<any>("/ads-marketing-module/segment-trends"),
    goalProgress: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/goal-progress`),
    goalAttainment: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/goal-attainment`),
    goalAdjustments: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/goal-adjustments`),
    goalConflicts: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/goal-conflicts`),
    goalComparison: () => request<any>("/ads-marketing-module/goal-performance-comparison"),
    goalTrendForecast: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/goal-trend-forecast`),
    placementPerformance: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/placement-performance`),
    placementRecommendations: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/placement-recommendations`),
    placementOpportunities: () => request<any>("/ads-marketing-module/placement-opportunities"),
    placementBidAdjustments: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/placement-bid-adjustments`),
    placementOverlap: () => request<any>("/ads-marketing-module/placement-overlap"),
    placementTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/placement-trends`),
    formatPerformance: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/format-performance`),
    formatRecommendations: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/format-recommendations`),
    formatOpportunities: () => request<any>("/ads-marketing-module/format-opportunities"),
    formatBidAdjustments: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/format-bid-adjustments`),
    formatAudiencePreference: () => request<any>("/ads-marketing-module/audience-format-preference"),
    formatTrends: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/format-trends`),
    funnelVelocity: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-velocity`),
    funnelLeakagePrediction: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-leakage-prediction`),
    funnelAttribution: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-attribution`),
    funnelScenarioSimulation: (campaignId: string, targetStage: string, improvementPct: number) =>
      request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-scenario-simulation`, { method: "POST", body: JSON.stringify({ targetStage, improvementPct }) }),
    funnelChannelBreakdown: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-channel-breakdown`),
    funnelHealthScore: (campaignId: string) => request<any>(`/ads-marketing-module/campaign/${campaignId}/funnel-health-score`),
    // ── N0VA MAIL (Round 15) ──
    mailMailboxes: () => request<any>("/ads-marketing-module/mail/mailboxes"),
    mailCreateMailbox: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/mailboxes", { method: "POST", body: JSON.stringify(input) }),
    mailMailbox: (mailboxId: string) => request<any>(`/ads-marketing-module/mail/mailboxes/${mailboxId}`),
    mailUpdateMailbox: (mailboxId: string, patch: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/mailboxes/${mailboxId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    mailDeleteMailbox: (mailboxId: string) =>
      request<any>(`/ads-marketing-module/mail/mailboxes/${mailboxId}`, { method: "DELETE" }),
    mailMailboxQuota: (mailboxId: string) => request<any>(`/ads-marketing-module/mail/mailboxes/${mailboxId}/quota`),
    mailStorageAnalytics: () => request<any>("/ads-marketing-module/mail/storage-analytics"),
    mailMessages: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/messages${qs ? `?${qs}` : ""}`);
    },
    mailMessage: (messageId: string) => request<any>(`/ads-marketing-module/mail/messages/${messageId}`),
    mailThread: (threadId: string) => request<any>(`/ads-marketing-module/mail/threads/${threadId}`),
    mailSend: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/messages/send", { method: "POST", body: JSON.stringify({ mailboxId, ...input }) }),
    mailSaveDraft: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/messages/draft", { method: "POST", body: JSON.stringify({ mailboxId, ...input }) }),
    mailSendDraft: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/send`, { method: "POST" }),
    mailReceive: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/messages/receive", { method: "POST", body: JSON.stringify({ mailboxId, ...input }) }),
    mailMarkRead: (messageId: string, read: boolean = true) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/read`, { method: "POST", body: JSON.stringify({ read }) }),
    mailToggleStar: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/star`, { method: "POST" }),
    mailMove: (messageId: string, folder: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/move`, { method: "POST", body: JSON.stringify({ folder }) }),
    mailArchive: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/archive`, { method: "POST" }),
    mailTrash: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/trash`, { method: "POST" }),
    mailRestore: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/restore`, { method: "POST" }),
    mailDeleteMessage: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}`, { method: "DELETE" }),
    mailApplyLabel: (messageId: string, label: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/labels`, { method: "POST", body: JSON.stringify({ label }) }),
    mailRemoveLabel: (messageId: string, label: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/labels/${encodeURIComponent(label)}`, { method: "DELETE" }),
    mailFolders: (mailboxId?: string) =>
      request<any>(`/ads-marketing-module/mail/folders${mailboxId ? `?mailboxId=${mailboxId}` : ""}`),
    mailCreateFolder: (name: string) =>
      request<any>("/ads-marketing-module/mail/folders", { method: "POST", body: JSON.stringify({ name }) }),
    mailDeleteFolder: (folderId: string) =>
      request<any>(`/ads-marketing-module/mail/folders/${folderId}`, { method: "DELETE" }),
    mailUnreadSummary: () => request<any>("/ads-marketing-module/mail/unread-summary"),
    mailRules: () => request<any>("/ads-marketing-module/mail/rules"),
    mailRule: (ruleId: string) => request<any>(`/ads-marketing-module/mail/rules/${ruleId}`),
    mailCreateRule: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/rules", { method: "POST", body: JSON.stringify(input) }),
    mailUpdateRule: (ruleId: string, patch: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/rules/${ruleId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    mailToggleRule: (ruleId: string, enabled?: boolean) =>
      request<any>(`/ads-marketing-module/mail/rules/${ruleId}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
    mailDeleteRule: (ruleId: string) =>
      request<any>(`/ads-marketing-module/mail/rules/${ruleId}`, { method: "DELETE" }),
    mailRuleTemplates: () => request<any>("/ads-marketing-module/mail/rules/templates"),
    mailInstantiateRuleTemplate: (templateId: string) =>
      request<any>(`/ads-marketing-module/mail/rules/templates/${templateId}/instantiate`, { method: "POST" }),
    mailRulesDashboard: () => request<any>("/ads-marketing-module/mail/rules/dashboard"),
    mailEvaluateRule: (ruleId: string, messageId: string) =>
      request<any>(`/ads-marketing-module/mail/rules/${ruleId}/evaluate`, { method: "POST", body: JSON.stringify({ messageId }) }),
    mailEvaluateAllRules: (messageId: string) =>
      request<any>("/ads-marketing-module/mail/evaluate-all", { method: "POST", body: JSON.stringify({ messageId }) }),
    mailRunScriptRule: (ruleId: string, messageId: string) =>
      request<any>(`/ads-marketing-module/mail/rules/${ruleId}/script-run`, { method: "POST", body: JSON.stringify({ messageId }) }),
    mailTestRule: (ruleId: string, sample: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/rules/test", { method: "POST", body: JSON.stringify({ ruleId, sample }) }),
    mailSearch: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/search${qs ? `?${qs}` : ""}`);
    },
    mailSemanticSearch: (query: string) =>
      request<any>("/ads-marketing-module/mail/search/semantic", { method: "POST", body: JSON.stringify({ query }) }),
    mailSearchSuggestions: (q: string) =>
      request<any>(`/ads-marketing-module/mail/search/suggestions?q=${encodeURIComponent(q)}`),
    mailSearchStats: () => request<any>("/ads-marketing-module/mail/search/stats"),
    mailEnrich: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/ai/enrich/${messageId}`, { method: "POST" }),
    mailSmartReply: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/ai/smart-reply/${messageId}`, { method: "POST" }),
    mailSummarizeThread: (threadId: string) =>
      request<any>(`/ads-marketing-module/mail/ai/summarize-thread/${threadId}`, { method: "POST" }),
    mailMeetingPrep: (threadId: string) =>
      request<any>(`/ads-marketing-module/mail/ai/meeting-prep/${threadId}`, { method: "POST" }),
    mailIntelligence: () => request<any>("/ads-marketing-module/mail/ai/intelligence"),
    mailContacts: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/contacts${qs ? `?${qs}` : ""}`);
    },
    mailContactsDashboard: () => request<any>("/ads-marketing-module/mail/contacts/dashboard"),
    mailContactGroups: () => request<any>("/ads-marketing-module/mail/contacts/groups"),
    mailMostContacted: (limit: number = 5) => request<any>(`/ads-marketing-module/mail/contacts/most-contacted?limit=${limit}`),
    mailContact: (contactId: string) => request<any>(`/ads-marketing-module/mail/contacts/${contactId}`),
    mailContactProfile: (contactId: string) => request<any>(`/ads-marketing-module/mail/contacts/${contactId}/profile`),
    mailCreateContact: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/contacts", { method: "POST", body: JSON.stringify(input) }),
    mailUpdateContact: (contactId: string, patch: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    mailDeleteContact: (contactId: string) =>
      request<any>(`/ads-marketing-module/mail/contacts/${contactId}`, { method: "DELETE" }),
    mailAgentStatus: () => request<any>("/ads-marketing-module/mail/agent/status"),
    mailAgentLog: (limit: number = 20) => request<any>(`/ads-marketing-module/mail/agent/log?limit=${limit}`),
    mailRunAgentCycle: (mailboxId?: string) =>
      request<any>("/ads-marketing-module/mail/agent/cycle", { method: "POST", body: JSON.stringify({ mailboxId }) }),
    mailOutOfOfficeStatus: (mailboxId: string) => request<any>(`/ads-marketing-module/mail/agent/ooo/${mailboxId}`),
    mailSetOutOfOffice: (mailboxId: string, input: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/agent/ooo/${mailboxId}`, { method: "POST", body: JSON.stringify(input) }),
    mailListScheduled: (mailboxId?: string) => {
      const qs = mailboxId ? `?mailboxId=${encodeURIComponent(mailboxId)}` : "";
      return request<any>(`/ads-marketing-module/mail/agent/scheduled${qs}`);
    },
    mailScheduleSend: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/agent/scheduled", { method: "POST", body: JSON.stringify({ ...input, mailboxId }) }),
    mailCancelSchedule: (scheduleId: string) =>
      request<any>(`/ads-marketing-module/mail/agent/scheduled/${scheduleId}/cancel`, { method: "POST" }),
    mailExtractTasks: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/agent/tasks/extract/${messageId}`, { method: "POST" }),
    mailListTasks: () => request<any>("/ads-marketing-module/mail/agent/tasks"),
    mailCompleteTask: (taskId: string) =>
      request<any>(`/ads-marketing-module/mail/agent/tasks/${taskId}/complete`, { method: "POST" }),
    mailComplianceSummary: () => request<any>("/ads-marketing-module/mail/compliance/summary"),
    mailRetentionPolicies: () => request<any>("/ads-marketing-module/mail/compliance/policies"),
    mailSetRetentionPolicy: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/compliance/policies", { method: "POST", body: JSON.stringify(input) }),
    mailDeleteRetentionPolicy: (policyId: string) =>
      request<any>(`/ads-marketing-module/mail/compliance/policies/${policyId}`, { method: "DELETE" }),
    mailApplyRetention: () => request<any>("/ads-marketing-module/mail/compliance/retention/apply", { method: "POST" }),
    mailListHolds: () => request<any>("/ads-marketing-module/mail/compliance/holds"),
    mailPlaceHold: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/compliance/holds", { method: "POST", body: JSON.stringify(input) }),
    mailReleaseHold: (holdId: string) =>
      request<any>(`/ads-marketing-module/mail/compliance/holds/${holdId}/release`, { method: "POST" }),
    mailHoldStatus: () => request<any>("/ads-marketing-module/mail/compliance/hold-status"),
    mailAuditLog: (limit: number = 30) => request<any>(`/ads-marketing-module/mail/compliance/audit?limit=${limit}`),
    mailScanPii: () => request<any>("/ads-marketing-module/mail/compliance/pii/scan", { method: "POST" }),
    mailParseVoiceCommand: (command: string) =>
      request<any>("/ads-marketing-module/mail/voice/parse", { method: "POST", body: JSON.stringify({ command }) }),
    mailExecuteVoiceCommand: (command: string) =>
      request<any>("/ads-marketing-module/mail/voice/execute", { method: "POST", body: JSON.stringify({ command }) }),
    mailVoiceHelp: () => request<any>("/ads-marketing-module/mail/voice/help"),
    mailTemplates: () => request<any>("/ads-marketing-module/mail/templates"),
    mailTemplate: (templateId: string) => request<any>(`/ads-marketing-module/mail/templates/${templateId}`),
    mailTemplateStats: () => request<any>("/ads-marketing-module/mail/templates/stats"),
    mailTemplateUsage: (limit: number = 20) => request<any>(`/ads-marketing-module/mail/templates/usage?limit=${limit}`),
    mailCreateTemplate: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/templates", { method: "POST", body: JSON.stringify(input) }),
    mailUpdateTemplate: (templateId: string, patch: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/templates/${templateId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    mailDeleteTemplate: (templateId: string) =>
      request<any>(`/ads-marketing-module/mail/templates/${templateId}`, { method: "DELETE" }),
    mailRenderTemplate: (templateId: string, variables: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/templates/render", { method: "POST", body: JSON.stringify({ templateId, variables }) }),
    mailSendFromTemplate: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/templates/send", { method: "POST", body: JSON.stringify({ ...input, mailboxId }) }),
    mailSendBulkTemplate: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/templates/bulk", { method: "POST", body: JSON.stringify({ ...input, mailboxId }) }),
    mailSignatures: () => request<any>("/ads-marketing-module/mail/signatures"),
    mailSignaturesDashboard: () => request<any>("/ads-marketing-module/mail/signatures/dashboard"),
    mailDefaultSignature: () => request<any>("/ads-marketing-module/mail/signatures/default"),
    mailSignature: (mailboxId: string) => request<any>(`/ads-marketing-module/mail/signatures/${mailboxId}`),
    mailUpdateSignature: (mailboxId: string, input: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/signatures/${mailboxId}`, { method: "PUT", body: JSON.stringify(input) }),
    mailToggleSignature: (mailboxId: string, enabled: boolean) =>
      request<any>(`/ads-marketing-module/mail/signatures/${mailboxId}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
    mailSignaturePreview: (mailboxId: string, body: string) =>
      request<any>(`/ads-marketing-module/mail/signatures/${mailboxId}/preview`, { method: "POST", body: JSON.stringify({ body }) }),
    mailSpamStatus: () => request<any>("/ads-marketing-module/mail/spam/status"),
    mailQuarantine: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/spam/quarantine${qs ? `?${qs}` : ""}`);
    },
    mailScanMessage: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/spam/scan/${messageId}`, { method: "POST" }),
    mailScanAllSpam: () => request<any>("/ads-marketing-module/mail/spam/scan-all", { method: "POST" }),
    mailReportSpam: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/spam/${messageId}/report`, { method: "POST" }),
    mailReportNotSpam: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/spam/${messageId}/not-spam`, { method: "POST" }),
    mailBlockedSenders: () => request<any>("/ads-marketing-module/mail/spam/blocked"),
    mailBlockSender: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/spam/blocked", { method: "POST", body: JSON.stringify(input) }),
    mailUnblockSender: (email: string) =>
      request<any>(`/ads-marketing-module/mail/spam/blocked/${encodeURIComponent(email)}`, { method: "DELETE" }),
    mailAllowedSenders: () => request<any>("/ads-marketing-module/mail/spam/allowed"),
    mailAllowSender: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/spam/allowed", { method: "POST", body: JSON.stringify(input) }),
    mailRemoveAllowedSender: (email: string) =>
      request<any>(`/ads-marketing-module/mail/spam/allowed/${encodeURIComponent(email)}`, { method: "DELETE" }),
    mailSpamLog: (limit: number = 20) => request<any>(`/ads-marketing-module/mail/spam/log?limit=${limit}`),
    mailSnooze: (messageId: string, until: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/snooze`, { method: "POST", body: JSON.stringify({ until }) }),
    mailUnsnooze: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/unsnooze`, { method: "POST" }),
    mailListSnoozed: () => request<any>("/ads-marketing-module/mail/followups/snoozed"),
    mailMarkAwaitingResponse: (messageId: string, deadline?: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/awaiting`, { method: "POST", body: JSON.stringify({ deadline }) }),
    mailMarkResponded: (messageId: string) =>
      request<any>(`/ads-marketing-module/mail/messages/${messageId}/responded`, { method: "POST" }),
    mailFollowUps: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/followups${qs ? `?${qs}` : ""}`);
    },
    mailFollowUpSummary: () => request<any>("/ads-marketing-module/mail/followups/summary"),
    mailFollowUpSuggestions: () => request<any>("/ads-marketing-module/mail/followups/suggestions"),
    mailCreateFollowUp: (messageId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/followups", { method: "POST", body: JSON.stringify({ ...input, messageId }) }),
    mailCompleteFollowUp: (followUpId: string) =>
      request<any>(`/ads-marketing-module/mail/followups/${followUpId}/complete`, { method: "POST" }),
    mailDeleteFollowUp: (followUpId: string) =>
      request<any>(`/ads-marketing-module/mail/followups/${followUpId}`, { method: "DELETE" }),
    mailAnalyticsOverview: () => request<any>("/ads-marketing-module/mail/analytics/overview"),
    mailAnalyticsTrend: (days: number = 14) => request<any>(`/ads-marketing-module/mail/analytics/trend?days=${days}`),
    mailAnalyticsCategories: () => request<any>("/ads-marketing-module/mail/analytics/categories"),
    mailAnalyticsSenders: (limit: number = 5) => request<any>(`/ads-marketing-module/mail/analytics/senders?limit=${limit}`),
    mailAnalyticsResponseTimes: () => request<any>("/ads-marketing-module/mail/analytics/response-times"),
    mailAnalyticsHours: () => request<any>("/ads-marketing-module/mail/analytics/hours"),
    mailAnalyticsFolders: () => request<any>("/ads-marketing-module/mail/analytics/folders"),
    mailAnalyticsMailboxes: () => request<any>("/ads-marketing-module/mail/analytics/mailboxes"),
    mailAnalyticsExecutive: () => request<any>("/ads-marketing-module/mail/analytics/executive"),
    mailAttachments: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/attachments${qs ? `?${qs}` : ""}`);
    },
    mailAttachmentStats: () => request<any>("/ads-marketing-module/mail/attachments/stats"),
    mailAttachment: (attachmentId: string) => request<any>(`/ads-marketing-module/mail/attachments/${attachmentId}`),
    mailScanAttachment: (attachmentId: string) =>
      request<any>(`/ads-marketing-module/mail/attachments/${attachmentId}/scan`, { method: "POST" }),
    mailQuarantineAttachment: (attachmentId: string) =>
      request<any>(`/ads-marketing-module/mail/attachments/${attachmentId}/quarantine`, { method: "POST" }),
    mailPresence: () => request<any>("/ads-marketing-module/mail/collab/presence"),
    mailCollaborationSummary: () => request<any>("/ads-marketing-module/mail/collab/summary"),
    mailCommentsForMessage: (messageId: string) => request<any>(`/ads-marketing-module/mail/collab/comments/message/${messageId}`),
    mailCommentsForThread: (threadId: string) => request<any>(`/ads-marketing-module/mail/collab/comments/thread/${threadId}`),
    mailAddComment: (messageId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/collab/comments", { method: "POST", body: JSON.stringify({ ...input, messageId }) }),
    mailDeleteComment: (commentId: string) =>
      request<any>(`/ads-marketing-module/mail/collab/comments/${commentId}`, { method: "DELETE" }),
    mailMessageReactions: (messageId: string) => request<any>(`/ads-marketing-module/mail/collab/reactions/${messageId}`),
    mailAddReaction: (messageId: string, emoji: string, user?: string) =>
      request<any>("/ads-marketing-module/mail/collab/reactions", { method: "POST", body: JSON.stringify({ messageId, emoji, user }) }),
    mailRemoveReaction: (messageId: string, emoji: string, user?: string) =>
      request<any>("/ads-marketing-module/mail/collab/reactions", { method: "DELETE", body: JSON.stringify({ messageId, emoji, user }) }),
    mailCollaborationState: (messageId: string) => request<any>(`/ads-marketing-module/mail/collab/state/${messageId}`),
    mailSharedDrafts: (opts: Record<string, any> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      const qs = params.toString();
      return request<any>(`/ads-marketing-module/mail/collab/drafts${qs ? `?${qs}` : ""}`);
    },
    mailCreateSharedDraft: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/collab/drafts", { method: "POST", body: JSON.stringify({ ...input, mailboxId }) }),
    mailUpdateSharedDraft: (draftId: string, patch: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/collab/drafts/${draftId}`, { method: "PUT", body: JSON.stringify(patch) }),
    mailDeleteSharedDraft: (draftId: string) =>
      request<any>(`/ads-marketing-module/mail/collab/drafts/${draftId}`, { method: "DELETE" }),
    mailResponseTimePrediction: (threadId: string) => request<any>(`/ads-marketing-module/mail/predict/response/${threadId}`),
    mailOutcomePrediction: (messageId: string) => request<any>(`/ads-marketing-module/mail/predict/outcome/${messageId}`),
    mailChurnRisk: (threadId: string) => request<any>(`/ads-marketing-module/mail/predict/churn/${threadId}`),
    mailIntentPrediction: (messageId: string) => request<any>(`/ads-marketing-module/mail/predict/intent/${messageId}`),
    mailRelationshipHealth: (contact: string) => request<any>(`/ads-marketing-module/mail/predict/relationship/${encodeURIComponent(contact)}`),
    mailOptimalSendTime: () => request<any>("/ads-marketing-module/mail/predict/optimal-time"),
    mailWorkloadForecast: (days: number = 7) => request<any>(`/ads-marketing-module/mail/predict/workload?days=${days}`),
    mailNudgeSuggestions: () => request<any>("/ads-marketing-module/mail/predict/nudges"),
    mailSendTimeSuggestion: () => request<any>("/ads-marketing-module/mail/predict/send-time"),
    mailPredictiveDashboard: () => request<any>("/ads-marketing-module/mail/predict/dashboard"),
    mailCreateCampaign: (mailboxId: string, input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/campaigns", { method: "POST", body: JSON.stringify({ ...input, mailboxId }) }),
    mailCampaigns: () => request<any>("/ads-marketing-module/mail/campaigns"),
    mailCampaign: (campaignId: string) => request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}`),
    mailDeleteCampaign: (campaignId: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}`, { method: "DELETE" }),
    mailLaunchCampaign: (campaignId: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/launch`, { method: "POST" }),
    mailApproveCampaign: (campaignId: string, approver?: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/approve`, { method: "POST", body: JSON.stringify({ approver }) }),
    mailRejectCampaign: (campaignId: string, reason?: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    mailPauseCampaign: (campaignId: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/pause`, { method: "POST" }),
    mailResumeCampaign: (campaignId: string) =>
      request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/resume`, { method: "POST" }),
    mailCampaignStats: (campaignId: string) => request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/stats`),
    mailCampaignsDashboard: () => request<any>("/ads-marketing-module/mail/campaigns/dashboard"),
    mailCampaignResponseHandling: (campaignId: string) => request<any>(`/ads-marketing-module/mail/campaigns/${campaignId}/responses`),
    mailCampaignLog: () => request<any>("/ads-marketing-module/mail/campaigns/log"),
    mailDiscoverySearch: (scope: Record<string, any>, opts: Record<string, any> = {}) =>
      request<any>("/ads-marketing-module/mail/discovery/search", { method: "POST", body: JSON.stringify({ scope, opts }) }),
    mailSavedSearches: () => request<any>("/ads-marketing-module/mail/discovery/searches"),
    mailSaveSearch: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/discovery/searches", { method: "POST", body: JSON.stringify(input) }),
    mailRunSavedSearch: (searchId: string) => request<any>(`/ads-marketing-module/mail/discovery/searches/${searchId}`),
    mailDeleteSavedSearch: (searchId: string) =>
      request<any>(`/ads-marketing-module/mail/discovery/searches/${searchId}`, { method: "DELETE" }),
    mailExports: () => request<any>("/ads-marketing-module/mail/discovery/exports"),
    mailCreateExport: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/discovery/exports", { method: "POST", body: JSON.stringify(input) }),
    mailExport: (exportId: string) => request<any>(`/ads-marketing-module/mail/discovery/exports/${exportId}`),
    mailDeleteExport: (exportId: string) =>
      request<any>(`/ads-marketing-module/mail/discovery/exports/${exportId}`, { method: "DELETE" }),
    mailDiscoverySummary: () => request<any>("/ads-marketing-module/mail/discovery/summary"),
    mailRegisterDomain: (input: Record<string, any>) =>
      request<any>("/ads-marketing-module/mail/domains", { method: "POST", body: JSON.stringify(input) }),
    mailDomains: () => request<any>("/ads-marketing-module/mail/domains"),
    mailDomain: (domainId: string) => request<any>(`/ads-marketing-module/mail/domains/${domainId}`),
    mailDeleteDomain: (domainId: string) =>
      request<any>(`/ads-marketing-module/mail/domains/${domainId}`, { method: "DELETE" }),
    mailVerifyDomain: (domainId: string) =>
      request<any>(`/ads-marketing-module/mail/domains/${domainId}/verify`, { method: "POST" }),
    mailDomainHealth: (domainId: string) => request<any>(`/ads-marketing-module/mail/domains/${domainId}/health`),
    mailReputationMonitor: () => request<any>("/ads-marketing-module/mail/domains/monitor"),
    mailSetDomainPolicy: (domainId: string, input: Record<string, any>) =>
      request<any>(`/ads-marketing-module/mail/domains/${domainId}/policies`, { method: "POST", body: JSON.stringify(input) }),
    mailDomainLog: () => request<any>("/ads-marketing-module/mail/domains/log"),
    mailDomainSummary: () => request<any>("/ads-marketing-module/mail/domains/summary"),
  },

  agentSwarm: {
    status: () => request<any>("/agent-swarm/status"),
    execute: (agentName: string, agentType: string, action: string, platform: string, params?: Record<string, unknown>, hitlThreshold?: number) =>
      request<any>("/agent-swarm/execute", { method: "POST", body: JSON.stringify({ agentName, agentType, action, platform, params, hitlThreshold }) }),
    hitlQueue: () => request<any>("/agent-swarm/hitl"),
    resolveHITL: (id: string, approved: boolean, approver: string) =>
      request<any>(`/agent-swarm/hitl/${id}/resolve`, { method: "POST", body: JSON.stringify({ approved, approver }) }),
  },

  budgetOptimizerService: {
    predictROAS: (platform: string, recentROAS?: number) =>
      request<any>("/budget-optimizer-service/predict-roas", { method: "POST", body: JSON.stringify({ platform, recentROAS }) }),
    optimize: (platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number, urgency?: string) =>
      request<any>("/budget-optimizer-service/optimize", { method: "POST", body: JSON.stringify({ platforms, totalBudget, urgency }) }),
    spendPacing: (dailyBudgets: Record<string, number>) =>
      request<any>("/budget-optimizer-service/spend-pacing", { method: "POST", body: JSON.stringify({ dailyBudgets }) }),
    optimizationAdvice: (platforms: { name: string; currentBudget: number; recentROAS?: number }[], totalBudget: number) =>
      request<any>("/budget-optimizer-service/optimization-advice", { method: "POST", body: JSON.stringify({ platforms, totalBudget }) }),
    forecast: (platforms: string[], totalBudget: number, days?: number) =>
      request<any>("/budget-optimizer-service/forecast", { method: "POST", body: JSON.stringify({ platforms, totalBudget, days }) }),
    kalmanPacing: (platform: string, dailyBudget: number, spentHistory: number[], observationNoise?: number, processNoise?: number) =>
      request<any>("/budget-optimizer-service/kalman-pacing", { method: "POST", body: JSON.stringify({ platform, dailyBudget, spentHistory, observationNoise, processNoise }) }),
    kellyAllocate: (platforms: { name: string; expectedROAS: number; winProbability: number }[], totalBudget: number) =>
      request<any>("/budget-optimizer-service/kelly-allocate", { method: "POST", body: JSON.stringify({ platforms, totalBudget }) }),
    efficientFrontier: (platforms: { name: string; expectedReturn: number; variance: number }[], covarianceMatrix?: number[][]) =>
      request<any>("/budget-optimizer-service/efficient-frontier", { method: "POST", body: JSON.stringify({ platforms, covarianceMatrix }) }),
    diminishingReturns: (channelHistory: { spend: number; revenue: number }[]) =>
      request<any>("/budget-optimizer-service/diminishing-returns", { method: "POST", body: JSON.stringify({ channelHistory }) }),
  },

  crossModuleIntegration: {
    matrix: (action?: string) => request<any>(`/cross-module-integration/matrix${action ? `?action=${action}` : ""}`),
    moduleActions: (module: string) => request<any>(`/cross-module-integration/module/${module}/actions`),
    actionTargets: (action: string) => request<any>(`/cross-module-integration/action/${action}/targets`),
    execute: (sourceAction: string, sourceEntity: string) =>
      request<any>("/cross-module-integration/execute", { method: "POST", body: JSON.stringify({ sourceAction, sourceEntity }) }),
    history: () => request<any>("/cross-module-integration/history"),
    dashboard: () => request<any>("/cross-module-integration/dashboard"),
    actionSummary: (action: string) => request<any>(`/cross-module-integration/action/${action}/summary`),
  },

  enhancedAgent: {
    definitions: () => request<any>("/enhanced-agent/definitions"),
    definition: (type: string) => request<any>(`/enhanced-agent/definitions/${type}`),
    schedules: () => request<any>("/enhanced-agent/schedules"),
    status: () => request<any>("/enhanced-agent/status"),
    compliance: () => request<any>("/enhanced-agent/compliance"),
  },

  enhancedAttribution: {
    createPath: (conversionId: string, campaignIds: string[], touchpoints: any[], conversionValue: number, model?: string) =>
      request<any>("/enhanced-attribution/path", { method: "POST", body: JSON.stringify({ conversionId, campaignIds, touchpoints, conversionValue, model }) }),
    dashboard: (model: string) => request<any>(`/enhanced-attribution/dashboard/${model}`),
    compare: () => request<any>("/enhanced-attribution/compare"),
    simulate: (campaignId: string, testDays?: number) =>
      request<any>("/enhanced-attribution/simulate", { method: "POST", body: JSON.stringify({ campaignId, testDays }) }),
  },

  n0va1oGatewayEnhanced: {
    provisionJIT: (platform: string, scopes: string[]) =>
      request<any>("/n0va1o-gateway-enhanced/jit/provision", { method: "POST", body: JSON.stringify({ platform, scopes }) }),
    validateJIT: (sessionId: string) =>
      request<any>("/n0va1o-gateway-enhanced/jit/validate", { method: "POST", body: JSON.stringify({ sessionId }) }),
    revokeJIT: (sessionId: string) =>
      request<any>("/n0va1o-gateway-enhanced/jit/revoke", { method: "POST", body: JSON.stringify({ sessionId }) }),
    activeSessions: () => request<any>("/n0va1o-gateway-enhanced/jit/sessions"),
    createSandbox: (script: string, runtime?: string) =>
      request<any>("/n0va1o-gateway-enhanced/sandbox", { method: "POST", body: JSON.stringify({ script, runtime }) }),
    getSandbox: (sandboxId: string) => request<any>(`/n0va1o-gateway-enhanced/sandbox/${sandboxId}`),
    resolveIntent: (intent: string, platforms: string[]) =>
      request<any>("/n0va1o-gateway-enhanced/intent/resolve", { method: "POST", body: JSON.stringify({ intent, platforms }) }),
    availableIntents: (platform: string) => request<any>(`/n0va1o-gateway-enhanced/intents/${platform}`),
    accounts: (platform?: string) => request<any>(`/n0va1o-gateway-enhanced/accounts${platform ? `?platform=${platform}` : ""}`),
    switchAccount: (fromAccountId: string, toAccountId: string) =>
      request<any>("/n0va1o-gateway-enhanced/accounts/switch", { method: "POST", body: JSON.stringify({ fromAccountId, toAccountId }) }),
    registerWebhook: (source: string, eventType: string, callbackUrl: string) =>
      request<any>("/n0va1o-gateway-enhanced/webhooks", { method: "POST", body: JSON.stringify({ source, eventType, callbackUrl }) }),
    unregisterWebhook: (id: string) => request<void>(`/n0va1o-gateway-enhanced/webhooks/${id}`, { method: "DELETE" }),
    triggerWebhook: (source: string, eventType: string, payload: Record<string, unknown>) =>
      request<any>("/n0va1o-gateway-enhanced/webhooks/trigger", { method: "POST", body: JSON.stringify({ source, eventType, payload }) }),
    webhooks: () => request<any>("/n0va1o-gateway-enhanced/webhooks"),
    catalog: () => request<any>("/n0va1o-gateway-enhanced/catalog"),
  },

  recipeCompilation: {
    compile: (recipe: any) => request<any>("/recipe-compilation/compile", { method: "POST", body: JSON.stringify({ recipe }) }),
    evaluate: (recipeName: string, currentMetrics: Record<string, number>, skipHITL?: boolean) =>
      request<any>("/recipe-compilation/evaluate", { method: "POST", body: JSON.stringify({ recipeName, currentMetrics, skipHITL }) }),
    compiled: (name?: string) => name ? request<any>(`/recipe-compilation/compiled/${name}`) : request<any>("/recipe-compilation/compiled"),
    history: (limit?: number) => request<any>(`/recipe-compilation/history${limit ? `?limit=${limit}` : ""}`),
    recipe: (name: string) => request<any>(`/recipe-compilation/recipes/${name}`),
    recipes: () => request<any>("/recipe-compilation/recipes"),
  },

  securityModifier: {
    applySchema: (action: string, params: Record<string, unknown>) =>
      request<any>("/security-modifier/apply-schema", { method: "POST", body: JSON.stringify({ action, params }) }),
    createHook: (name: string, guardrails: string[], brandSafety: boolean, utmParams: boolean) =>
      request<any>("/security-modifier/before-execution-hook", { method: "POST", body: JSON.stringify({ name, guardrails, brandSafety, utmParams }) }),
    checkExecution: (hook: any, action: string, params: Record<string, unknown>) =>
      request<any>("/security-modifier/check-execution", { method: "POST", body: JSON.stringify({ hook, action, params }) }),
    afterExecution: (payload: any, maxSize?: number) =>
      request<any>("/security-modifier/after-execution", { method: "POST", body: JSON.stringify({ payload, maxSize }) }),
    createHITL: (actionId: string, actionDescription: string, value: number, threshold: number) =>
      request<any>("/security-modifier/hitl", { method: "POST", body: JSON.stringify({ actionId, actionDescription, value, threshold }) }),
    resolveHITL: (id: string, approved: boolean, digitalSignature: string) =>
      request<any>(`/security-modifier/hitl/${id}/resolve`, { method: "POST", body: JSON.stringify({ approved, digitalSignature }) }),
    escalateHITL: (id: string) => request<any>(`/security-modifier/hitl/${id}/escalate`, { method: "POST" }),
    pendingHITL: () => request<any>("/security-modifier/hitl/pending"),
    modifiers: () => request<any>("/security-modifier/modifiers"),
  },

  channelMixOptimizer: {
    analyze: () => request<any>("/channel-mix-optimizer"),
    orchestrate: () => request<any>("/channel-mix-optimizer/orchestrate"),
  },

  formAnalytics: {
    analyze: () => request<any>("/form-analytics"),
    orchestrate: () => request<any>("/form-analytics/orchestrate"),
  },

  keywordInsights: {
    analyze: () => request<any>("/keyword-insights"),
    orchestrate: () => request<any>("/keyword-insights/orchestrate"),
  },

  orchestratorRegistry: {
    all: () => request<any>("/orchestrator-registry"),
    health: () => request<any>("/orchestrator-registry/health"),
    byDomain: (domain: string) => request<any>(`/orchestrator-registry/domain/${domain}`),
  },

  portfolio: {
    health: () => request<any>("/portfolio/health"),
    advice: () => request<any>("/portfolio/advice"),
    budgetAlerts: () => request<any>("/portfolio/budget/alerts"),
    criticalAlerts: () => request<any>("/portfolio/budget/alerts/critical"),
  },

  swarm: {
    dashboard: () => request<any>("/swarm/orchestrate/dashboard"),
    execute: (agentName: string, agentType: string, action: string, platform: string, params?: Record<string, unknown>, hitlThreshold?: number) =>
      request<any>("/swarm/orchestrate/execute", { method: "POST", body: JSON.stringify({ agentName, agentType, action, platform, params, hitlThreshold }) }),
    hitlQueue: () => request<any>("/swarm/orchestrate/hitl"),
    resolveHITL: (id: string, approved: boolean, approver: string) =>
      request<any>(`/swarm/orchestrate/hitl/${id}/resolve`, { method: "POST", body: JSON.stringify({ approved, approver }) }),
    executions: () => request<any>("/swarm/orchestrate/executions"),
  },

  creativeAiEnhanced: {
    mabSelect: (variants: any[]) => request<any>("/creative-ai/enhanced/mab/select", { method: "POST", body: JSON.stringify({ variants }) }),
    mabRecord: (variantKey: string, converted: boolean) =>
      request<any>("/creative-ai/enhanced/mab/record", { method: "POST", body: JSON.stringify({ variantKey, converted }) }),
    mabVariants: () => request<any>("/creative-ai/enhanced/mab/variants"),
    fatigue: (creativeHistory: any[]) =>
      request<any>("/creative-ai/enhanced/fatigue", { method: "POST", body: JSON.stringify({ creativeHistory }) }),
    abTestSimulate: (variants: any[], visitorsPerDay?: number, days?: number) =>
      request<any>("/creative-ai/enhanced/ab-test-simulate", { method: "POST", body: JSON.stringify({ variants, visitorsPerDay, days }) }),
  },

  audienceInsightsEnhanced: {
    pca: (data: number[][], nComponents?: number) =>
      request<any>("/audience-insights/enhanced/pca", { method: "POST", body: JSON.stringify({ data, nComponents }) }),
    gmm: (data: number[][], k?: number) =>
      request<any>("/audience-insights/enhanced/gmm", { method: "POST", body: JSON.stringify({ data, k }) }),
    rfm: (customers: any[]) => request<any>("/audience-insights/enhanced/rfm", { method: "POST", body: JSON.stringify({ customers }) }),
    lookalike: (seedAudience: any[], candidatePool: any[], targetSize?: number) =>
      request<any>("/audience-insights/enhanced/lookalike", { method: "POST", body: JSON.stringify({ seedAudience, candidatePool, targetSize }) }),
  },

  campaignAlertOrchestrator: {
    rules: (status?: string) => request<any>(`/campaign-alert-orchestrator/rules${status ? `?status=${status}` : ""}`),
    rule: (ruleId: string) => request<any>(`/campaign-alert-orchestrator/rules/${ruleId}`),
    createRule: (rule: any) => request<any>("/campaign-alert-orchestrator/rules", { method: "POST", body: JSON.stringify(rule) }),
    updateRule: (ruleId: string, updates: any) =>
      request<any>(`/campaign-alert-orchestrator/rules/${ruleId}`, { method: "PUT", body: JSON.stringify(updates) }),
    deleteRule: (ruleId: string) => request<void>(`/campaign-alert-orchestrator/rules/${ruleId}`, { method: "DELETE" }),
    evaluate: () => request<any>("/campaign-alert-orchestrator/evaluate", { method: "POST" }),
    alerts: (status?: string, limit?: number) =>
      request<any>(`/campaign-alert-orchestrator/alerts${status ? `?status=${status}` : ""}${limit ? `${status ? "&" : "?"}limit=${limit}` : ""}`),
    acknowledgeAlert: (alertId: string, userId?: string) =>
      request<any>(`/campaign-alert-orchestrator/alerts/${alertId}/acknowledge`, { method: "POST", body: JSON.stringify({ userId }) }),
    resolveAlert: (alertId: string, userId?: string) =>
      request<any>(`/campaign-alert-orchestrator/alerts/${alertId}/resolve`, { method: "POST", body: JSON.stringify({ userId }) }),
    dismissAlert: (alertId: string) =>
      request<any>(`/campaign-alert-orchestrator/alerts/${alertId}/dismiss`, { method: "POST" }),
    summary: () => request<any>("/campaign-alert-orchestrator/summary"),
    suggestRules: () => request<any>("/campaign-alert-orchestrator/suggest-rules"),
    batchAlertAction: (alertIds: string[], action: string, userId?: string) =>
      request<any>("/campaign-alert-orchestrator/alerts/batch", { method: "POST", body: JSON.stringify({ alertIds, action, userId }) }),
    priorityInbox: () => request<any>("/campaign-alert-orchestrator/priority-inbox"),
    smartMute: () => request<any>("/campaign-alert-orchestrator/smart-mute", { method: "POST" }),
    escalate: (escalationContact?: string) =>
      request<any>("/campaign-alert-orchestrator/escalate", { method: "POST", body: JSON.stringify({ escalationContact }) }),
    dailyDigest: () => request<any>("/campaign-alert-orchestrator/daily-digest"),
  },
  campaignExperimentation: {
    list: (status?: string) => request<any>(`/campaign-experimentation/experiments${status ? `?status=${status}` : ""}`),
    get: (expId: string) => request<any>(`/campaign-experimentation/experiments/${expId}`),
    create: (data: any) => request<any>("/campaign-experimentation/experiments", { method: "POST", body: JSON.stringify(data) }),
    update: (expId: string, updates: any) =>
      request<any>(`/campaign-experimentation/experiments/${expId}`, { method: "PUT", body: JSON.stringify(updates) }),
    delete: (expId: string) => request<void>(`/campaign-experimentation/experiments/${expId}`, { method: "DELETE" }),
    start: (expId: string) => request<any>(`/campaign-experimentation/experiments/${expId}/start`, { method: "POST" }),
    complete: (expId: string) => request<any>(`/campaign-experimentation/experiments/${expId}/complete`, { method: "POST" }),
    recordMetrics: (expId: string, variantId: string, date: string, metrics: any) =>
      request<any>(`/campaign-experimentation/experiments/${expId}/metrics`, { method: "POST", body: JSON.stringify({ variantId, date, metrics }) }),
    summary: () => request<any>("/campaign-experimentation/summary"),
    dashboard: () => request<any>("/campaign-experimentation/dashboard"),
    quickStart: (data: any) => request<any>("/campaign-experimentation/quick-start", { method: "POST", body: JSON.stringify(data) }),
    batchComplete: (expIds: string[]) => request<any>("/campaign-experimentation/batch-complete", { method: "POST", body: JSON.stringify({ expIds }) }),
  },

  campaignBudgetSimulator: {
    simulate: (config: any, runs?: number) =>
      request<any>("/campaign-budget-simulator/simulate", { method: "POST", body: JSON.stringify({ config, runs }) }),
    scenario: (configs: any[], runs?: number) =>
      request<any>("/campaign-budget-simulator/scenario", { method: "POST", body: JSON.stringify({ configs, runs }) }),
    history: () => request<any>("/campaign-budget-simulator/history"),
    summary: () => request<any>("/campaign-budget-simulator/summary"),
  },

  campaignInsightsEngine: {
    dashboard: () => request<any>("/campaign-insights-engine/dashboard"),
    analyzeCampaign: (campaignId: string) => request<any>(`/campaign-insights-engine/campaign/${campaignId}/analyze`),
    campaignTrends: (campaignId: string) => request<any>(`/campaign-insights-engine/campaign/${campaignId}/trends`),
    correlations: () => request<any>("/campaign-insights-engine/correlations"),
    budgetEfficiency: () => request<any>("/campaign-insights-engine/budget-efficiency"),
    crossAttribution: () => request<any>("/campaign-insights-engine/cross-attribution"),
    predictiveAlerts: () => request<any>("/campaign-insights-engine/predictive-alerts"),
    acknowledgeBatch: (insightIds: string[], action?: string) =>
      request<any>("/campaign-insights-engine/acknowledge-batch", { method: "POST", body: JSON.stringify({ insightIds, action: action || "acknowledge" }) }),
    prioritySummary: () => request<any>("/campaign-insights-engine/priority-summary"),
    exportInsights: (format?: string) => request<any>(`/campaign-insights-engine/export${format ? `?format=${format}` : ""}`),
    trendForecast: (metric?: string, days?: number) => {
      const params = new URLSearchParams();
      if (metric) params.set("metric", metric);
      if (days) params.set("days", String(days));
      return request<any>(`/campaign-insights-engine/trend-forecast?${params.toString()}`);
    },
    campaignRanking: () => request<any>("/campaign-insights-engine/campaign-ranking"),
  },

  campaignPerformanceDiagnostics: {
    diagnose: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/diagnose`),
    rootCauses: () => request<any>("/campaign-performance-diagnostics/root-causes"),
    crossCampaign: () => request<any>("/campaign-performance-diagnostics/cross-campaign"),
    metricHealth: () => request<any>("/campaign-performance-diagnostics/metric-health"),
    recoveryPlan: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/recovery-plan`),
    remediate: (findingId: string, action: string, metricBefore: number, metricAfter: number) =>
      request<any>("/campaign-performance-diagnostics/remediate", { method: "POST", body: JSON.stringify({ findingId, action, metricBefore, metricAfter }) }),
    trendAnalysis: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/trend-analysis`),
    compare: (campaignIdA: string, campaignIdB: string) => request<any>(`/campaign-performance-diagnostics/compare/${campaignIdA}/${campaignIdB}`),
    severityBreakdown: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/severity-breakdown`),
    fixRecommendation: (findingId: string) => request<any>(`/campaign-performance-diagnostics/fix-recommendation/${findingId}`),
    timeline: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/timeline`),
    export: (campaignId: string) => request<any>(`/campaign-performance-diagnostics/campaign/${campaignId}/export`),
  },

  campaignDaypartingOptimizer: {
    analyze: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/analyze`),
    schedule: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/schedule`),
    plan: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/plan`),
    timePatterns: () => request<any>("/campaign-dayparting-optimizer/time-patterns"),
    scheduleConflicts: () => request<any>("/campaign-dayparting-optimizer/schedule-conflicts"),
    timezonePerformance: () => request<any>("/campaign-dayparting-optimizer/timezone-performance"),
    forecast: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/forecast`),
    hourlyTrends: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/hourly-trends`),
    roiAnalysis: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/roi-analysis`),
    slotOptimization: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/slot-optimization`),
    weekendVsWeekday: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/weekend-vs-weekday`),
    heatmap: (campaignId: string) => request<any>(`/campaign-dayparting-optimizer/campaign/${campaignId}/heatmap`),
  },

  campaignROIDecomposition: {
    decompose: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/decompose`),
    attribution: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/attribution`),
    marginalReturns: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/marginal-returns`),
    sensitivity: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/sensitivity`),
    forecastByFactor: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/forecast-by-factor`),
    trends: () => request<any>("/campaign-roi-decomposition/decomposition-trends"),
    benchmark: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/benchmark`),
    scenarioSimulation: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/scenario-simulation`),
    channelBreakdown: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/channel-breakdown`),
    optimizationTargets: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/optimization-targets`),
    attributionShift: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/attribution-shift`),
    factorCorrelations: (campaignId: string) => request<any>(`/campaign-roi-decomposition/campaign/${campaignId}/factor-correlations`),
  },

  campaignAdQualityAnalyzer: {
    analyze: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/analyze`),
    qualityScore: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/quality-score`),
    relevance: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/relevance`),
    improvementPlan: (campaignId: string, target?: number) =>
      request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/improvement-plan${target ? `?target=${target}` : ""}`),
    competitive: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/competitive`),
    trends: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/trends`),
    creativeQuality: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/creative-quality`),
    landingPageExperience: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/landing-page-experience`),
    qualityByDevice: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/quality-by-device`),
    qualityByPlacement: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/quality-by-placement`),
    qualityPrediction: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/quality-prediction`),
    competitiveLandscape: (campaignId: string) => request<any>(`/campaign-ad-quality-analyzer/campaign/${campaignId}/competitive-landscape`),
  },

  campaignAudienceExpansion: {
    lookalike: (seedAudienceId?: string) =>
      request<any>(`/campaign-audience-expansion/lookalike${seedAudienceId ? `?seedAudienceId=${seedAudienceId}` : ""}`),
    recommendations: (campaignId: string) => request<any>(`/campaign-audience-expansion/campaign/${campaignId}/recommendations`),
    similarity: (audienceA: string, audienceB: string) =>
      request<any>(`/campaign-audience-expansion/similarity?audienceA=${encodeURIComponent(audienceA)}&audienceB=${encodeURIComponent(audienceB)}`),
    quality: (seedAudienceId: string, expandedAudienceId: string) =>
      request<any>(`/campaign-audience-expansion/quality?seedAudienceId=${encodeURIComponent(seedAudienceId)}&expandedAudienceId=${encodeURIComponent(expandedAudienceId)}`),
    unification: (platformA?: string, platformB?: string) =>
      request<any>(`/campaign-audience-expansion/unification${platformA ? `?platformA=${platformA}&platformB=${platformB}` : ""}`),
    performance: (audienceId: string) => request<any>(`/campaign-audience-expansion/performance?audienceId=${encodeURIComponent(audienceId)}`),
    sourceAnalysis: () => request<any>("/campaign-audience-expansion/source-analysis"),
    overlapAnalysis: (audienceIds: string[]) => request<any>(`/campaign-audience-expansion/overlap-analysis?audienceIds=${audienceIds.join(",")}`),
    segmentationSuggestions: () => request<any>("/campaign-audience-expansion/segmentation-suggestions"),
    valueForecast: (audienceId: string) => request<any>(`/campaign-audience-expansion/value-forecast?audienceId=${encodeURIComponent(audienceId)}`),
    saturationAnalysis: () => request<any>("/campaign-audience-expansion/saturation-analysis"),
    compositionAnalysis: () => request<any>("/campaign-audience-expansion/composition-analysis"),
  },

  campaignCrossDeviceAnalyzer: {
    analyze: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/analyze`),
    recommendations: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/recommendations`),
    conversionPaths: () => request<any>("/campaign-cross-device-analyzer/conversion-paths"),
    bidAdjustments: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/bid-adjustments`),
    audienceOverlap: () => request<any>("/campaign-cross-device-analyzer/audience-overlap"),
    deviceTrends: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/trends`),
    deviceGraph: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/device-graph`),
    attributionModeling: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/attribution-modeling`),
    affinityScoring: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/affinity-scoring`),
    journeySequencing: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/journey-sequencing`),
    performanceForecast: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/performance-forecast`),
    optimizationSimulator: (campaignId: string) => request<any>(`/campaign-cross-device-analyzer/campaign/${campaignId}/optimization-simulator`),
  },

  campaignGeoPerformanceAnalyzer: {
    geoPerformance: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-performance`),
    geoRecommendations: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-recommendations`),
    expansionOpportunities: () => request<any>("/campaign-geo-performance-analyzer/expansion-opportunities"),
    geoBidAdjustments: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-bid-adjustments`),
    geoAudienceOverlap: () => request<any>("/campaign-geo-performance-analyzer/geo-audience-overlap"),
    geoTrends: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-trends`),
    geoRegionClustering: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-region-clustering`),
    geoTimeZoneAnalysis: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-timezone-analysis`),
    geoLocalizationScores: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-localization-scores`),
    geoCrossBorder: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-cross-border`),
    geoPredictiveExpansion: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-predictive-expansion`),
    geoCompetitiveLandscape: (campaignId: string) => request<any>(`/campaign-geo-performance-analyzer/campaign/${campaignId}/geo-competitive-landscape`),
  },

  campaignFrequencyAnalyzer: {
    frequencyDistribution: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/frequency-distribution`),
    optimizationRecommendations: () => request<any>("/campaign-frequency-analyzer/optimization-recommendations"),
    wearOutCurve: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/wear-out-curve`),
    frequencyCapping: () => request<any>("/campaign-frequency-analyzer/frequency-capping"),
    crossCampaignFrequency: () => request<any>("/campaign-frequency-analyzer/cross-campaign-frequency"),
    frequencyImpact: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/frequency-impact`),
    segmentFrequency: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/segment-frequency`),
    attributionFrequency: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/attribution-frequency`),
    diminishingReturns: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/diminishing-returns`),
    competitiveBenchmarks: () => request<any>("/campaign-frequency-analyzer/competitive-benchmarks"),
    formatFrequency: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/format-frequency`),
    deviceFrequency: (campaignId: string) => request<any>(`/campaign-frequency-analyzer/campaign/${campaignId}/device-frequency`),
  },

  campaignSegmentDiscovery: {
    segments: () => request<any>("/campaign-segment-discovery/segments"),
    segmentPerformance: () => request<any>("/campaign-segment-discovery/segment-performance"),
    segmentTargeting: () => request<any>("/campaign-segment-discovery/segment-targeting"),
    segmentComparison: () => request<any>("/campaign-segment-discovery/segment-comparison"),
    segmentTrends: () => request<any>("/campaign-segment-discovery/segment-trends"),
    segmentOverlap: () => request<any>("/campaign-segment-discovery/segment-overlap"),
    segmentLookalikeModeling: (seedSegmentName?: string) =>
      request<any>(`/campaign-segment-discovery/segment-lookalike-modeling${seedSegmentName ? `?seedSegmentName=${encodeURIComponent(seedSegmentName)}` : ""}`),
    segmentPropensityScoring: () => request<any>("/campaign-segment-discovery/segment-propensity-scoring"),
    segmentLifecycleAnalysis: () => request<any>("/campaign-segment-discovery/segment-lifecycle-analysis"),
    segmentCrossSellAnalysis: () => request<any>("/campaign-segment-discovery/segment-cross-sell-analysis"),
    segmentAttributionByChannel: () => request<any>("/campaign-segment-discovery/segment-attribution-by-channel"),
    segmentOptimizationScorecard: () => request<any>("/campaign-segment-discovery/segment-optimization-scorecard"),
  },

  campaignGoalTracker: {
    progress: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/progress`),
    attainment: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/attainment`),
    adjustments: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/adjustments`),
    conflicts: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/conflicts`),
    compare: () => request<any>("/campaign-goal-tracker/compare"),
    trendForecast: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/trend-forecast`),
    goalCascading: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-cascading`),
    goalAttribution: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-attribution`),
    goalStressTesting: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-stress-testing`),
    goalOptimization: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-optimization`),
    goalDependencyGraph: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-dependency-graph`),
    goalBenchmarking: (campaignId: string) => request<any>(`/campaign-goal-tracker/campaign/${campaignId}/goal-benchmarking`),
  },

  campaignAdPlacementAnalyzer: {
    placementPerformance: (campaignId: string) => request<any>(`/campaign-ad-placement-analyzer/campaign/${campaignId}/placement-performance`),
    placementRecommendations: (campaignId: string) => request<any>(`/campaign-ad-placement-analyzer/campaign/${campaignId}/placement-recommendations`),
    placementOpportunities: () => request<any>("/campaign-ad-placement-analyzer/placement-opportunities"),
    placementBidAdjustments: (campaignId: string) => request<any>(`/campaign-ad-placement-analyzer/campaign/${campaignId}/placement-bid-adjustments`),
    placementOverlap: () => request<any>("/campaign-ad-placement-analyzer/placement-overlap"),
    placementTrends: (campaignId: string) => request<any>(`/campaign-ad-placement-analyzer/campaign/${campaignId}/placement-trends`),
  },

  campaignAdFormatAnalyzer: {
    formatPerformance: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-performance`),
    formatRecommendations: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-recommendations`),
    formatOpportunities: () => request<any>("/campaign-ad-format-analyzer/format-opportunities"),
    formatBidAdjustments: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-bid-adjustments`),
    audienceFormatPreference: () => request<any>("/campaign-ad-format-analyzer/audience-format-preference"),
    formatTrends: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-trends`),
    formatCrossDevice: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-cross-device`),
    formatCreativeEffectiveness: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-creative-effectiveness`),
    formatSegmentMapping: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-segment-mapping`),
    formatCompetitiveAnalysis: () => request<any>("/campaign-ad-format-analyzer/format-competitive-analysis"),
    formatROIAttribution: (campaignId: string) => request<any>(`/campaign-ad-format-analyzer/campaign/${campaignId}/format-roi-attribution`),
    formatLifecycleAnalysis: () => request<any>("/campaign-ad-format-analyzer/format-lifecycle-analysis"),
  },

  campaignCustomerJourney: {
    journeys: () => request<any>("/campaign-customer-journey/journeys"),
    journeySegments: () => request<any>("/campaign-customer-journey/journey-segments"),
    journeyOptimizations: () => request<any>("/campaign-customer-journey/journey-optimizations"),
    journeyDropOffs: () => request<any>("/campaign-customer-journey/journey-drop-offs"),
    journeyTimeBuckets: () => request<any>("/campaign-customer-journey/journey-time-buckets"),
    commonPaths: () => request<any>("/campaign-customer-journey/common-paths"),
    journeyPathClusters: () => request<any>("/campaign-customer-journey/journey-path-clusters"),
    journeyAttributionModeling: () => request<any>("/campaign-customer-journey/journey-attribution-modeling"),
    journeyChurnPrediction: () => request<any>("/campaign-customer-journey/journey-churn-prediction"),
    journeyLifecycleStages: () => request<any>("/campaign-customer-journey/journey-lifecycle-stages"),
    journeyTouchpointEffectiveness: () => request<any>("/campaign-customer-journey/journey-touchpoint-effectiveness"),
    journeySequenceAnalysis: () => request<any>("/campaign-customer-journey/journey-sequence-analysis"),
    journeySummaryDashboard: () => request<any>("/campaign-customer-journey/journey-summary-dashboard"),
  },

  campaignConversionFunnelAnalyzer: {
    funnel: (campaignId: string) => request<any>(`/campaign-conversion-funnel-analyzer/campaign/${campaignId}/funnel`),
    dropOffs: (campaignId: string) => request<any>(`/campaign-conversion-funnel-analyzer/campaign/${campaignId}/drop-offs`),
    optimizations: (campaignId: string) => request<any>(`/campaign-conversion-funnel-analyzer/campaign/${campaignId}/optimizations`),
    compare: (campaignIds: string[]) => request<any>("/campaign-conversion-funnel-analyzer/compare", { method: "POST", body: JSON.stringify({ campaignIds }) }),
    segments: (campaignId: string) => request<any>(`/campaign-conversion-funnel-analyzer/campaign/${campaignId}/segments`),
    trends: (campaignId: string) => request<any>(`/campaign-conversion-funnel-analyzer/campaign/${campaignId}/trends`),
  },

  campaignKeywordAnalyzer: {
    keywords: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/keywords`),
    gaps: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/gaps`),
    clusters: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/clusters`),
    bidRecommendations: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/bid-recommendations`),
    trends: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/trends`),
    searchTermOverlap: (campaignId: string, tenantIdA?: string, tenantIdB?: string) =>
      request<any>("/campaign-keyword-analyzer/search-term-overlap", { method: "POST", body: JSON.stringify({ campaignId, tenantIdA, tenantIdB }) }),
    performanceForecast: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/performance-forecast`),
    competitiveAnalysis: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/competitive-analysis`),
    matchTypeAnalysis: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/match-type-analysis`),
    seasonalityAnalysis: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/seasonality-analysis`),
    semanticClustering: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/semantic-clustering`),
    roiAttribution: (campaignId: string) => request<any>(`/campaign-keyword-analyzer/campaign/${campaignId}/roi-attribution`),
  },

  campaignCreativeOptimizer: {
    performance: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/performance`),
    fatigue: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/fatigue`),
    recommendations: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/recommendations`),
    abTests: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/ab-tests`),
    mix: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/mix`),
    trends: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/trends`),
    performanceForecast: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/performance-forecast`),
    audienceAlignment: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/audience-alignment`),
    competitiveAnalysis: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/competitive-analysis`),
    lifecycle: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/lifecycle`),
    roiAnalysis: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/roi-analysis`),
    optimizationHistory: (campaignId: string) => request<any>(`/campaign-creative-optimizer/campaign/${campaignId}/optimization-history`),
  },

  campaignLandingPageAnalyzer: {
    analysis: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/analysis`),
    speedImpact: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/speed-impact`),
    contentGaps: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/content-gaps`),
    pageSegmentation: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/page-segmentation`),
    layoutRecommendations: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/layout-recommendations`),
    trends: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/trends`),
    abTestAnalysis: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/ab-test-analysis`),
    formAnalysis: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/form-analysis`),
    heatmapPrediction: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/heatmap-prediction`),
    accessibilityAudit: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/accessibility-audit`),
    conversionPathAnalysis: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/conversion-path-analysis`),
    competitiveBenchmark: (campaignId: string) => request<any>(`/campaign-landing-page-analyzer/campaign/${campaignId}/competitive-benchmark`),
  },

  campaignSocialSentimentAnalyzer: {
    sentiment: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/sentiment`),
    trendingTopics: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/trending-topics`),
    influencerImpact: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/influencer-impact`),
    platformSentiment: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/platform-sentiment`),
    emotionalTone: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/emotional-tone`),
    sentimentTrends: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/sentiment-trends`),
    keywordAnalysis: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/keyword-analysis`),
    competitorComparison: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/competitor-comparison`),
    alertThresholds: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/alert-thresholds`),
    actionableInsights: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/actionable-insights`),
    shareOfVoice: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/share-of-voice`),
    forecast: (campaignId: string) => request<any>(`/campaign-social-sentiment-analyzer/campaign/${campaignId}/forecast`),
  },

  campaignRetargetingAnalyzer: {
    audiences: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/audiences`),
    funnel: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/funnel`),
    channels: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/channels`),
    bidRecommendations: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/bid-recommendations`),
    crossChannel: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/cross-channel`),
    trends: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/trends`),
    segmentPerformance: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/segment-performance`),
    frequencyAnalysis: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/frequency-analysis`),
    liftMeasurement: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/lift-measurement`),
    creativePerformance: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/creative-performance`),
    roiCalculator: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/roi-calculator`),
    predictiveModeling: (campaignId: string) => request<any>(`/campaign-retargeting-analyzer/campaign/${campaignId}/predictive-modeling`),
  },

  campaignRealTimeMonitor: {
    liveMetrics: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/live-metrics`),
    anomalies: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/anomalies`),
    velocity: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/velocity`),
    budgetPacing: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/budget-pacing`),
    liveAlerts: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/live-alerts`),
    forecast: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/forecast`),
    comparison: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/comparison`),
    spikes: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/spikes`),
    correlations: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/correlations`),
    breakdown: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/breakdown`),
    alertHistory: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/alert-history`),
    dashboard: (campaignId: string) => request<any>(`/campaign-real-time-monitor/campaign/${campaignId}/dashboard`),
  },

  campaignAttributionModeling: {
    attribution: (campaignId: string, model?: string) => {
      const params = model ? `?model=${model}` : "";
      return request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution${params}`);
    },
    shapley: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/shapley`),
    markov: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/markov`),
    compare: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/compare`),
    channels: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/channels`),
    insights: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/insights`),
    customModel: (campaignId: string, config: any) => request(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/custom`, { method: "POST", body: JSON.stringify({ config }) }),
    channelContribution: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/channel-contribution`),
    roiDistribution: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/roi-distribution`),
    timeToConvert: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/time-to-convert`),
    crossCampaign: (campaignIds: string[]) => request("/campaign-attribution-modeling/attribution/cross-campaign", { method: "POST", body: JSON.stringify({ campaignIds }) }),
    whatIf: (campaignId: string) => request<any>(`/campaign-attribution-modeling/campaign/${campaignId}/attribution/what-if`),
  },

  campaignAIBiddingAgent: {
    biddingDashboard: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/bidding-dashboard`),
    auctionInsights: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/auction-insights`),
    bidAdjustments: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/bid-adjustments`),
    bidScenario: (campaignId: string, scenario: any) => request(`/campaign-ai-bidding-agent/campaign/${campaignId}/bid-scenario`, { method: "POST", body: JSON.stringify(scenario) }),
    bidEfficiency: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/bid-efficiency`),
    bidStrategy: (campaignId: string, goal?: string) => {
      const params = goal ? `?goal=${goal}` : "";
      return request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/bid-strategy${params}`);
    },
    competitorAnalysis: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/competitor-analysis`),
    historicalTrends: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/historical-trends`),
    opportunityAnalysis: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/opportunity-analysis`),
    portfolioOptimization: (campaigns: any[]) => request("/campaign-ai-bidding-agent/portfolio-optimization", { method: "POST", body: JSON.stringify({ campaigns }) }),
    bidAnomalies: (campaignId: string) => request<any>(`/campaign-ai-bidding-agent/campaign/${campaignId}/bid-anomalies`),
    scenarioComparison: (campaignId: string, scenarios: any[]) => request(`/campaign-ai-bidding-agent/campaign/${campaignId}/scenario-comparison`, { method: "POST", body: JSON.stringify({ scenarios }) }),
  },
};
