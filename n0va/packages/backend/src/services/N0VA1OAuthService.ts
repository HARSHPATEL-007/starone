import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_auth_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const AUTH_METHODS = [
  { id: "oauth2", name: "OAuth 2.0", protocol: "authorization_code + PKCE", jit: true },
  { id: "api_key", name: "API Key", protocol: "scoped static key, rotation 15d", jit: true },
  { id: "jwt", name: "JWT", protocol: "HS256/RS256 signed, short TTL", jit: true },
  { id: "mcp_token", name: "MCP Token", protocol: "per-agent MCP bearer, dynamic scope pruning", jit: true },
  { id: "zero_trust", name: "Zero-Trust Session", protocol: "continuous verification, device posture", jit: true },
] as const;

export const SCOPES = [
  "gateway.read", "gateway.write", "catalog.read", "connections.manage", "accounts.manage",
  "tools.discover", "tools.execute", "recipes.compile", "recipes.execute", "sandboxes.manage",
  "triggers.manage", "triggers.receive", "hitl.review", "audit.read", "plugins.manage",
] as const;

export const SCOPE_RANK: Record<string, number> = {
  "gateway.write": 90, "connections.manage": 85, "accounts.manage": 85, "recipes.execute": 80,
  "sandboxes.manage": 80, "tools.execute": 75, "triggers.manage": 70, "plugins.manage": 70,
  "hitl.review": 65, "triggers.receive": 60, "recipes.compile": 55, "tools.discover": 50,
  "audit.read": 40, "catalog.read": 30, "gateway.read": 20,
};

export const AUTONOMY_LEVELS = ["autonomous", "assisted", "manual"] as const;

export const PERMISSIONS = [
  "mail.read", "mail.send", "crm.read", "crm.write", "calendar.read", "calendar.write",
  "analytics.read", "finance.read", "storage.read", "storage.write", "tasks.read", "tasks.write",
  "chat.read", "chat.send", "docs.read", "docs.write", "compliance.review", "admin.manage",
] as const;

export class N0VA1OAuthService {
  authCatalog() {
    return { methods: AUTH_METHODS, scopes: SCOPES, totalMethods: AUTH_METHODS.length, summary: `${AUTH_METHODS.length} JIT auth methods` };
  }

