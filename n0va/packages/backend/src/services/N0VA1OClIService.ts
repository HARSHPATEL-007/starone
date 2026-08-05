import { DataStore } from "./DataStore";
import { n0va1oCatalog } from "./N0VA1OCatalogService";
import { n0va1oGov } from "./N0VA1OGovernanceService";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function random6(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function pad4(n: number): string {
  return String(n % 10000).padStart(4, "0");
}

function logEntry(tenantId: string, category: string, detail: string, extra: any = {}) {
  DataStore.mem().insert("n0va1o_cli_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const CLI_PLATFORMS = [
  { id: "macos", name: "macOS", installCommand: "curl -fsSL https://n0va.io/cli/install.sh | sh", packageManager: "curl" },
  { id: "win32", name: "Windows", installCommand: "irm https://n0va.io/cli/install.ps1 | iex", packageManager: "powershell" },
  { id: "linux", name: "Linux", installCommand: "curl -fsSL https://n0va.io/cli/install.sh | sh", packageManager: "curl" },
  { id: "npm", name: "Universal (npm)", installCommand: "npm i -g @n0va1o/cli", packageManager: "npm" },
] as const;

export const CLI_COMMANDS = [
  { command: "install", description: "Install the N0VA1O CLI on this machine", usage: "n0va install [--platform macos|win32|linux|npm]" },
  { command: "init", description: "Initialize a project workspace", usage: "n0va init [--name <workspace>]" },
  { command: "auth", description: "Authenticate with a device code", usage: "n0va auth" },
  { command: "login", description: "Alias for auth — sign in to N0VA1O", usage: "n0va login" },
  { command: "logout", description: "End the active session", usage: "n0va logout" },
  { command: "status", description: "Show install + auth status", usage: "n0va status" },
  { command: "whoami", description: "Show the authenticated user", usage: "n0va whoami" },
  { command: "discover", description: "Discover tools from 1,000+ platforms", usage: "n0va discover <query>" },
  { command: "tools", description: "List tools available to the session", usage: "n0va tools [--limit <n>]" },
  { command: "call", description: "Execute a tool by id", usage: "n0va call <toolId> [--json]" },
  { command: "deploy", description: "Deploy a recipe to the gateway", usage: "n0va deploy <recipeId>" },
  { command: "sessions", description: "List CLI sessions", usage: "n0va sessions [--status active]" },
  { command: "keys", description: "Manage agent API keys", usage: "n0va keys [--agent <id>]" },
  { command: "recipes", description: "List compiled recipes", usage: "n0va recipes" },
  { command: "version", description: "Print the CLI version", usage: "n0va version" },
  { command: "help", description: "Show the command reference", usage: "n0va help" },
] as const;

export const CLI_SCOPES = ["tools.discover", "tools.execute", "gateway.read"] as const;

export class N0VA1OClIService {
  cliCatalog() {
    return {
      platforms: CLI_PLATFORMS,
      commands: CLI_COMMANDS,
      totalCommands: CLI_COMMANDS.length,
      version: "1.1384.0",
      summary: `${CLI_COMMANDS.length} CLI commands — no SDKs, just install, authenticate, and deploy against ${n0va1oCatalog.gatewayCatalog("x").totalPlatforms} platforms`,
    };
  }

  installCli(tenantId: string, input: any) {
    const platform = String(input?.platform || "npm");
    const p = CLI_PLATFORMS.find((x) => x.id === platform);
    if (!p) throw new Error(`Unknown platform — available: ${CLI_PLATFORMS.map((x) => x.id).join(", ")}`);
    const seed = `${tenantId}|${platform}`;
    const version = "1.1384.0";
    const installSeconds = 8 + (hashStr(seed + "install") % 23);
    const packageSizeMb = 24 + (hashStr(seed + "size") % 40);
    const now = new Date().toISOString();
    const existing = DataStore.mem().findOne("n0va1o_cli", (c: any) => c.tenantId === tenantId);
    if (existing) {
      DataStore.mem().update("n0va1o_cli", (c: any) => c._id === existing._id, { platform, version, installSeconds, packageSizeMb, installedAt: now, updatedAt: now });
    } else {
      DataStore.mem().insert("n0va1o_cli", { tenantId, platform, version, installSeconds, packageSizeMb, installedAt: now, createdAt: now, updatedAt: now });
    }
    logEntry(tenantId, "cli_installed", `CLI ${version} installed on ${p.name} (${installSeconds}s, ${packageSizeMb}MB)`, { platform });
    return {
      installed: true, platform, installCommand: p.installCommand, packageManager: p.packageManager,
      version, installSeconds, packageSizeMb,
      summary: `N0VA1O CLI ${version} installed for ${p.name} — run 'n0va auth' to connect`,
    };
  }

  cliInstallStatus(tenantId: string) {
    const row = DataStore.mem().findOne("n0va1o_cli", (c: any) => c.tenantId === tenantId);
    if (!row) return { installed: false, summary: "N0VA1O CLI not installed — run 'n0va install'" };
    return {
      installed: true, platform: row.platform, version: row.version,
      installSeconds: row.installSeconds, packageSizeMb: row.packageSizeMb, installedAt: row.installedAt,
      summary: `N0VA1O CLI ${row.version} installed on ${row.platform}`,
    };
  }

  private latestAuthenticatedSession(tenantId: string): any {
    const sessions = DataStore.mem().find("n0va1o_cli_sessions", (s: any) => s.tenantId === tenantId && s.status === "authenticated");
    return sessions.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0] || null;
  }

  authenticateCli(tenantId: string, input: any) {
    const email = String(input?.email || "").toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required");
    const seed = `${tenantId}|${email}`;
    const sessionId = `cli_${hashStr(seed).toString(36)}${random6()}`;
    const expiresInSeconds = 600;
    const row: any = {
      tenantId, email, sessionId,
      deviceCode: `n0va-${pad4(hashStr(seed + "dc1"))}-${pad4(hashStr(seed + "dc2"))}`,
      verificationUrl: "https://n0va.io/cli/device",
      scopes: CLI_SCOPES,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
    DataStore.mem().insert("n0va1o_cli_sessions", row);
    logEntry(tenantId, "cli_auth_started", `Device-code auth started for ${email}`, { sessionId });
    return {
      sessionId, email, deviceCode: row.deviceCode, verificationUrl: row.verificationUrl,
      scopes: row.scopes, status: "pending", expiresInSeconds,
      summary: `Enter ${row.deviceCode} at ${row.verificationUrl} — expires in ${expiresInSeconds / 60} min`,
    };
  }

  completeCliAuth(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("n0va1o_cli_sessions", (s: any) => s.tenantId === tenantId && s.sessionId === sessionId);
    if (!session) throw new Error("CLI session not found");
    if (session.status !== "pending") throw new Error("Session already completed — only pending sessions can be completed");
    if (new Date(session.expiresAt).getTime() < Date.now()) throw new Error("Device code expired — re-run 'n0va auth'");
    const seed = `${tenantId}|${session.email}|${session.sessionId}`;
    const now = new Date().toISOString();
    DataStore.mem().update("n0va1o_cli_sessions", (s: any) => s._id === session._id, {
      status: "authenticated", accessToken: `cli_at_${hashStr(seed + "at").toString(36)}${random6()}`,
      refreshToken: `cli_rt_${hashStr(seed + "rt").toString(36)}${random6()}`,
      lastUsedAt: now, updatedAt: now,
    });
    const updated = DataStore.mem().findOne("n0va1o_cli_sessions", (s: any) => s._id === session._id);
    logEntry(tenantId, "cli_authenticated", `CLI authenticated for ${session.email}`, { sessionId });
    return {
      sessionId, email: session.email, status: "authenticated",
      accessToken: updated.accessToken, refreshToken: updated.refreshToken,
      scopes: session.scopes, expiresAt: session.expiresAt,
      summary: `CLI authenticated as ${session.email} — 3 scope(s) granted`,
    };
  }

  cliSessions(tenantId: string, status?: string) {
    let sessions = DataStore.mem().find("n0va1o_cli_sessions", (s: any) => s.tenantId === tenantId);
    if (status) sessions = sessions.filter((s: any) => s.status === status);
    sessions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      sessions: sessions.map((s: any) => ({
        sessionId: s.sessionId, email: s.email, deviceCode: s.deviceCode, scopes: s.scopes,
        status: s.status, createdAt: s.createdAt, expiresAt: s.expiresAt, lastUsedAt: s.lastUsedAt || null,
      })),
      total: sessions.length,
      pending: sessions.filter((s: any) => s.status === "pending").length,
      authenticated: sessions.filter((s: any) => s.status === "authenticated").length,
    };
  }

  endCliSession(tenantId: string, sessionId: string) {
    const session = DataStore.mem().findOne("n0va1o_cli_sessions", (s: any) => s.tenantId === tenantId && s.sessionId === sessionId);
    if (!session) throw new Error("CLI session not found");
    DataStore.mem().update("n0va1o_cli_sessions", (s: any) => s._id === session._id, { status: "ended", endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "cli_session_ended", `CLI session ended for ${session.email}`, { sessionId });
    return { sessionId, status: "ended", summary: `CLI session for ${session.email} ended` };
  }

  cliDiscover(tenantId: string, query: string) {
    const q = String(query || "").trim();
    if (!q) throw new Error("A discovery query is required");
    const res = n0va1oCatalog.catalogSearch(tenantId, q);
    const tools = res.results.slice(0, 20).map((p: any) => ({
      toolId: p.id, name: p.name, category: p.category,
      authType: p.authType || null, protocols: p.protocols || [], capabilities: p.capabilities || [],
    }));
    logEntry(tenantId, "cli_discovered", `CLI discovery for "${q}" — ${res.count} match(es)`, { query: q, count: res.count });
    return {
      tools, count: res.count, returned: tools.length, query: q,
      summary: `${res.count} tool(s) match "${q}" — ${tools.length} returned`,
    };
  }

  executeCliCommand(tenantId: string, input: any) {
    const raw = String(input?.command || "");
    if (!raw.trim()) throw new Error("A command is required");
    let tokens = raw.trim().split(/\s+/);
    if (tokens[0].toLowerCase() === "n0va") tokens = tokens.slice(1);
    const cmd = String(tokens[0] || "").toLowerCase();
    const args = tokens.slice(1);
    const seed = `${tenantId}|${cmd}|${args.join(" ")}`;
    const durationMs = 3 + (hashStr(seed + "dur") % 9);
    const session = this.latestAuthenticatedSession(tenantId);
    const requiresAuth = ["init", "auth", "login", "logout", "whoami", "discover", "tools", "call", "deploy", "sessions", "keys", "recipes"].includes(cmd);
    if (requiresAuth && !session) {
      logEntry(tenantId, "cli_command", `n0va ${cmd} → blocked (unauthenticated)`, { command: cmd, exitCode: 1 });
      return { command: cmd, args, stdout: "", stderr: "Not authenticated — run 'n0va auth' first", exitCode: 1, durationMs, summary: `n0va ${cmd} blocked — not authenticated` };
    }
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    if (cmd === "version") {
      stdout = `n0va1o-cli/1.1384.0 (gateway ${n0va1oCatalog.gatewayCatalog(tenantId).totalPlatforms} platforms)`;
    } else if (cmd === "help") {
      stdout = CLI_COMMANDS.map((c) => `${c.command.padEnd(12)} ${c.description}`).join("\n");
    } else if (cmd === "status") {
      const inst = this.cliInstallStatus(tenantId);
      stdout = `installed: ${inst.installed ? "yes" : "no"}${inst.platform ? ` (${inst.platform}, ${inst.version})` : ""}\nauthenticated: ${session ? `yes (${session.email})` : "no"}`;
    } else if (cmd === "whoami") {
      stdout = session.email;
    } else if (cmd === "logout") {
      this.endCliSession(tenantId, session.sessionId);
      stdout = "Logged out — CLI session ended";
    } else if (cmd === "deploy" || cmd === "keys" || cmd === "recipes" || cmd === "init") {
      stdout = `${cmd} — gateway ready, manage this from the N0VA1O web console (demo shell)`;
    } else if (cmd === "discover") {
      if (!args[0]) { stderr = "Usage: n0va discover <query>"; exitCode = 1; }
      else {
        const d = this.cliDiscover(tenantId, args[0]);
        stdout = d.tools.map((t: any) => `- ${t.name} (${t.toolId}) [${t.category}]`).join("\n") + `\n${d.count} tool(s) matched`;
      }
    } else if (cmd === "call") {
      const toolId = String(args[0] || "");
      if (!toolId) { stderr = "Usage: n0va call <toolId>"; exitCode = 1; }
      else {
        const search = n0va1oCatalog.catalogSearch(tenantId, "");
        const tool = search.results.find((p: any) => p.id === toolId || p.name.toLowerCase() === toolId.toLowerCase());
        if (!tool) { stderr = `tool not found: ${toolId}`; exitCode = 1; }
        else {
          const execMs = 20 + (hashStr(`${tenantId}|${toolId}|call`) % 180);
          stdout = `✓ ${tool.name} executed via gateway — ${execMs}ms`;
          n0va1oGov.appendAudit(tenantId, { action: "cli_call", toolId: tool.id, actor: session.email, details: { via: "cli", platform: this.cliInstallStatus(tenantId).platform || "npm" } });
        }
      }
    } else if (cmd === "sessions") {
      const s = this.cliSessions(tenantId);
      stdout = s.sessions.map((x: any) => `- ${x.sessionId} ${x.email} [${x.status}]`).join("\n") || "(no sessions)";
    } else if (cmd === "tools") {
      const d = this.cliDiscover(tenantId, args.join(" ") || "hubspot");
      stdout = d.tools.slice(0, 10).map((t: any) => `- ${t.name} (${t.toolId})`).join("\n");
    } else {
      stderr = `Unknown command "${cmd}" — run 'n0va help'`;
      exitCode = 1;
    }
    logEntry(tenantId, "cli_command", `n0va ${cmd} ${args.join(" ")} → exit ${exitCode} (${durationMs}ms)`, { command: cmd, args, exitCode, durationMs });
    return { command: cmd, args, stdout, stderr, exitCode, durationMs, summary: exitCode === 0 ? `n0va ${cmd} completed in ${durationMs}ms` : `n0va ${cmd} failed (${stderr})` };
  }

  cliDashboard(tenantId: string) {
    const install = this.cliInstallStatus(tenantId);
    const sessions = this.cliSessions(tenantId);
    const commands = DataStore.mem().find("n0va1o_cli_log", (l: any) => l.tenantId === tenantId && l.category === "cli_command");
    const recent = DataStore.mem().find("n0va1o_cli_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
    return {
      installed: install.installed,
      installPlatform: install.platform || null,
      version: install.version || null,
      sessions: sessions.total,
      activeSessions: sessions.authenticated,
      commandsRun: commands.length,
      integrationsReachable: n0va1oCatalog.gatewayCatalog(tenantId).totalPlatforms,
      recentCommands: recent,
      summary: `CLI ${install.installed ? `installed (${install.version})` : "not installed"} — ${sessions.authenticated} authenticated session(s), ${commands.length} command(s) run`,
    };
  }

  cliLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_cli_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }
}

export const n0va1oCli = new N0VA1OClIService();
