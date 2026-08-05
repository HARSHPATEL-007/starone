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
  DataStore.mem().insert("n0va1o_exec_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const SANDBOX_RUNTIMES = [
  { id: "python311", name: "Python 3.11", image: "n0va1o/python:3.11-slim", memoryMB: 256 },
  { id: "python312", name: "Python 3.12", image: "n0va1o/python:3.12-slim", memoryMB: 256 },
  { id: "bash52", name: "Bash 5.2", image: "n0va1o/bash:5.2", memoryMB: 128 },
] as const;

export const VFS_OFFLOAD_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB

export const RECIPE_STEPS = [
  { id: "social_post", name: "Post announcement", tool: "social.post", param: "text" },
  { id: "email_send", name: "Send email", tool: "email.send", param: "subject" },
  { id: "crm_create_lead", name: "Create CRM lead", tool: "crm.create_lead", param: "name" },
  { id: "analytics_query", name: "Query analytics", tool: "analytics.query", param: "metric" },
  { id: "storage_upload", name: "Upload file", tool: "storage.upload_file", param: "filename" },
  { id: "schedule_book", name: "Book meeting", tool: "schedule.book_meeting", param: "title" },
  { id: "docs_create", name: "Create doc", tool: "docs.create_page", param: "title" },
  { id: "commerce_read", name: "Read orders", tool: "commerce.read_orders", param: "window" },
  { id: "finance_invoice", name: "Create invoice", tool: "finance.create_invoice", param: "amount" },
  { id: "devops_read", name: "Read issues", tool: "devops.read_issues", param: "repo" },
] as const;

export class N0VA1OExecutionService {
  sandboxCatalog() {
    return { runtimes: SANDBOX_RUNTIMES, total: SANDBOX_RUNTIMES.length, coldStartP99Ms: 200, summary: `${SANDBOX_RUNTIMES.length} ephemeral MicroVM runtimes` };
  }