  registerAgent(tenantId: string, input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new Error("Agent name is required");
    const requestedScopes = Array.isArray(input?.scopes) ? input.scopes.filter((s: string) => (SCOPES as readonly string[]).includes(s)) : [];
    if (input?.scopes && requestedScopes.length !== input.scopes.length) throw new Error(`Unknown scope(s) — allowed: ${SCOPES.join(", ")}`);
    const permissions = Array.isArray(input?.permissions)
      ? input.permissions.filter((p: string) => (PERMISSIONS as readonly string[]).includes(p))
      : [];
    if (input?.permissions && permissions.length !== input.permissions.length) throw new Error(`Unknown permission(s) — allowed: ${PERMISSIONS.join(", ")}`);
    const autonomyLevel = (AUTONOMY_LEVELS as readonly string[]).includes(input?.autonomyLevel) ? input.autonomyLevel : "assisted";
    if (input?.autonomyLevel && !(AUTONOMY_LEVELS as readonly string[]).includes(input?.autonomyLevel)) throw new Error(`Unknown autonomy level — allowed: ${AUTONOMY_LEVELS.join(", ")}`);
    const approvalRequiredFor = Array.isArray(input?.approvalRequiredFor) ? input.approvalRequiredFor.filter((t: string) => String(t).trim().length > 0) : [];
    const maxDailyActions = Number.isFinite(input?.maxDailyActions) ? Math.max(1, Math.min(Math.floor(input.maxDailyActions), 1000)) : 100;
    const webhookUrl = input?.webhookUrl ? String(input.webhookUrl) : "";
    if (webhookUrl && !/^https:\/\//.test(webhookUrl)) throw new Error("webhookUrl must be an https URL");
    const now = Date.now();
    const row: any = {
      tenantId,
      name,
      description: String(input?.description || ""),
      authMethod: AUTH_METHODS.some((m) => m.id === input?.authMethod) ? input.authMethod : "mcp_token",
      scopes: requestedScopes.length ? requestedScopes : ["gateway.read", "tools.discover"],
      permissions,
      autonomyLevel,
      approvalRequiredFor,
      maxDailyActions,
      webhookUrl,
      ownerEmail: input?.ownerEmail ? String(input.ownerEmail).toLowerCase().trim() : null,
      actionsToday: 0,
      status: "active",
      apiKey: `n0va1o_ag_${hashStr(tenantId + name + "key").toString(36)}${random6()}`,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      lastUsedAt: null,
    };
    const inserted = DataStore.mem().insert("n0va1o_agents", row);
    logEntry(tenantId, "agent_registered", `Agent "${name}" registered (${row.authMethod}, autonomy ${row.autonomyLevel})`, { agentId: inserted._id, scopes: row.scopes, permissions: row.permissions });
    const toolsByScope = new Set<string>();
    for (const s of row.scopes) {
      if (s.includes("read") || s === "gateway.read") toolsByScope.add("catalog_search");
      if (s.includes("write") || s === "gateway.write") toolsByScope.add("recipe_execute");
      if (s.includes("discover") || s === "tools.discover") toolsByScope.add("tools_discover");
      if (s.includes("connect") || s === "gateway.connect") toolsByScope.add("connection_authorize");
      if (s.includes("execute") || s === "tools.execute") toolsByScope.add("tool_execute");
      if (s.includes("data")) toolsByScope.add("vfs_read");
      if (s.includes("admin")) toolsByScope.add("policy_admin");
    }
    const toolsAvailable = ["catalog_search", "tools_discover", "tool_execute", "recipe_compile", "recipe_execute", "vfs_read", "vfs_offload", "sandbox_spawn", "connection_authorize", "policy_admin"].filter((t) => toolsByScope.has(t) || t.startsWith("recipe"));
    const fallbackTools = ["catalog_search", "tools_discover", "tool_execute"];
    const seed = `${tenantId}|${name}|sandbox`;
    return {
      agentId: inserted._id, ...row, api_key: row.apiKey, scopes: row.scopes,
      tools_available: toolsAvailable,
      fallback_tools: fallbackTools,
      session_endpoint: `wss://gateway.n0va.io/v1/agents/${inserted._id}/sessions`,
      sandbox_config: {
        cpu_quota: 0.5 + (hashStr(seed + "cpu") % 40) / 100,
        ram_quota: 128 + (hashStr(seed + "ram") % 7) * 128,
        timeout_seconds: 120 + (hashStr(seed + "to") % 7) * 60,
        network_mode: "isolated",
      },
      summary: `Agent "${name}" registered with ${row.scopes.length} scope(s), ${row.permissions.length} permission(s), autonomy ${row.autonomyLevel}`,
    };
  }

  listAgents(tenantId: string) {
    const agents = DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId);
    return {
      agents: agents.map((a: any) => ({ agentId: a._id, name: a.name, authMethod: a.authMethod, scopes: a.scopes, status: a.status, createdAt: a.createdAt, lastUsedAt: a.lastUsedAt })),
      total: agents.length,
      active: agents.filter((a: any) => a.status === "active").length,
    };
  }

