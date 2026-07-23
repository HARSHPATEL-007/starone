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
    delete: (id: string) => request<void>(`/campaigns/${id}`, { method: "DELETE" }),
    dashboard: () => request<any>("/campaigns/dashboard"),
  },
  agents: {
    list: () => request<any[]>("/agents"),
    defaults: () => request<any[]>("/agents/defaults"),
    create: (data: Record<string, unknown>) =>
      request<any>("/agents", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/agents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: "DELETE" }),
  },
  platforms: {
    list: () => request<any[]>("/platforms"),
    connect: (data: Record<string, unknown>) =>
      request<any>("/platforms/connect", { method: "POST", body: JSON.stringify(data) }),
    execute: (data: Record<string, unknown>) =>
      request<any>("/platforms/execute", { method: "POST", body: JSON.stringify(data) }),
    health: () => request<any>("/platforms/health"),
  },
  creatives: {
    list: (params?: string) => request<any[]>(`/creatives${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/creatives", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/creatives/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (id: string) => request<void>(`/creatives/${id}`, { method: "DELETE" }),
  },
  audiences: {
    list: (params?: string) => request<any[]>(`/audiences${params ? `?${params}` : ""}`),
    create: (data: Record<string, unknown>) =>
      request<any>("/audiences", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<any>(`/audiences/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/audiences/${id}`, { method: "DELETE" }),
  },
};
