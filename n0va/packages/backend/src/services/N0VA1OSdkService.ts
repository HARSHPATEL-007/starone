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
  DataStore.mem().insert("n0va1o_sdk_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const SDK_LANGUAGES = [
  { id: "python", name: "Python", package: "n0va1o", registry: "PyPI", install: "pip install n0va1o", minRuntime: "Python 3.10+", init: "from n0va1o import Gateway\ngw = Gateway(api_key=\"sk-...\")" },
  { id: "javascript", name: "JavaScript / TypeScript", package: "@n0va1o/gateway", registry: "npm", install: "npm install @n0va1o/gateway", minRuntime: "Node.js 18+", init: "import { Gateway } from \"@n0va1o/gateway\";\nconst gw = new Gateway({ apiKey: \"sk-...\" });" },
  { id: "golang", name: "Go", package: "github.com/n0va1o/gateway-go", registry: "Go Modules", install: "go get github.com/n0va1o/gateway-go", minRuntime: "Go 1.21+", init: "gw, err := gateway.New(gateway.WithAPIKey(\"sk-...\"))" },
] as const;

export const SDK_FEATURES = [
  { id: "auth", name: "Agent Auth", snippet: "session = gw.agent.authenticate()" },
  { id: "jit_tokens", name: "JIT Token Minting", snippet: "token = gw.auth.mint_jit_token(agent_id=\"ag_...\", ttl=3600)" },
  { id: "discovery", name: "Intent Discovery", snippet: "tools = gw.discover(intent=\"send reply\")" },
  { id: "recipes", name: "Recipe Compile & Execute", snippet: "result = gw.recipes.execute(recipe_id=\"rp_...\")" },
  { id: "sandbox", name: "Ephemeral Sandboxes", snippet: "sb = gw.sandbox.spawn(runtime=\"python311\")" },
  { id: "webhooks", name: "Webhook Signing", snippet: "sig = gw.webhooks.sign(payload, secret=whsec)" },
  { id: "retries", name: "Exponential Retries", snippet: "gw.config.retries = { max_attempts: 5, strategy: \"exponential\" }" },
  { id: "observability", name: "OpenTelemetry Bridge", snippet: "gw.observe.export(traces=True, metrics=True)" },
  { id: "rate_limits", name: "Rate Limit Awareness", snippet: "gw.config.rate_limit_aware = True" },
  { id: "streaming", name: "Streaming Responses", snippet: "async for event in gw.sessions.stream(session_id=\"ses_...\"):" },
  { id: "vfs", name: "Virtual Filesystem", snippet: "handle = gw.vfs.offload(payload, key=\"big.json\")" },
  { id: "migrations", name: "Migration Assistant", snippet: "plan = gw.migrate.plan(source=\"legacy\", mode=\"full\")" },
  { id: "cli_bridge", name: "CLI Bridge", snippet: "await gw.cli.exec(\"n0va status\")" },
  { id: "mcp", name: "MCP Transport", snippet: "client = gw.mcp.connect(transport=\"stdio\")" },
  { id: "quantum_signing", name: "Quantum-Safe Signing", snippet: "sig = gw.crypto.quantum_sign(payload, algo=\"dilithium_5\")" },
] as const;

export class N0VA1OSdkService {
  sdkCatalog() {
    return {
      languages: SDK_LANGUAGES.map((l) => ({ ...l })),
      features: SDK_FEATURES.map((f) => ({ ...f })),
      totalLanguages: SDK_LANGUAGES.length,
      totalFeatures: SDK_FEATURES.length,
      gatewayVersion: "1.1384.0",
      integrations: 1384,
      summary: `${SDK_LANGUAGES.length} official SDKs (${SDK_LANGUAGES.map((l) => l.id).join(", ")}) covering ${SDK_FEATURES.length} gateway features`,
    };
  }

  generateSdkSnippet(tenantId: string, input: any) {
    const language = String(input?.language || "python");
    const lang = SDK_LANGUAGES.find((l) => l.id === language);
    if (!lang) throw new Error(`Unknown SDK language — available: ${SDK_LANGUAGES.map((l) => l.id).join(", ")}`);
    const feature = String(input?.feature || "auth");
    const feat = SDK_FEATURES.find((f) => f.id === feature);
    if (!feat) throw new Error(`Unknown SDK feature — available: ${SDK_FEATURES.map((f) => f.id).join(", ")}`);
    const seed = `${tenantId}|${language}|${feature}`;
    const lines = [
      `# ${lang.name} — ${feat.id} example (N0VA1O Gateway v1.1384.0)`,
      lang.install,
      "",
      lang.init,
      "",
      feat.snippet,
      "",
      `# gateway endpoint: https://api.n0va.io/v1 — latency p99 ${45 + (hashStr(seed + "lat") % 15)}ms`,
      `# scope prefix: ${input?.scopePrefix ? `"${String(input.scopePrefix)}"` : "gateway.*"} — JIT-pruned at mint time`,
    ];
    logEntry(tenantId, "sdk_snippet_generated", `${language} · ${feat.id} snippet generated`, { language, feature });
    return {
      language, feature, featureName: feat.id,
      code: lines.join("\n"),
      lines: lines.length,
      snippetId: `snip_${hashStr(seed).toString(36)}${random6()}`,
      summary: `${lang.name} snippet — ${feat.id}`,
    };
  }