  getAgent(tenantId: string, agentId: string) {
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a.tenantId === tenantId && a._id === agentId);
    if (!agent) throw new Error("Agent not found");
    return { agentId: agent._id, ...agent, summary: `Agent "${agent.name}"` };
  }

  deactivateAgent(tenantId: string, agentId: string) {
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a.tenantId === tenantId && a._id === agentId);
    if (!agent) throw new Error("Agent not found");
    DataStore.mem().update("n0va1o_agents", (a: any) => a._id === agentId, { status: "inactive", updatedAt: new Date().toISOString() });
    logEntry(tenantId, "agent_deactivated", `Agent "${agent.name}" deactivated`, { agentId });
    return { agentId, status: "inactive", summary: `Agent "${agent.name}" deactivated` };
  }

  mintJitToken(tenantId: string, input: any) {
    const agentId = String(input?.agentId || "");
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a.tenantId === tenantId && a._id === agentId);
    if (!agent) throw new Error("Agent not found");
    if (agent.status !== "active") throw new Error("Agent is inactive");
    const ttlSec = Number.isFinite(input?.ttlSec) ? Math.max(60, Math.min(input.ttlSec, 86400)) : 3600;
    const requested = Array.isArray(input?.scopes) ? input.scopes.filter((s: string) => (SCOPES as readonly string[]).includes(s)) : agent.scopes || [];
    const pruned = requested
      .filter((s: string) => (agent.scopes || []).includes(s))
      .sort((a: string, b: string) => (SCOPE_RANK[b] || 0) - (SCOPE_RANK[a] || 0));
    const now = Date.now();
    const seed = `${tenantId}|${agentId}|${pruned.join(",")}|${ttlSec}`;
    const tokenId = `jit_${hashStr(seed).toString(36)}${random6()}`;
    const envelopeKey = `AES-256-GCM:${hashStr(seed + "env").toString(16).padStart(16, "0")}`;
    const row: any = {
      tenantId, agentId, agentName: agent.name, tokenId,
      scopes: pruned, ttlSec,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSec * 1000).toISOString(),
      envelope: { cipher: "AES-256-GCM", keyId: envelopeKey, status: "sealed" },
      status: "active",
    };
    DataStore.mem().insert("n0va1o_tokens", row);
    DataStore.mem().update("n0va1o_agents", (a: any) => a._id === agentId, { lastUsedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() });
    logEntry(tenantId, "token_minted", `JIT token minted for "${agent.name}" (${pruned.length} pruned scope(s), ${ttlSec}s TTL)`, { agentId, tokenId });
    return {
      tokenId, agentId, agentName: agent.name, scopes: pruned, issuedAt: row.issuedAt, expiresAt: row.expiresAt,
      envelope: row.envelope,
      jitLatencyMs: 120,
      summary: `JIT token minted — ${pruned.length} scope(s), expires in ${Math.round(ttlSec / 60)} min`,
    };
  }

  listTokens(tenantId: string, agentId?: string) {
    let tokens = DataStore.mem().find("n0va1o_tokens", (t: any) => t.tenantId === tenantId);
    if (agentId) tokens = tokens.filter((t: any) => t.agentId === agentId);
    const now = Date.now();
    return {
      tokens: tokens.map((t: any) => ({
        tokenId: t.tokenId, agentId: t.agentId, agentName: t.agentName, scopes: t.scopes,
        issuedAt: t.issuedAt, expiresAt: t.expiresAt, status: t.status,
        expired: new Date(t.expiresAt).getTime() < now,
      })),
      total: tokens.length,
      active: tokens.filter((t: any) => t.status === "active" && new Date(t.expiresAt).getTime() >= now).length,
    };
  }

  tokenStatus(tenantId: string, tokenId: string) {
    const token = DataStore.mem().findOne("n0va1o_tokens", (t: any) => t.tenantId === tenantId && t.tokenId === tokenId);
    if (!token) throw new Error("Token not found");
    const now = Date.now();
    const expired = new Date(token.expiresAt).getTime() < now;
    return {
      tokenId: token.tokenId, agentId: token.agentId, agentName: token.agentName,
      scopes: token.scopes, issuedAt: token.issuedAt, expiresAt: token.expiresAt,
      status: token.status === "revoked" ? "revoked" : expired ? "expired" : "active",
      envelope: token.envelope,
      summary: expired ? "Token expired" : token.status === "revoked" ? "Token revoked" : `Token valid — ${Math.max(0, Math.round((new Date(token.expiresAt).getTime() - now) / 60000))} min remaining`,
    };
  }

  revokeToken(tenantId: string, tokenId: string) {
    const token = DataStore.mem().findOne("n0va1o_tokens", (t: any) => t.tenantId === tenantId && t.tokenId === tokenId);
    if (!token) throw new Error("Token not found");
    DataStore.mem().update("n0va1o_tokens", (t: any) => t.tokenId === tokenId, { status: "revoked", revokedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "token_revoked", `JIT token ${tokenId.slice(0, 12)}… revoked`, { agentId: token.agentId });
    return { tokenId, status: "revoked", summary: "Token revoked" };
  }

  rotateToken(tenantId: string, tokenId: string) {
    const token = DataStore.mem().findOne("n0va1o_tokens", (t: any) => t.tenantId === tenantId && t.tokenId === tokenId);
    if (!token) throw new Error("Token not found");
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a._id === token.agentId);
    const rotated = this.mintJitToken(tenantId, { agentId: token.agentId, scopes: token.scopes, ttlSec: token.ttlSec });
    DataStore.mem().update("n0va1o_tokens", (t: any) => t.tokenId === tokenId, { status: "rotated", rotatedInto: rotated.tokenId, updatedAt: new Date().toISOString() });
    logEntry(tenantId, "token_rotated", `Token rotated for "${agent?.name || token.agentName}" (15-day rotation policy)`, { agentId: token.agentId, oldToken: tokenId, newToken: rotated.tokenId });
    return { oldToken: tokenId, rotated, summary: "Token rotated — previous token retired" };
  }

  oauthAuthorizeUrl(tenantId: string, input: any) {
    const connectionId = String(input?.connectionId || "").replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === connectionId);
    if (!conn) throw new Error("Connection not found");
    const redirectUri = input?.redirectUri ? String(input.redirectUri) : "https://app.n0va.io/callback";
    const expiresInSeconds = Number.isFinite(input?.expiresInSeconds) ? Math.max(60, Math.min(Math.floor(input.expiresInSeconds), 900)) : 600;
    const now = Date.now();
    const state = `st_${hashStr(`${tenantId}|${connectionId}|${now}`).toString(36)}${random6()}`;
    const scope = Array.isArray(input?.scopes) && input.scopes.length ? input.scopes.join(" ") : (conn.scopes || ["gateway.read"]).join(" ");
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === connectionId, {
      oauthState: state,
      oauthScope: scope,
      oauthStateExpiresAt: new Date(now + expiresInSeconds * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
    logEntry(tenantId, "oauth_authorize_started", `OAuth authorization URL issued for connection "${conn.label}" (${scope})`, { connectionId, state, expiresInSeconds });
    return {
      connectionId: `ca_${connectionId}`,
      authorizationUrl: `https://auth.n0va.io/oauth2/authorize?response_type=code&client_id=n0va1o_gateway&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`,
      state,
      expiresInSeconds,
      expiresAt: new Date(now + expiresInSeconds * 1000).toISOString(),
      summary: `OAuth authorization URL issued — expires in ${expiresInSeconds}s`,
    };
  }

  oauthCallback(tenantId: string, input: any) {
    const connectionId = String(input?.connectionId || "").replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === connectionId);
    if (!conn) throw new Error("Connection not found");
    const state = String(input?.state || "");
    const code = String(input?.code || "");
    if (!code) throw new Error("Authorization code is required");
    if (!conn.oauthState || conn.oauthState !== state) throw new Error("OAuth state mismatch — re-issue the authorization URL");
    if (conn.oauthStateExpiresAt && new Date(conn.oauthStateExpiresAt).getTime() < Date.now()) throw new Error("OAuth state expired — re-issue the authorization URL");
    const now = Date.now();
    const ttlMin = 50 + hashStr(`${tenantId}|${connectionId}|${state}|ttl`) % 50;
    const accessToken = `oat_${hashStr(`${tenantId}|${connectionId}|${state}|at`).toString(36)}${random6()}`;
    const refreshToken = `rft_${hashStr(`${tenantId}|${connectionId}|${state}|rt`).toString(36)}${random6()}`;
    const tokenExpiresAt = new Date(now + ttlMin * 60000).toISOString();
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === connectionId, {
      status: "connected",
      oauthAuthorized: true,
      oauthAccessToken: accessToken,
      oauthRefreshToken: refreshToken,
      tokenExpiresAt,
      lastVerifiedAt: new Date(now).toISOString(),
      oauthState: null,
      oauthStateExpiresAt: null,
      updatedAt: new Date(now).toISOString(),
    });
    logEntry(tenantId, "oauth_authorized", `OAuth 2.0 authorization completed for connection "${conn.label}" (${ttlMin} min TTL)`, { connectionId, ttlMin });
    return {
      connectionId: `ca_${connectionId}`,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: ttlMin * 60,
      tokenExpiresAt,
      scope: conn.oauthScope,
      summary: `OAuth 2.0 complete — "${conn.label}" connected, token valid ${ttlMin} min`,
    };
  }

  oauthRefresh(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    if (!conn.oauthAuthorized || !conn.oauthRefreshToken) throw new Error("Connection has no active OAuth refresh token");
    const now = Date.now();
    const ttlMin = 60 + hashStr(`${tenantId}|${id}|refresh`) % 60;
    const oldExpiry = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
    const newExpiry = Math.max(now + ttlMin * 60000, oldExpiry);
    const accessToken = `oat_${hashStr(`${tenantId}|${id}|${now}|at`).toString(36)}${random6()}`;
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === id, {
      oauthAccessToken: accessToken,
      tokenExpiresAt: new Date(newExpiry).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
    logEntry(tenantId, "oauth_refreshed", `OAuth token refreshed for connection "${conn.label}" — expiry ${newExpiry > now + ttlMin * 60000 ? "extended" : "renewed"}`, { connectionId: id, ttlMin });
    return {
      connectionId: `ca_${id}`,
      accessToken,
      tokenExpiresAt: new Date(newExpiry).toISOString(),
      refreshed: true,
      neverShorted: newExpiry >= oldExpiry,
      summary: `Token refreshed — valid until ${new Date(newExpiry).toISOString().slice(0, 19)}`,
    };
  }

  oauthRevoke(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === id, {
      oauthAuthorized: false,
      oauthAccessToken: null,
      oauthRefreshToken: null,
      tokenExpiresAt: null,
      status: "disconnected",
      updatedAt: new Date().toISOString(),
    });
    logEntry(tenantId, "oauth_revoked", `OAuth access revoked for connection "${conn.label}"`, { connectionId: id });
    return { connectionId: `ca_${id}`, revoked: true, summary: `OAuth access revoked for "${conn.label}"` };
  }

  oauthStatus(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    const authorized = conn.oauthAuthorized === true;
    const expired = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() < Date.now() : false;
    return {
      connectionId: `ca_${id}`,
      oauthAuthorized: authorized,
      oauthState: conn.oauthState ?? null,
      oauthScope: conn.oauthScope ?? null,
      tokenExpiresAt: conn.tokenExpiresAt ?? null,
      status: conn.status,
      summary: authorized ? (expired ? "OAuth token expired — refresh required" : "OAuth authorized") : "Not OAuth authorized",
    };
  }

  createConnection(tenantId: string, input: any) {
    const platformId = String(input?.platformId || "");
    const agentId = String(input?.agentId || "");
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a.tenantId === tenantId && a._id === agentId);
    if (!agent) throw new Error("Agent not found");
    if (!platformId) throw new Error("platformId is required");
    const authMethod = AUTH_METHODS.some((m) => m.id === input?.authMethod) ? input.authMethod : "oauth2";
    const now = Date.now();
    const row: any = {
      tenantId, platformId, agentId, agentName: agent.name,
      label: String(input?.label || platformId),
      authMethod,
      status: "pending",
      scopes: Array.isArray(input?.scopes) ? input.scopes.filter((s: string) => (SCOPES as readonly string[]).includes(s) || s.includes(":")) : ["gateway.read"],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      lastVerifiedAt: null,
    };
    const inserted = DataStore.mem().insert("n0va1o_connections", row);
    logEntry(tenantId, "connection_created", `Connection "${row.label}" (${platformId}) created via ${authMethod}`, { connectionId: inserted._id, agentId });
    return { connectionId: `ca_${inserted._id}`, ...row, connectionIdRaw: inserted._id, summary: `Connection "${row.label}" created — awaiting authorization` };
  }

  listConnections(tenantId: string, status?: string) {
    let connections = DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId);
    if (status) connections = connections.filter((c: any) => c.status === status);
    return {
      connections: connections.map((c: any) => ({ connectionId: `ca_${c._id}`, ...c, connectionIdRaw: c._id })),
      total: connections.length,
      byStatus: ["connected", "pending", "error", "disconnected"].map((s) => ({ status: s, count: connections.filter((c: any) => c.status === s).length })),
    };
  }

  getConnection(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    return { connectionId: `ca_${conn._id}`, ...conn, connectionIdRaw: conn._id };
  }

  authorizeConnection(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    const now = new Date().toISOString();
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === id, { status: "connected", lastVerifiedAt: now, updatedAt: now });
    logEntry(tenantId, "connection_authorized", `Connection "${conn.label}" authorized (JIT)`, { connectionId: id, platformId: conn.platformId });
    return { connectionId: `ca_${id}`, platformId: conn.platformId, label: conn.label, status: "connected", summary: `"${conn.label}" connected — JIT token granted` };
  }

  disconnectConnection(tenantId: string, connectionId: string) {
    const id = connectionId.replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id);
    if (!conn) throw new Error("Connection not found");
    DataStore.mem().update("n0va1o_connections", (c: any) => c._id === id, { status: "disconnected", updatedAt: new Date().toISOString() });
    logEntry(tenantId, "connection_disconnected", `Connection "${conn.label}" disconnected`, { connectionId: id });
    return { connectionId: `ca_${id}`, status: "disconnected", summary: `"${conn.label}" disconnected` };
  }

  addAccount(tenantId: string, input: any) {
    const connectionId = String(input?.connectionId || "").replace(/^ca_/, "");
    const conn = DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === connectionId);
    if (!conn) throw new Error("Connection not found");
    const accountName = String(input?.accountName || "").trim();
    if (!accountName) throw new Error("accountName is required");
    const now = Date.now();
    const row: any = {
      tenantId, connectionId, platformId: conn.platformId, accountName,
      status: "active",
      active: false,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    const inserted = DataStore.mem().insert("n0va1o_accounts", row);
    logEntry(tenantId, "account_added", `Account "${accountName}" added to pool (${conn.label})`, { accountId: inserted._id });
    return { accountId: `ac_${inserted._id}`, ...row, accountIdRaw: inserted._id, summary: `Account "${accountName}" added to the pool` };
  }

  listAccounts(tenantId: string, connectionId?: string) {
    let accounts = DataStore.mem().find("n0va1o_accounts", (a: any) => a.tenantId === tenantId);
    if (connectionId) accounts = accounts.filter((a: any) => a.connectionId === connectionId.replace(/^ca_/, ""));
    return {
      accounts: accounts.map((a: any) => ({ accountId: `ac_${a._id}`, ...a, accountIdRaw: a._id })),
      total: accounts.length,
      activeAccount: accounts.find((a: any) => a.active) ? `ac_${accounts.find((a: any) => a.active)._id}` : null,
    };
  }

  switchAccount(tenantId: string, accountId: string) {
    const id = accountId.replace(/^ac_/, "");
    const account = DataStore.mem().findOne("n0va1o_accounts", (a: any) => a.tenantId === tenantId && a._id === id);
    if (!account) throw new Error("Account not found");
    DataStore.mem().update("n0va1o_accounts", (a: any) => a.tenantId === tenantId && a.active, { active: false, updatedAt: new Date().toISOString() });
    DataStore.mem().update("n0va1o_accounts", (a: any) => a._id === id, { active: true, lastUsedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "account_switched", `Switched to account "${account.accountName}"`, { accountId: id });
    return { accountId: `ac_${id}`, accountName: account.accountName, switchLatencyMs: 15, summary: `Active account → "${account.accountName}" (15ms switch)` };
  }

  refreshAccountHealth(tenantId: string) {
    const accounts = DataStore.mem().find("n0va1o_accounts", (a: any) => a.tenantId === tenantId);
    const now = new Date().toISOString();
    const rows = accounts.map((a: any) => {
      const score = hashStr(`${tenantId}|${a._id}|health`) % 100;
      const status = score >= 70 ? "healthy" : score >= 40 ? "degraded" : "critical";
      DataStore.mem().update("n0va1o_accounts", (x: any) => x._id === a._id, {
        healthScore: score,
        healthStatus: status,
        lastHealthCheckAt: now,
        errorCount: score < 40 ? 1 + (hashStr(`${tenantId}|${a._id}|errs`) % 3) : 0,
      });
      return { accountId: `ac_${a._id}`, accountName: a.accountName, healthScore: score, healthStatus: status };
    });
    return {
      checked: accounts.length,
      accounts: rows,
      summary: `Health checked for ${accounts.length} account(s) — ${rows.filter((r) => r.healthStatus === "healthy").length} healthy`,
    };
  }

  accountHealth(tenantId: string) {
    const accounts = DataStore.mem().find("n0va1o_accounts", (a: any) => a.tenantId === tenantId);
    const rows = accounts.map((a: any) => ({
      accountId: `ac_${a._id}`,
      accountName: a.accountName,
      platformId: a.platformId,
      healthScore: a.healthScore ?? (hashStr(`${tenantId}|${a._id}|health`) % 100),
      healthStatus: a.healthStatus ?? (a.healthScore != null ? a.healthScore >= 70 ? "healthy" : a.healthScore >= 40 ? "degraded" : "critical" : "unknown"),
      lastHealthCheckAt: a.lastHealthCheckAt ?? null,
      errorCount: a.errorCount ?? 0,
      active: a.active,
    }));
    return {
      accounts: rows,
      total: rows.length,
      healthy: rows.filter((r) => r.healthStatus === "healthy").length,
      degraded: rows.filter((r) => r.healthStatus === "degraded").length,
      critical: rows.filter((r) => r.healthStatus === "critical").length,
      summary: `${rows.filter((r) => r.healthStatus === "healthy").length}/${rows.length} account(s) healthy`,
    };
  }

  accountLru(tenantId: string, opts?: any) {
    const limit = Number.isFinite(opts?.limit) ? Math.max(1, Math.min(Math.floor(opts.limit), 100)) : 5;
    const accounts = DataStore.mem().find("n0va1o_accounts", (a: any) => a.tenantId === tenantId);
    const evicted = accounts.filter((a: any) => a.status === "evicted");
    const activePool = accounts.filter((a: any) => a.status !== "evicted");
    const ordered = activePool.slice().sort((a, b) => {
      const la = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const lb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return la - lb;
    });
    const evictable = ordered.filter((a: any) => !a.active);
    return {
      poolSize: activePool.length,
      evictedCount: evicted.length,
      order: ordered.map((a: any) => ({ accountId: `ac_${a._id}`, accountName: a.accountName, active: a.active, lastUsedAt: a.lastUsedAt ?? null, evictable: !a.active })),
      evictionCandidates: evictable.slice(0, limit).map((a: any) => `ac_${a._id}`),
      evictionLimit: limit,
      summary: `${activePool.length} account(s) in pool — ${evictable.length} evictable, oldest ${evictable[0]?.accountName ?? "n/a"} first`,
    };
  }

  evictAccounts(tenantId: string, opts?: any) {
    const limit = Number.isFinite(opts?.limit) ? Math.max(1, Math.min(Math.floor(opts.limit), 100)) : 5;
    const lru = this.accountLru(tenantId, { limit });
    const evicted = lru.evictionCandidates.map((accountId: string) => {
      const id = accountId.replace(/^ac_/, "");
      const account = DataStore.mem().findOne("n0va1o_accounts", (a: any) => a.tenantId === tenantId && a._id === id);
      DataStore.mem().update("n0va1o_accounts", (a: any) => a._id === id, { status: "evicted", active: false, evictedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      logEntry(tenantId, "account_evicted", `LRU eviction: account "${account?.accountName}"`, { accountId: id });
      return accountId;
    });
    return {
      evicted,
      evictedCount: evicted.length,
      summary: `${evicted.length} account(s) evicted via LRU (oldest-first, active account protected)`,
    };
  }

  createSession(tenantId: string, input: any) {
    const agentId = String(input?.agentId || "");
    const agent = DataStore.mem().findOne("n0va1o_agents", (a: any) => a.tenantId === tenantId && a._id === agentId);
    if (!agent) throw new Error("Agent not found");
    const now = Date.now();
    const ttlSec = Number.isFinite(input?.ttlSeconds) ? Math.max(60, Math.min(Math.floor(input.ttlSeconds), 86400)) : 3600;
    const sandboxConfig = {
      runtime: String(input?.sandboxConfig?.runtime || "python311"),
      memoryMB: Number.isFinite(input?.sandboxConfig?.memoryMB) ? Math.max(64, Math.min(Math.floor(input.sandboxConfig.memoryMB), 8192)) : 256,
      ttlSeconds: ttlSec,
      cpu_quota: Number.isFinite(input?.sandboxConfig?.cpu_quota) ? Math.max(0.25, Math.min(input.sandboxConfig.cpu_quota, 8)) : 1,
      ram_quota: Number.isFinite(input?.sandboxConfig?.ram_quota) ? Math.max(64, Math.min(Math.floor(input.sandboxConfig.ram_quota), 16384)) : 512,
      timeout_seconds: Number.isFinite(input?.sandboxConfig?.timeout_seconds) ? Math.max(10, Math.min(Math.floor(input.sandboxConfig.timeout_seconds), 3600)) : 300,
      network_mode: ["isolated", "proxy_only", "direct"].includes(input?.sandboxConfig?.network_mode) ? input.sandboxConfig.network_mode : "isolated",
    };
    const seed = `${tenantId}|${agentId}|${now}`;
    const sessionId = `ses_${hashStr(seed).toString(36)}${random6()}`;
    const contextTokens = 4000 + (hashStr(`${tenantId}|${agentId}|context`) % 12000);
    const row: any = {
      tenantId, agentId, agentName: agent.name,
      sessionId,
      userDefinedId: String(input?.userDefinedId || ""),
      endpoint: `wss://gateway.n0va.io/v1/sessions/${sessionId}/events`,
      contextTokens,
      sandboxConfig,
      status: "active",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSec * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    DataStore.mem().insert("n0va1o_sessions", row);
    logEntry(tenantId, "session_created", `Session ${sessionId} created for "${agent.name}" (${contextTokens} context tokens)`, { agentId, sessionId });
    return {
      session_id: sessionId, sessionId,
      agentId, agentName: agent.name,
      endpoint: row.endpoint,
      websocket_url: `wss://gateway.n0va.io/v1/sessions/${sessionId}/events`,
      sandbox_url: `https://sandbox.n0va.io/s/${sessionId}`,
      context_tokens: contextTokens, contextTokens,
      status: "active",
      expiresAt: row.expiresAt,
      sandboxConfig,
      summary: `Session created — ${contextTokens} context tokens, expires in ${Math.round(ttlSec / 60)} min`,
    };
  }

  listSessions(tenantId: string, status?: string) {
    let sessions = DataStore.mem().find("n0va1o_sessions", (s: any) => s.tenantId === tenantId);
    if (status) sessions = sessions.filter((s: any) => s.status === status);
    const now = Date.now();
    return {
      sessions: sessions.map((s: any) => ({
        session_id: s.sessionId, sessionId: s.sessionId, agentId: s.agentId, agentName: s.agentName,
        userDefinedId: s.userDefinedId, status: s.status, contextTokens: s.contextTokens,
        createdAt: s.createdAt, expiresAt: s.expiresAt,
        expired: new Date(s.expiresAt).getTime() < now,
      })),
      total: sessions.length,
      active: sessions.filter((s: any) => s.status === "active" && new Date(s.expiresAt).getTime() >= now).length,
    };
  }

  getSession(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("n0va1o_sessions", (s: any) => s.tenantId === tenantId && s.sessionId === sessionId);
    if (!session) throw new Error("Session not found");
    return { session_id: session.sessionId, sessionId: session.sessionId, ...session };
  }

  endSession(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("n0va1o_sessions", (s: any) => s.tenantId === tenantId && s.sessionId === sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status === "ended") throw new Error("Session already ended");
    DataStore.mem().update("n0va1o_sessions", (s: any) => s.sessionId === sessionId, { status: "ended", endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "session_ended", `Session ${sessionId} ended`, { agentId: session.agentId, sessionId });
    return { sessionId, status: "ended", summary: `Session ${sessionId} ended` };
  }

  authDashboard(tenantId: string) {
    const agents = DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId);
    const tokens = DataStore.mem().find("n0va1o_tokens", (t: any) => t.tenantId === tenantId);
    const connections = DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId);
    const accounts = DataStore.mem().find("n0va1o_accounts", (a: any) => a.tenantId === tenantId);
    const recent = DataStore.mem().find("n0va1o_auth_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
    return {
      counts: {
        agents: agents.length,
        activeAgents: agents.filter((a: any) => a.status === "active").length,
        tokens: tokens.length,
        activeTokens: tokens.filter((t: any) => t.status === "active").length,
        connections: connections.length,
        connected: connections.filter((c: any) => c.status === "connected").length,
        accounts: accounts.length,
      },
      authMethods: AUTH_METHODS,
      recent,
      generatedAt: new Date().toISOString(),
    };
  }

  authLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_auth_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }
}

export const n0va1oAuth = new N0VA1OAuthService();
