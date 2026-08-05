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
  DataStore.mem().insert("n0va1o_deployment_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const DEPLOY_MODES = [
  { id: "managed", name: "Managed (N0VA1O-hosted)", description: "Gateway runs on N0VA1O infrastructure, zero setup" },
  { id: "byoc", name: "BYOC (Bring Your Own Cloud)", description: "Gateway container runs in your AWS/GCP/Azure account", requires: "cloudAccountId" },
  { id: "vpc_peered", name: "VPC Peered", description: "Managed gateway peered to your VPC for private traffic", requires: "vpcId" },
  { id: "hybrid", name: "Hybrid", description: "Control plane managed, data plane in your region", requires: "vpcId" },
] as const;

export const DEPLOY_TARGETS = [
  { id: "aws", name: "AWS", capabilities: ["ecs", "eks", "lambda"], defaultRegion: "us-east-1" },
  { id: "gcp", name: "Google Cloud", capabilities: ["gke", "cloud_run"], defaultRegion: "us-central1" },
  { id: "azure", name: "Azure", capabilities: ["aks", "container_apps"], defaultRegion: "eastus" },
  { id: "kubernetes", name: "Kubernetes", capabilities: ["helm", "kustomize"], defaultRegion: "any" },
  { id: "docker", name: "Docker", capabilities: ["compose"], defaultRegion: "any" },
] as const;

export const DEPLOY_REGIONS = [
  { id: "us-east", name: "US East (N. Virginia)", latencyMs: 45 },
  { id: "us-west", name: "US West (Oregon)", latencyMs: 47 },
  { id: "eu-west", name: "EU West (Ireland)", latencyMs: 49 },
  { id: "ap-south", name: "Asia Pacific (Mumbai)", latencyMs: 55 },
] as const;

export const DEPLOY_STAGES = [
  { id: "network", name: "Network" },
  { id: "compute", name: "Compute" },
  { id: "storage", name: "Storage" },
  { id: "security", name: "Security" },
  { id: "gateway", name: "Gateway" },
] as const;

export const TROUBLESHOOTING_GUIDE = [
  { issue: "auth_failure", diagnosis: "API key invalid, revoked, or scope mismatch", resolution: "Re-mint a JIT token with agent scopes; verify the key prefix n0va1o_ag_", fix: "Rotate API key + mint JIT", severity: "high" },
  { issue: "rate_limited", diagnosis: "Plan requests-per-minute ceiling hit", resolution: "Raise plan tier or back off with exponential retry", fix: "Enable retry policy + check throughputStatus", severity: "medium" },
  { issue: "connection_timeout", diagnosis: "Provider endpoint unreachable or firewall blocked", resolution: "Verify egress rules; check provider status page", fix: "Test connectivity from sandbox", severity: "medium" },
  { issue: "sandbox_oom", diagnosis: "Sandbox memory quota exceeded (default 256MB)", resolution: "Increase sandboxConfig.memoryMB up to 8192", fix: "Raise memory quota + retry", severity: "medium" },
  { issue: "webhook_404", diagnosis: "Delivery endpoint returned 404 — URL changed or removed", resolution: "Update webhook target URL; re-verify signature format", fix: "Ping webhook + update URL", severity: "low" },
  { issue: "jit_expired", diagnosis: "Token TTL elapsed (max 24h)", resolution: "Mint a new token; check expiresAt", fix: "Re-mint JIT token", severity: "low" },
  { issue: "quota_exceeded", diagnosis: "Plan limit hit on agents/recipes/connections", resolution: "Upgrade plan or prune usage", fix: "Check usageStatus + upgrade plan", severity: "medium" },
  { issue: "schema_mismatch", diagnosis: "Provider API shape drifted from catalog schema", resolution: "Re-run tool discovery; check schema_drift event", fix: "Re-discover tools", severity: "high" },
] as const;

export class N0VA1ODeploymentService {
  deploymentCatalog() {
    return {
      modes: DEPLOY_MODES.map((m) => ({ ...m })),
      targets: DEPLOY_TARGETS.map((t) => ({ ...t })),
      regions: DEPLOY_REGIONS.map((r) => ({ ...r })),
      stages: DEPLOY_STAGES.map((s) => ({ ...s })),
      summary: `${DEPLOY_MODES.length} modes · ${DEPLOY_TARGETS.length} targets · ${DEPLOY_REGIONS.length} regions · ${DEPLOY_STAGES.length} stages`,
    };
  }

