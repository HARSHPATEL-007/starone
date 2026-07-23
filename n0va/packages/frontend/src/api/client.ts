const API_BASE = "/api/v1";
const TENANT_ID = "tenant_001";
const USER_TOKEN = btoa(JSON.stringify({ userId: "user_001", tenantId: TENANT_ID, role: "admin" }));

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${USER_TOKEN}`,
    "x-tenant-id": TENANT_ID,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

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
  },
  agents: {
    list: () => request<any[]>("/agents"),
    get: (id: string) => request<any>(`/agents/${id}`),
    defaults: () => request<any[]>("/agents/defaults"),
    create: (data: Record<string, unknown>) =>
      request<any>("/agents", { method: "POST", body: JSON.stringify(data) }),
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
    creativeFatigue: (data?: Record<string, unknown>) =>
      request<any>("/optimizer/creative/fatigue", { method: "POST", body: JSON.stringify(data || {}) }),
    creativeMock: () => request<any>("/optimizer/creative/mock"),
    abTest: (type = "creative") => request<any>(`/optimizer/ab-test/${type}`),
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
};