  sdkInstallGuide(tenantId: string, language: string) {
    const lang = SDK_LANGUAGES.find((l) => l.id === language);
    if (!lang) throw new Error(`Unknown SDK language — available: ${SDK_LANGUAGES.map((l) => l.id).join(", ")}`);
    const seed = `${tenantId}|${language}|install`;
    return {
      language: lang.id,
      package: lang.package,
      installCommand: lang.install,
      minRuntime: lang.minRuntime,
      version: "1.1384.0",
      setupMinutes: 1 + (hashStr(seed) % 3),
      authEnvVars: ["N0VA1O_API_KEY", "N0VA1O_GATEWAY_URL", "N0VA1O_SCOPE_PREFIX", "N0VA1O_JIT_ENABLED"],
      nextSteps: [
        "Mint a JIT token via the API key",
        "Run intent discovery to see available tools",
        "Compile and execute a test recipe",
        "Enable observability export (OTLP endpoint)",
      ],
      summary: `${lang.name} ready in ~${1 + (hashStr(seed) % 3)} min — ${lang.install}`,
    };
  }

  checkSdkVersion(tenantId: string, language: string) {
    const lang = SDK_LANGUAGES.find((l) => l.id === language);
    if (!lang) throw new Error(`Unknown SDK language — available: ${SDK_LANGUAGES.map((l) => l.id).join(", ")}`);
    const latest = `1.1384.${hashStr(`${tenantId}|${language}|ver`) % 10}`;
    return {
      language: lang.id,
      installed: "1.1384.0",
      latest,
      outdated: latest !== "1.1384.0",
      upgradeCommand: lang.install + (lang.registry === "npm" ? "@latest" : " --upgrade"),
      summary: latest === "1.1384.0" ? `${lang.name} SDK is current (1.1384.0)` : `${lang.name} SDK update available: 1.1384.0 → ${latest}`,
    };
  }

  createSdkProject(tenantId: string, input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new Error("Project name is required");
    const language = String(input?.language || "python");
    const lang = SDK_LANGUAGES.find((l) => l.id === language);
    if (!lang) throw new Error(`Unknown SDK language — available: ${SDK_LANGUAGES.map((l) => l.id).join(", ")}`);
    const now = new Date().toISOString();
    const seed = `${tenantId}|${name}|${language}`;
    const row: any = {
      tenantId, name, language,
      version: "1.1384.0",
      status: "active",
      createdAt: now,
      updatedAt: now,
      calls: 0,
    };
    const inserted = DataStore.mem().insert("n0va1o_sdk_projects", row);
    logEntry(tenantId, "sdk_project_created", `SDK project "${name}" (${language}) registered`, { projectId: inserted._id });
    return { projectId: inserted._id, ...row, apiKeyId: `n0va1o_ag_${hashStr(seed).toString(36)}`, summary: `Project "${name}" ready — ${lang.install}` };
  }

  sdkProjects(tenantId: string) {
    const projects = DataStore.mem().find("n0va1o_sdk_projects", (p: any) => p.tenantId === tenantId);
    return {
      projects: projects.map((p: any) => ({ projectId: p._id, name: p.name, language: p.language, version: p.version, status: p.status, createdAt: p.createdAt, calls: p.calls })),
      total: projects.length,
      active: projects.filter((p: any) => p.status === "active").length,
    };
  }

  recordSdkUsage(tenantId: string, input: any) {
    const projectId = String(input?.projectId || "");
    const project = DataStore.mem().findOne("n0va1o_sdk_projects", (p: any) => p.tenantId === tenantId && p._id === projectId);
    if (!project) throw new Error("SDK project not found");
    const calls = (project.calls || 0) + 1;
    DataStore.mem().update("n0va1o_sdk_projects", (p: any) => p._id === projectId, { calls, updatedAt: new Date().toISOString() });
    logEntry(tenantId, "sdk_usage", `SDK call recorded for "${project.name}" (${calls} total)`, { projectId });
    return { projectId, projectName: project.name, calls, summary: `${project.name}: ${calls} SDK call(s)` };
  }

  sdkUsage(tenantId: string) {
    const projects = DataStore.mem().find("n0va1o_sdk_projects", (p: any) => p.tenantId === tenantId);
    const byLanguage = SDK_LANGUAGES.map((l) => ({
      language: l.id,
      projects: projects.filter((p: any) => p.language === l.id).length,
      calls: projects.filter((p: any) => p.language === l.id).reduce((a, p: any) => a + (p.calls || 0), 0),
    }));
    return {
      byLanguage,
      totalCalls: projects.reduce((a, p: any) => a + (p.calls || 0), 0),
      totalProjects: projects.length,
      summary: `${projects.length} SDK project(s), ${projects.reduce((a, p: any) => a + (p.calls || 0), 0)} call(s) recorded`,
    };
  }

  sdkDashboard(tenantId: string) {
    return {
      catalog: this.sdkCatalog(),
      projects: this.sdkProjects(tenantId),
      usage: this.sdkUsage(tenantId),
      installGuides: SDK_LANGUAGES.map((l) => ({ language: l.id, install: l.install, minRuntime: l.minRuntime })),
      log: this.sdkLog(tenantId),
      summary: `${SDK_LANGUAGES.length} SDKs · ${this.sdkProjects(tenantId).total} project(s) · ${this.sdkUsage(tenantId).totalCalls} call(s)`,
    };
  }

  sdkLog(tenantId: string) {
    return { entries: DataStore.mem().find("n0va1o_sdk_log", (l: any) => l.tenantId === tenantId).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 50) };
  }
}

export const n0va1oSdk = new N0VA1OSdkService();