  createDeployment(tenantId: string, input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new Error("Deployment name is required");
    const mode = String(input?.mode || "managed");
    const modeInfo = DEPLOY_MODES.find((m) => m.id === mode);
    if (!modeInfo) throw new Error(`Unknown deployment mode — available: ${DEPLOY_MODES.map((m) => m.id).join(", ")}`);
    const target = String(input?.target || "docker");
    const targetInfo = DEPLOY_TARGETS.find((t) => t.id === target);
    if (!targetInfo) throw new Error(`Unknown deployment target — available: ${DEPLOY_TARGETS.map((t) => t.id).join(", ")}`);
    const region = String(input?.region || "us-east");
    if (!DEPLOY_REGIONS.some((r) => r.id === region)) throw new Error(`Unknown region — available: ${DEPLOY_REGIONS.map((r) => r.id).join(", ")}`);
    if (((modeInfo as any).requires === "vpcId" || mode === "hybrid") && !String(input?.vpcId || "").trim()) throw new Error("vpcId is required for VPC-based modes");
    if (mode === "byoc" && !String(input?.cloudAccountId || "").trim()) throw new Error("cloudAccountId is required for BYOC");
    const now = new Date().toISOString();
    const seed = `${tenantId}|${name}|${mode}|${target}|${region}`;
    const deploymentId = `dep_${hashStr(seed).toString(36)}${random6()}`;
    const row: any = {
      tenantId, name, mode, target, region,
      cloudAccountId: input?.cloudAccountId ? String(input.cloudAccountId) : null,
      vpcId: input?.vpcId ? String(input.vpcId) : null,
      vpcPeering: mode === "vpc_peered" || mode === "hybrid" ? { peeringId: `pcx_${hashStr(seed + "pcx").toString(36)}${random6()}`, state: hashStr(seed + "px") % 5 === 0 ? "pending" : "active" } : null,
      status: "provisioning",
      progress: 0,
      stages: DEPLOY_STAGES.map((s) => ({ ...s, status: "pending" })),
      deploymentId,
      createdAt: now,
      updatedAt: now,
      healthScore: null,
    };
    const inserted = DataStore.mem().insert("n0va1o_deployments", row);
    logEntry(tenantId, "deployment_created", `Deployment "${name}" created (${mode} · ${target} · ${region})`, { deploymentId });
    return { deploymentId, ...row, summary: `Deployment "${name}" provisioning on ${target} (${region}) — ${mode}` };
  }

  listDeployments(tenantId: string) {
    const deployments = DataStore.mem().find("n0va1o_deployments", (d: any) => d.tenantId === tenantId);
    return {
      deployments: deployments.map((d: any) => ({ deploymentId: d.deploymentId, name: d.name, mode: d.mode, target: d.target, region: d.region, status: d.status, progress: d.progress, healthScore: d.healthScore, createdAt: d.createdAt })),
      total: deployments.length,
      active: deployments.filter((d: any) => d.status === "active").length,
    };
  }

  getDeployment(tenantId: string, deploymentId: string) {
    const d = DataStore.mem().findOne("n0va1o_deployments", (x: any) => x.tenantId === tenantId && x.deploymentId === deploymentId);
    if (!d) throw new Error("Deployment not found");
    return { deploymentId: d.deploymentId, ...d, summary: `Deployment "${d.name}" — ${d.status} (${d.progress}%)` };
  }

  runProvision(tenantId: string, deploymentId: string) {
    const d = this.getDeployment(tenantId, deploymentId);
    if (d.status === "active") return { deploymentId, status: "active", progress: 100, summary: `Deployment "${d.name}" is already active` };
    if (d.status === "terminated") throw new Error("Deployment is terminated");
    const seed = `${tenantId}|${deploymentId}|provision`;
    const failedStage = hashStr(seed + "fail") % 7 === 0 ? DEPLOY_STAGES[hashStr(seed + "which") % DEPLOY_STAGES.length].id : null;
    const stages = DEPLOY_STAGES.map((s, i) => {
      const pct = 20 + (hashStr(seed + s.id) % 15);
      if (s.id === failedStage) return { ...s, status: "failed", progressPct: pct, error: `stage ${s.id} did not converge (deterministic ${pct}%%)` };
      return { ...s, status: "complete", progressPct: pct, durationMs: 300 + (hashStr(seed + s.id + "dur") % 2700) };
    });
    const failed = stages.some((s) => s.status === "failed");
    const status = failed ? "failed" : "active";
    const healthScore = failed ? null : 88 + (hashStr(seed + "health") % 12);
    const patch: any = {
      status, progress: failed ? stages.findIndex((s) => s.status === "failed") * 20 : 100,
      stages, healthScore,
      endpoints: failed ? null : {
        gatewayUrl: `https://gw-${deploymentId}.n0va.io`,
        websocketUrl: `wss://gw-${deploymentId}.n0va.io/events`,
        controlPlaneUrl: `https://cp-${deploymentId}.n0va.io`,
      },
      updatedAt: new Date().toISOString(),
    };
    DataStore.mem().update("n0va1o_deployments", (x: any) => x.deploymentId === deploymentId, patch);
    logEntry(tenantId, "deployment_provisioned", `Deployment "${d.name}" ${status} (${patch.progress}%)`, { deploymentId });
    return { deploymentId, ...patch, summary: failed ? `Deployment "${d.name}" failed at stage "${failedStage}"` : `Deployment "${d.name}" active — ${patch.endpoints.gatewayUrl}` };
  }