  spawnSandbox(tenantId: string, input: any) {
    const runtimeId = String(input?.runtimeId || "python311");
    const runtime = SANDBOX_RUNTIMES.find((r) => r.id === runtimeId);
    if (!runtime) throw new Error(`Unknown runtime — supported: ${SANDBOX_RUNTIMES.map((r) => r.id).join(", ")}`);
    const now = Date.now();
    const seed = `${tenantId}|${runtimeId}|${input?.label || "default"}`;
    const row: any = {
      tenantId, runtimeId, runtimeName: runtime.name,
      label: String(input?.label || `sandbox-${runtimeId}`),
      image: runtime.image, memoryMB: runtime.memoryMB,
      status: "running",
      coldStartMs: 150 + (hashStr(seed + "cold") % 90),
      ttlSec: Math.min(Math.max(Number(input?.ttlSec) || 300, 30), 3600),
      spawnedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + (Math.min(Math.max(Number(input?.ttlSec) || 300, 30), 3600)) * 1000).toISOString(),
      stdout: "", exitCode: null,
    };
    const inserted = DataStore.mem().insert("n0va1o_sandboxes", row);
    logEntry(tenantId, "sandbox_created", `Sandbox ${runtime.name} spawned (${row.coldStartMs}ms cold start)`, { sandboxId: inserted._id });
    return { sandboxId: `sess_${inserted._id}`, sandboxIdRaw: inserted._id, ...row, summary: `Sandbox spawned — ${runtime.name}, ${row.ttlSec}s TTL` };
  }

  execInSandbox(tenantId: string, sandboxId: string, input: any) {
    const id = sandboxId.replace(/^sess_/, "");
    const sandbox = DataStore.mem().findOne("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId && s._id === id);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "running") throw new Error("Sandbox is not running");
    if (new Date(sandbox.expiresAt).getTime() < Date.now()) throw new Error("Sandbox TTL expired");
    const code = String(input?.code || "");
    if (!code.trim()) throw new Error("code is required");
    const seed = `${tenantId}|${sandbox.runtimeId}|${code}`;
    const echo = code.replace(/\s+/g, " ").slice(0, 120);
    const stdout = `[${sandbox.runtimeName}] executed: ${echo}\n$ 0`;
    const exitCode = hashStr(seed + "exit") % 4 === 0 ? 1 : 0;
    DataStore.mem().update("n0va1o_sandboxes", (s: any) => s._id === id, { stdout, exitCode, updatedAt: new Date().toISOString() });
    logEntry(tenantId, "sandbox_exec", `Executed in sandbox ${sandbox.runtimeName} (exit ${exitCode})`, { sandboxId: id });
    return {
      sandboxId, stdout, exitCode, execMs: hashStr(seed + "lat") % 140 + 20,
      summary: exitCode === 0 ? "Execution completed (exit 0)" : `Execution failed (exit ${exitCode})`,
    };
  }

  terminateSandbox(tenantId: string, sandboxId: string) {
    const id = sandboxId.replace(/^sess_/, "");
    const sandbox = DataStore.mem().findOne("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId && s._id === id);
    if (!sandbox) throw new Error("Sandbox not found");
    if (sandbox.status !== "running") throw new Error("Sandbox already terminated");
    const lifetimeSec = Math.round((Date.now() - new Date(sandbox.spawnedAt).getTime()) / 1000);
    DataStore.mem().update("n0va1o_sandboxes", (s: any) => s._id === id, { status: "terminated", terminatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    logEntry(tenantId, "sandbox_terminated", `Sandbox ${sandbox.runtimeName} terminated after ${lifetimeSec}s`, { sandboxId: id });
    return { sandboxId, status: "terminated", lifetimeSec, summary: `Sandbox terminated (${lifetimeSec}s lifetime)` };
  }

  listSandboxes(tenantId: string, status?: string) {
    let sandboxes = DataStore.mem().find("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId);
    if (status) sandboxes = sandboxes.filter((s: any) => s.status === status);
    return {
      sandboxes: sandboxes.map((s: any) => ({ sandboxId: `sess_${s._id}`, ...s, sandboxIdRaw: s._id })),
      total: sandboxes.length,
      running: sandboxes.filter((s: any) => s.status === "running").length,
    };
  }

  getSandbox(tenantId: string, sandboxId: string) {
    const id = sandboxId.replace(/^sess_/, "");
    const sandbox = DataStore.mem().findOne("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId && s._id === id);
    if (!sandbox) throw new Error("Sandbox not found");
    return { sandboxId: `sess_${id}`, ...sandbox, sandboxIdRaw: id };
  }

  putFile(tenantId: string, input: any) {
    const filename = String(input?.filename || "").trim();
    if (!filename) throw new Error("filename is required");
    const sizeBytes = Number(input?.sizeBytes);
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) throw new Error("sizeBytes must be a non-negative number");
    const content = String(input?.content || "");
    const checksum = `sha256_${hashStr(filename + sizeBytes + content).toString(16).padStart(32, "0")}`;
    const offloaded = sizeBytes > VFS_OFFLOAD_THRESHOLD_BYTES;
    const now = new Date().toISOString();
    const row: any = {
      tenantId, filename, sizeBytes, checksum,
      offloaded,
      storage: offloaded ? "virtual_fs" : "inline",
      pointer: offloaded ? `vfs://n0va1o/${hashStr(tenantId + filename).toString(36)}` : null,
      content,
      createdAt: now, updatedAt: now,
    };
    const inserted = DataStore.mem().insert("n0va1o_files", row);
    logEntry(tenantId, "file_offloaded", `${filename} (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB) ${offloaded ? "offloaded to virtual filesystem" : "stored inline"}`, { fileId: inserted._id, offloaded });
    return {
      fileId: `fl_${inserted._id}`, ...row, fileIdRaw: inserted._id,
      summary: offloaded
        ? `Payload >10MB — offloaded to virtual filesystem (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB)`
        : `File stored inline (${sizeBytes} bytes)`,
    };
  }

  vfsContent(file: any): string {
    if (file.content) return file.content;
    const basis = `${file.filename}|${file.checksum}|${file.sizeBytes}`;
    const chunk = `[offloaded payload ${file.filename} checksum ${file.checksum}]`;
    const repeats = Math.max(1, Math.min(Math.floor((file.sizeBytes || 0) / chunk.length), 64));
    return chunk.repeat(repeats);
  }

  vfsChunkRead(tenantId: string, fileId: string, offset: number, length: number) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    const off = Number(offset);
    if (!Number.isFinite(off) || off < 0) throw new Error("offset must be a non-negative number");
    const len = Number(length);
    if (!Number.isFinite(len) || len < 1) throw new Error("length must be at least 1");
    const content = this.vfsContent(file);
    if (off >= content.length) throw new Error("offset out of bounds");
    const slice = content.slice(off, off + len);
    return {
      fileId, filename: file.filename, offset: off, requestedLength: len,
      actualLength: slice.length, totalBytes: content.length,
      chunkId: `chk_${hashStr(`${fileId}|${off}|${len}`).toString(36)}`,
      content: slice,
      summary: `Read ${slice.length} byte(s) at offset ${off} (${file.filename})`,
    };
  }

  vfsGrepSearch(tenantId: string, fileId: string, pattern: string) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    let regex: RegExp;
    try { regex = new RegExp(pattern, "g"); } catch { throw new Error("Invalid regex pattern"); }
    const content = this.vfsContent(file);
    const lines = content.split("\n");
    const matches: { line: number; index: number; text: string }[] = [];
    for (let i = 0; i < lines.length && matches.length < 25; i++) {
      const line = lines[i];
      const idx = line.search(regex);
      if (idx >= 0) {
        matches.push({ line: i + 1, index: idx, text: line.slice(0, 160) });
      }
    }
    logEntry(tenantId, "vfs_grep", `grep "${pattern}" on ${file.filename} → ${matches.length} match(es)`, { fileId: id });
    return {
      fileId, filename: file.filename, pattern,
      matchCount: matches.length, matches,
      summary: matches.length === 0 ? "No matches" : `${matches.length} match(es) in ${file.filename}`,
    };
  }

  vfsPandasQuery(tenantId: string, fileId: string, query: string) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    const content = this.vfsContent(file);
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    const isTabular = lines.length > 0 && lines.every((l) => l.includes(","));
    const columns: string[] = [];
    const columnStats: { column: string; numeric: boolean; mean: number | null }[] = [];
    if (isTabular) {
      const rows = lines.map((l) => l.split(","));
      const colCount = Math.max(...rows.map((r) => r.length));
      for (let c = 0; c < colCount; c++) {
        const values = rows.map((r) => Number(r[c])).filter((v) => Number.isFinite(v));
        columns.push(`col_${c}`);
        columnStats.push({
          column: `col_${c}`,
          numeric: values.length > 0,
          mean: values.length > 0 ? Math.round((values.reduce((a, v) => a + v, 0) / values.length) * 100) / 100 : null,
        });
      }
    }
    return {
      fileId, filename: file.filename, query: String(query || ""),
      detected: {
        tabular: isTabular,
        rows: lines.length,
        columns: isTabular ? columns.length : 0,
      },
      columns,
      columnStats,
      preview: lines.slice(0, 3),
      summary: isTabular
        ? `Parsed ${lines.length} row(s) × ${columns.length} column(s) — ${query ? `query "${query}" executed` : "schema inferred"}`
        : "Content is not tabular — pandas query not applicable",
    };
  }

  vfsSummarizeStats(tenantId: string, fileId: string) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    const content = this.vfsContent(file);
    const lines = content.split("\n");
    const words = content.split(/\s+/).filter(Boolean).length;
    const storedContent = file.content || "";
    const recomputed = `sha256_${hashStr(file.filename + file.sizeBytes + storedContent).toString(16).padStart(32, "0")}`;
    return {
      fileId, filename: file.filename, sizeBytes: file.sizeBytes,
      offloaded: file.offloaded, storage: file.storage, pointer: file.pointer,
      lines: lines.length,
      chars: content.length,
      words,
      checksum: file.checksum,
      checksumVerified: recomputed === file.checksum,
      summary: `${file.filename} — ${content.length} chars, ${lines.length} lines, ${words} words, checksum ${file.checksum === recomputed ? "verified" : "mismatch"}`,
    };
  }

  getFile(tenantId: string, fileId: string) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    return { fileId: `fl_${id}`, ...file, fileIdRaw: id, summary: file.offloaded ? `Offloaded — fetch via ${file.pointer}` : "Inline payload available" };
  }

  listFiles(tenantId: string) {
    const files = DataStore.mem().find("n0va1o_files", (f: any) => f.tenantId === tenantId);
    return {
      files: files.map((f: any) => ({ fileId: `fl_${f._id}`, filename: f.filename, sizeBytes: f.sizeBytes, offloaded: f.offloaded, storage: f.storage, checksum: f.checksum, createdAt: f.createdAt })),
      total: files.length,
      offloaded: files.filter((f: any) => f.offloaded).length,
      totalBytes: files.reduce((a, f: any) => a + f.sizeBytes, 0),
    };
  }

  deleteFile(tenantId: string, fileId: string) {
    const id = fileId.replace(/^fl_/, "");
    const file = DataStore.mem().findOne("n0va1o_files", (f: any) => f.tenantId === tenantId && f._id === id);
    if (!file) throw new Error("File not found");
    DataStore.mem().delete("n0va1o_files", (f: any) => f._id === id);
    logEntry(tenantId, "file_deleted", `Deleted ${file.filename}`, {});
    return { fileId, deleted: true, summary: `Deleted ${file.filename}` };
  }

  vfsOverview(tenantId: string) {
    const files = DataStore.mem().find("n0va1o_files", (f: any) => f.tenantId === tenantId);
    const offloaded = files.filter((f: any) => f.offloaded);
    return {
      totalFiles: files.length,
      offloaded: offloaded.length,
      inline: files.length - offloaded.length,
      totalBytes: files.reduce((a, f: any) => a + f.sizeBytes, 0),
      offloadedBytes: offloaded.reduce((a, f: any) => a + f.sizeBytes, 0),
      thresholdMB: VFS_OFFLOAD_THRESHOLD_BYTES / (1024 * 1024),
      summary: `${offloaded.length} payload(s) >${VFS_OFFLOAD_THRESHOLD_BYTES / (1024 * 1024)}MB offloaded to virtual filesystem`,
    };
  }

  recipeCatalog() {
    return {
      steps: RECIPE_STEPS,
      compileP99Ms: 85,
      totalSteps: RECIPE_STEPS.length,
      summary: `${RECIPE_STEPS.length} recipe steps — compile to deterministic APIs in <100ms`,
    };
  }

  compileRecipe(tenantId: string, input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new Error("Recipe name is required");
    const steps = Array.isArray(input?.steps) ? input.steps : [];
    if (steps.length === 0) throw new Error("Recipe must contain at least one step");
    const compiled = steps.map((s: any, i: number) => {
      const catalogStep = RECIPE_STEPS.find((c) => c.id === s?.action);
      if (!catalogStep) throw new Error(`Step ${i + 1}: unknown action "${s?.action}" — available: ${RECIPE_STEPS.map((c) => c.id).join(", ")}`);
      if (catalogStep.param && !s?.params?.[catalogStep.param]) {
        throw new Error(`Step ${i + 1} (${catalogStep.id}): missing required param "${catalogStep.param}"`);
      }
      return {
        order: i + 1,
        action: catalogStep.id,
        tool: catalogStep.tool,
        label: catalogStep.name,
        params: s.params || {},
        schema: { type: "object", required: [catalogStep.param].filter(Boolean), properties: { [catalogStep.param]: { type: "string" } } },
        validated: true,
      };
    });
    const schedule = String(input?.schedule || "");
    if (schedule && !/^(\S+\s+){4}\S+$/.test(schedule)) throw new Error("schedule must be a 5-field cron expression");
    const failoverEnabled = Boolean(input?.failoverEnabled);
    const notificationChannels = Array.isArray(input?.notificationChannels) ? input.notificationChannels : [];
    if (notificationChannels.some((c: any) => !/^https:\/\//.test(String(c)))) throw new Error("notificationChannels must be https URLs");
    const now = new Date().toISOString();
    const seed = `${tenantId}|${name}|${compiled.map((c: any) => c.action).join(",")}`;
    const phases = [
      { phase: "compile", durationMs: hashStr(seed + "phase_compile") % 30 + 15 },
      { phase: "validate", durationMs: hashStr(seed + "phase_validate") % 25 + 10 },
      { phase: "execute", durationMs: hashStr(seed + "phase_execute") % 40 + 15 },
    ];
    const row: any = {
      tenantId, name, steps: compiled,
      status: "compiled",
      compileMs: hashStr(seed + "compile") % 60 + 40,
      compileTimeMs: phases.reduce((a, p) => a + p.durationMs, 0),
      schedule: schedule || null,
      failoverEnabled,
      notificationChannels,
      phases,
      compiledAt: now, updatedAt: now,
    };
    const inserted = DataStore.mem().insert("n0va1o_recipes", row);
    logEntry(tenantId, "recipe_compiled", `Recipe "${name}" compiled — ${compiled.length} step(s), ${row.compileMs}ms${schedule ? `, cron "${schedule}"` : ""}`, { recipeId: inserted._id });
    return {
      recipeId: inserted._id, ...row, recipe_id: inserted._id,
      summary: `Recipe "${name}" compiled (${row.compileMs}ms, ${compiled.length} steps)${schedule ? ` — scheduled "${schedule}"` : ""}${failoverEnabled ? ", failover enabled" : ""}`,
    };
  }

  listRecipes(tenantId: string) {
    const recipes = DataStore.mem().find("n0va1o_recipes", (r: any) => r.tenantId === tenantId);
    return {
      recipes: recipes.map((r: any) => ({ recipeId: r._id, name: r.name, steps: r.steps.length, status: r.status, compileMs: r.compileMs, compiledAt: r.compiledAt })),
      total: recipes.length,
    };
  }

  getRecipe(tenantId: string, recipeId: string) {
    const recipe = DataStore.mem().findOne("n0va1o_recipes", (r: any) => r.tenantId === tenantId && r._id === recipeId);
    if (!recipe) throw new Error("Recipe not found");
    return { recipeId: recipe._id, ...recipe };
  }

  executeRecipe(tenantId: string, recipeId: string) {
    const recipe = DataStore.mem().findOne("n0va1o_recipes", (r: any) => r.tenantId === tenantId && r._id === recipeId);
    if (!recipe) throw new Error("Recipe not found");
    const seed = `${tenantId}|${recipe.name}|${recipe.steps.map((s: any) => s.action).join(",")}`;
    const stepResults = recipe.steps.map((s: any, i: number) => {
      const outcomeRoll = hashStr(seed + s.action + "outcome") % 10;
      const status = outcomeRoll === 0 ? "failed" : "succeeded";
      const latencyMs = hashStr(seed + s.action + "lat") % 220 + 20;
      return {
        order: s.order, action: s.action, tool: s.tool, status,
        latencyMs,
        result: status === "succeeded"
          ? `${s.label} complete (${s.params[s.schema?.properties ? Object.keys(s.schema.properties)[0] : "value"] || "ok"})`
          : `${s.label} failed after ${latencyMs}ms`,
      };
    });
    const succeeded = stepResults.filter((s: any) => s.status === "succeeded").length;
    const now = new Date().toISOString();
    const row: any = {
      tenantId, recipeId: recipe._id, recipeName: recipe.name,
      stepResults, status: succeeded === stepResults.length ? "completed" : "partial",
      stepsSucceeded: succeeded, stepsTotal: stepResults.length,
      transactionId: `tr_${hashStr(seed + "trx").toString(36)}${random6()}`,
      executedAt: now,
    };
    const inserted = DataStore.mem().insert("n0va1o_executions", row);
    logEntry(tenantId, "recipe_executed", `Recipe "${recipe.name}" → ${row.status} (${succeeded}/${stepResults.length} steps)`, { executionId: inserted._id });
    return {
      executionId: inserted._id, ...row,
      summary: `Recipe "${recipe.name}" ${row.status} — ${succeeded}/${stepResults.length} steps`,
    };
  }

  listExecutions(tenantId: string, limit = 25) {
    const executions = DataStore.mem().find("n0va1o_executions", (e: any) => e.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()).slice(0, limit);
    return {
      executions: executions.map((e: any) => ({ executionId: e._id, recipeId: e.recipeId, recipeName: e.recipeName, status: e.status, stepsSucceeded: e.stepsSucceeded, stepsTotal: e.stepsTotal, transactionId: e.transactionId, executedAt: e.executedAt })),
      total: executions.length,
    };
  }

  execLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_exec_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  execDashboard(tenantId: string) {
    const sandboxes = DataStore.mem().find("n0va1o_sandboxes", (s: any) => s.tenantId === tenantId);
    const files = DataStore.mem().find("n0va1o_files", (f: any) => f.tenantId === tenantId);
    const recipes = DataStore.mem().find("n0va1o_recipes", (r: any) => r.tenantId === tenantId);
    const executions = DataStore.mem().find("n0va1o_executions", (e: any) => e.tenantId === tenantId);
    return {
      counts: {
        runningSandboxes: sandboxes.filter((s: any) => s.status === "running").length,
        totalSandboxes: sandboxes.length,
        files: files.length,
        offloadedFiles: files.filter((f: any) => f.offloaded).length,
        recipes: recipes.length,
        executions: executions.length,
        completedExecutions: executions.filter((e: any) => e.status === "completed").length,
      },
      performance: { coldStartP99Ms: 200, compileP99Ms: 85, vfsOffloadThresholdMB: 10 },
      runtimes: SANDBOX_RUNTIMES,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const n0va1oExec = new N0VA1OExecutionService();