  deploymentHealth(tenantId: string) {
    const deployments = DataStore.mem().find("n0va1o_deployments", (d: any) => d.tenantId === tenantId && d.status === "active");
    const rows = deployments.map((d: any) => ({
      deploymentId: d.deploymentId,
      name: d.name,
      uptimePct: 99.8 + (hashStr(`${tenantId}|${d.deploymentId}|up`) % 20) / 100,
      latencyMs: 45 + (hashStr(`${tenantId}|${d.deploymentId}|lat`) % 12),
      certificateStatus: hashStr(`${tenantId}|${d.deploymentId}|cert`) % 5 === 0 ? "expiring_soon" : "valid",
      healthScore: d.healthScore ?? 95,
    }));
    return {
      deployments: rows,
      total: rows.length,
      averageHealth: rows.length ? Math.round(rows.reduce((a, r) => a + r.healthScore, 0) / rows.length) : 0,
      alerts: rows.filter((r) => r.certificateStatus !== "valid" || r.healthScore < 90).map((r) => ({ deploymentId: r.deploymentId, alert: r.certificateStatus !== "valid" ? "certificate expiring" : "health below 90" })),
      summary: `${rows.length} active deployment(s), avg health ${rows.length ? Math.round(rows.reduce((a, r) => a + r.healthScore, 0) / rows.length) : 0}`,
    };
  }

  deleteDeployment(tenantId: string, deploymentId: string) {
    const d = this.getDeployment(tenantId, deploymentId);
    DataStore.mem().update("n0va1o_deployments", (x: any) => x.deploymentId === deploymentId, { status: "terminated", updatedAt: new Date().toISOString() });
    logEntry(tenantId, "deployment_terminated", `Deployment "${d.name}" terminated`, { deploymentId });
    return { deploymentId, status: "terminated", summary: `Deployment "${d.name}" terminated` };
  }

  migrateConnections(tenantId: string, input: any) {
    const fromId = String(input?.fromDeploymentId || "");
    const toId = String(input?.toDeploymentId || "");
    const from = fromId ? this.getDeployment(tenantId, fromId) : null;
    const to = this.getDeployment(tenantId, toId);
    if (!to) throw new Error("Deployment not found");
    if (from && from.status === "terminated") throw new Error("Source deployment is terminated");
    const connectionIds = Array.isArray(input?.connectionIds) ? input.connectionIds.map((c: string) => String(c).replace(/^ca_/, "")) : [];
    const migrated = connectionIds.filter((id: string) => DataStore.mem().findOne("n0va1o_connections", (c: any) => c.tenantId === tenantId && c._id === id));
    for (const id of migrated) DataStore.mem().update("n0va1o_connections", (c: any) => c._id === id, { deploymentTag: toId, updatedAt: new Date().toISOString() });
    logEntry(tenantId, "migration_executed", `Migration ${from ? `"${from.name}" → ` : ""}"${to.name}": ${migrated.length} connection(s) moved`, { fromDeploymentId: fromId, toDeploymentId: toId });
    return {
      fromDeploymentId: fromId || null, toDeploymentId: toId,
      requested: connectionIds.length, migrated: migrated.length,
      connections: migrated.map((id: string) => `ca_${id}`),
      summary: `Migration complete — ${migrated.length}/${connectionIds.length} connection(s) moved to "${to.name}"`,
    };
  }

  onboardingChecklist(tenantId: string) {
    const hasAgent = DataStore.mem().find("n0va1o_agents", (a: any) => a.tenantId === tenantId).length > 0;
    const hasConnection = DataStore.mem().find("n0va1o_connections", (c: any) => c.tenantId === tenantId && c.status === "connected").length > 0;
    const hasToken = DataStore.mem().find("n0va1o_tokens", (t: any) => t.tenantId === tenantId).length > 0;
    const hasRecipe = DataStore.mem().find("n0va1o_recipes", (r: any) => r.tenantId === tenantId).length > 0;
    const hasSession = DataStore.mem().find("n0va1o_sessions", (s: any) => s.tenantId === tenantId).length > 0;
    const hasPolicy = DataStore.mem().find("n0va1o_modifiers", (m: any) => m.tenantId === tenantId).length > 0 || DataStore.mem().find("n0va1o_policies", (p: any) => p.tenantId === tenantId).length > 0;
    const hasDeployment = DataStore.mem().find("n0va1o_deployments", (d: any) => d.tenantId === tenantId && d.status === "active").length > 0;
    const steps = [
      { id: "create_agent", label: "Register an agent", done: hasAgent },
      { id: "connect_platform", label: "Connect a platform", done: hasConnection },
      { id: "mint_token", label: "Mint a JIT token", done: hasToken },
      { id: "compile_recipe", label: "Compile a recipe", done: hasRecipe },
      { id: "open_session", label: "Open a session", done: hasSession },
      { id: "set_policy", label: "Set governance policy", done: hasPolicy },
      { id: "deploy_gateway", label: "Deploy the gateway", done: hasDeployment },
    ];
    const done = steps.filter((s) => s.done).length;
    return {
      steps,
      done,
      total: steps.length,
      progressPct: Math.round((done / steps.length) * 100),
      phase: done === 0 ? "not_started" : done < steps.length ? "in_progress" : "complete",
      summary: `Onboarding ${Math.round((done / steps.length) * 100)}% — ${done}/${steps.length} steps complete`,
    };
  }

  troubleshootingCatalog() {
    return {
      issues: TROUBLESHOOTING_GUIDE.map((t) => ({ ...t })),
      total: TROUBLESHOOTING_GUIDE.length,
      summary: `${TROUBLESHOOTING_GUIDE.length} documented issues with diagnosis + resolution`,
    };
  }

  troubleshoot(tenantId: string, issue: string) {
    const entry = TROUBLESHOOTING_GUIDE.find((t) => t.issue === issue);
    if (!entry) throw new Error(`Unknown issue — available: ${TROUBLESHOOTING_GUIDE.map((t) => t.issue).join(", ")}`);
    const existing = DataStore.mem().find("n0va1o_issues", (i: any) => i.tenantId === tenantId && i.issue === issue && i.status === "open");
    let issueId = existing[0]?._id;
    if (!issueId) {
      const now = new Date().toISOString();
      const inserted = DataStore.mem().insert("n0va1o_issues", { tenantId, issue, status: "open", createdAt: now, updatedAt: now });
      issueId = inserted._id;
    }
    return {
      issueId, issue,
      diagnosis: entry.diagnosis,
      resolution: entry.resolution,
      recommendedFix: entry.fix,
      severity: entry.severity,
      retryable: entry.issue === "auth_failure" || entry.issue === "rate_limited" || entry.issue === "connection_timeout" || entry.issue === "sandbox_oom" || entry.issue === "jit_expired",
      summary: `${issue} — ${entry.diagnosis}`,
    };
  }

  resolveIssue(tenantId: string, issueId: string) {
    const row = DataStore.mem().findOne("n0va1o_issues", (i: any) => i.tenantId === tenantId && i._id === issueId);
    if (!row) throw new Error("Issue not found");
    DataStore.mem().update("n0va1o_issues", (i: any) => i._id === issueId, { status: "resolved", resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "issue_resolved", `Issue "${row.issue}" resolved`, { issueId });
    return { issueId, issue: row.issue, status: "resolved", summary: `Issue "${row.issue}" resolved` };
  }

  issuesList(tenantId: string) {
    const issues = DataStore.mem().find("n0va1o_issues", (i: any) => i.tenantId === tenantId);
    return {
      issues: issues.map((i: any) => ({ issueId: i._id, issue: i.issue, status: i.status, createdAt: i.createdAt, resolvedAt: i.resolvedAt ?? null })),
      total: issues.length,
      open: issues.filter((i: any) => i.status === "open").length,
    };
  }

  deploymentDashboard(tenantId: string) {
    return {
      catalog: this.deploymentCatalog(),
      deployments: this.listDeployments(tenantId),
      health: this.deploymentHealth(tenantId),
      onboarding: this.onboardingChecklist(tenantId),
      issues: this.issuesList(tenantId),
      log: this.deploymentLog(tenantId),
      summary: `${this.listDeployments(tenantId).total} deployment(s) · onboarding ${this.onboardingChecklist(tenantId).progressPct}% · ${this.issuesList(tenantId).open} open issue(s)`,
    };
  }

  deploymentLog(tenantId: string) {
    return { entries: DataStore.mem().find("n0va1o_deployment_log", (l: any) => l.tenantId === tenantId).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 50) };
  }
}

export const n0va1oDeployment = new N0VA1ODeploymentService();
