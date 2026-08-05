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
  DataStore.mem().insert("n0va1o_migration_log", {
    tenantId, category, detail, at: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
  });
}

export const MIGRATION_TARGETS = [
  { id: "zapier", name: "Zapier", description: "Legacy iPaaS — import audit log, agents, zaps, connected apps, webhooks", sizeHintMB: 420 },
  { id: "mulesoft", name: "MuleSoft", description: "Legacy ESB — import flows, API configs, credentials, listeners", sizeHintMB: 310 },
  { id: "workato", name: "Workato", description: "Legacy automation platform — import recipes, connections, schedules", sizeHintMB: 260 },
  { id: "tray", name: "Tray.io", description: "Legacy low-code platform — import workflows, connectors, triggers", sizeHintMB: 190 },
] as const;

export const PROGRESS_PHASES = [
  { id: "audit_export", name: "Export audit trail", description: "Export legacy audit trail as CSV (n0va1o/audit/export)" },
  { id: "agents", name: "Recreate agents", description: "Recreate agents with scopes, permissions and autonomy (n0va1o/auth/agents)" },
  { id: "recipes", name: "Recreate recipes", description: "Recompile recipes with steps, phases and schedules (n0va1o/recipes/compile)" },
  { id: "connections", name: "Re-connect platforms", description: "Re-authorize platform connections via OAuth or API key (n0va1o/auth/connections)" },
  { id: "webhooks", name: "Re-create webhooks", description: "Recreate trigger subscriptions with HMAC secrets (n0va1o/triggers)" },
  { id: "validate", name: "Validate with CLI", description: "Validate the migration with `n0va status` and smoke-run a recipe" },
] as const;

export class N0VA1OMigrationService {
  migrationCatalog() {
    return {
      targets: MIGRATION_TARGETS.map((t) => ({ ...t })),
      phases: PROGRESS_PHASES.map((p) => ({ ...p })),
      summary: `${MIGRATION_TARGETS.length} legacy gateway source(s) × ${PROGRESS_PHASES.length} migration phases`,
    };
  }

  startMigration(tenantId: string, input: any) {
    const source = String(input?.source || "").toLowerCase();
    const target = MIGRATION_TARGETS.find((t) => t.id === source);
    if (!target) throw new Error(`Unknown migration source — available: ${MIGRATION_TARGETS.map((t) => t.id).join(", ")}`);
    const label = String(input?.label || `Legacy ${target.name} migration`);
    const now = Date.now();
    const migrationId = `mig_${now}_${random6()}`;
    const seed = `${tenantId}|${migrationId}`;
    const row: any = {
      _id: migrationId,
      tenantId,
      source: target.id,
      sourceName: target.name,
      label,
      status: "in_progress",
      phaseMapping: PROGRESS_PHASES.map((p, i) => `${i + 1}.${p.id}`).join(" → "),
      transferSizeEstimateMB: (10 + hashStr(seed + "size") % 90) + target.sizeHintMB,
      durationEstimateMin: PROGRESS_PHASES.length * (3 + hashStr(seed + "dur") % 12),
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      completedAt: null,
    };
    DataStore.mem().insert("n0va1o_migrations", row);
    PROGRESS_PHASES.forEach((p, i) => {
      const phaseSeed = `${migrationId}|${p.id}`;
      DataStore.mem().insert("n0va1o_migration_phases", {
        tenantId, migrationId, phaseId: p.id, name: p.name, description: p.description,
        order: i,
        dependsOn: i > 0 ? PROGRESS_PHASES[i - 1].id : null,
        status: i === 0 ? "ready" : "blocked",
        transferPct: 0,
        itemsImported: 0,
        transferSizeEstimateMB: 5 + hashStr(phaseSeed + "sz") % 60,
        durationEstimateMin: 3 + hashStr(phaseSeed + "dm") % 12,
        startedAt: null, completedAt: null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      });
    });
    logEntry(tenantId, "migration_started", `Migration "${label}" started from ${target.name} — ${PROGRESS_PHASES.length} phases`, { migrationId, source: target.id });
    return {
      migrationId,
      source: target.id,
      sourceName: target.name,
      label,
      status: "in_progress",
      phases: PROGRESS_PHASES.map((p, idx) => ({ phaseId: p.id, name: p.name, order: idx })),
      transferSizeEstimateMB: row.transferSizeEstimateMB,
      durationEstimateMin: row.durationEstimateMin,
      summary: `Migration "${label}" started — ${PROGRESS_PHASES.length} phases (${row.transferSizeEstimateMB} MB estimated)`,
    };
  }

  listMigrations(tenantId: string) {
    const migrations = DataStore.mem().find("n0va1o_migrations", (m: any) => m.tenantId === tenantId);
    return {
      migrations: migrations.map((m: any) => this.migrationPublic(m)),
      total: migrations.length,
      inProgress: migrations.filter((m: any) => m.status === "in_progress").length,
      completed: migrations.filter((m: any) => m.status === "completed").length,
    };
  }

  getMigration(tenantId: string, migrationId: string) {
    const migration = DataStore.mem().findOne("n0va1o_migrations", (m: any) => m.tenantId === tenantId && m._id === migrationId);
    if (!migration) throw new Error("Migration not found");
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId).sort((a: any, b: any) => a.order - b.order);
    return {
      ...this.migrationPublic(migration),
      phases: phases.map((p: any) => this.phasePublic(p)),
      progressPct: this.progressPct(phases),
    };
  }

  migrationPlan(tenantId: string, migrationId: string) {
    const migration = DataStore.mem().findOne("n0va1o_migrations", (m: any) => m.tenantId === tenantId && m._id === migrationId);
    if (!migration) throw new Error("Migration not found");
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId).sort((a: any, b: any) => a.order - b.order);
    return {
      migrationId,
      source: migration.source,
      phases: phases.map((p: any) => ({
        phaseId: p.phaseId, name: p.name, order: p.order, dependsOn: p.dependsOn,
        transferSizeEstimateMB: p.transferSizeEstimateMB,
        durationEstimateMin: p.durationEstimateMin,
        status: p.status,
      })),
      transferSizeEstimateMB: migration.transferSizeEstimateMB,
      durationEstimateMin: migration.durationEstimateMin,
      dependencyChain: PROGRESS_PHASES.map((p) => p.id).join(" → "),
      summary: `${phases.length} phases planned — ~${migration.transferSizeEstimateMB} MB, ~${migration.durationEstimateMin} min`,
    };
  }

  runMigrationPhase(tenantId: string, migrationId: string, phaseId: string) {
    const migration = DataStore.mem().findOne("n0va1o_migrations", (m: any) => m.tenantId === tenantId && m._id === migrationId);
    if (!migration) throw new Error("Migration not found");
    if (migration.status !== "in_progress") throw new Error("Migration is not in progress");
    const phase = DataStore.mem().findOne("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId && p.phaseId === phaseId);
    if (!phase) throw new Error("Phase not found");
    if (phase.status === "done") throw new Error("Phase already completed");
    const dep = phase.dependsOn ? DataStore.mem().findOne("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId && p.phaseId === phase.dependsOn) : null;
    if (dep && dep.status !== "done") throw new Error(`Phase "${phase.name}" blocked — complete "${dep.name}" first`);
    const roll = 60 + hashStr(`${migrationId}|${phaseId}`) % 41;
    const transferPct = Math.min(100, (phase.transferPct || 0) + roll);
    const itemsImported = 8 + hashStr(`${migrationId}|${phaseId}|items`) % 90;
    const now = new Date().toISOString();
    const done = transferPct >= 100;
    DataStore.mem().update("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId && p.phaseId === phaseId, {
      status: done ? "done" : "in_progress",
      transferPct,
      itemsImported,
      startedAt: phase.startedAt || now,
      completedAt: done ? now : null,
      updatedAt: now,
    });
    const allPhases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId);
    if (done) {
      const next = allPhases.find((p: any) => p.order === phase.order + 1);
      if (next) DataStore.mem().update("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId && p.phaseId === next.phaseId, { status: "ready", updatedAt: now });
      const remaining = allPhases.filter((p: any) => p.status !== "done");
      if (remaining.length === 0) {
        DataStore.mem().update("n0va1o_migrations", (m: any) => m._id === migrationId, { status: "completed", completedAt: now, updatedAt: now });
      }
    }
    logEntry(tenantId, "phase_run", `Phase "${phase.name}" ${done ? "completed" : "advanced to " + transferPct + "%"} (${itemsImported} item(s) imported)`, { migrationId, phaseId, transferPct, itemsImported });
    return {
      migrationId, phaseId, name: phase.name,
      transferPct, itemsImported, status: done ? "done" : "in_progress",
      summary: done ? `Phase "${phase.name}" completed — ${itemsImported} item(s) imported` : `Phase "${phase.name}" at ${transferPct}% — ${itemsImported} item(s) imported so far`,
    };
  }

  migrationStatus(tenantId: string, migrationId: string) {
    const migration = DataStore.mem().findOne("n0va1o_migrations", (m: any) => m.tenantId === tenantId && m._id === migrationId);
    if (!migration) throw new Error("Migration not found");
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId).sort((a: any, b: any) => a.order - b.order);
    const progressPct = this.progressPct(phases);
    return {
      migrationId: migration._id,
      source: migration.source,
      sourceName: migration.sourceName,
      label: migration.label,
      status: migration.status,
      progressPct,
      remaining: phases.filter((p: any) => p.status !== "done").length,
      phases: phases.map((p: any) => this.phasePublic(p)),
      summary: migration.status === "completed" ? `Migration complete — ${phases.length}/${phases.length} phases done` : `Migration ${Math.round(progressPct)}% — ${phases.filter((p: any) => p.status === "done").length}/${phases.length} phases done`,
    };
  }

  deleteMigration(tenantId: string, migrationId: string) {
    const migration = DataStore.mem().findOne("n0va1o_migrations", (m: any) => m.tenantId === tenantId && m._id === migrationId);
    if (!migration) throw new Error("Migration not found");
    DataStore.mem().delete("n0va1o_migrations", (m: any) => m._id === migrationId);
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId);
    for (let i = 0; i < phases.length; i++) {
      DataStore.mem().delete("n0va1o_migration_phases", (p: any) => p.migrationId === migrationId && p._id === phases[i]._id);
    }
    logEntry(tenantId, "migration_deleted", `Migration "${migration.label}" deleted (${phases.length} phases)`, { migrationId });
    return { migrationId, removed: true, summary: `Migration "${migration.label}" deleted` };
  }

  migrationDashboard(tenantId: string) {
    const migrations = DataStore.mem().find("n0va1o_migrations", (m: any) => m.tenantId === tenantId);
    const phases = DataStore.mem().find("n0va1o_migration_phases", (p: any) => p.tenantId === tenantId);
    const recent = DataStore.mem().find("n0va1o_migration_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
    return {
      counts: {
        total: migrations.length,
        inProgress: migrations.filter((m: any) => m.status === "in_progress").length,
        completed: migrations.filter((m: any) => m.status === "completed").length,
        phasesTotal: phases.length,
        phasesDone: phases.filter((p: any) => p.status === "done").length,
      },
      bySource: MIGRATION_TARGETS.map((t) => ({ source: t.id, count: migrations.filter((m: any) => m.source === t.id).length })),
      recent,
      generatedAt: new Date().toISOString(),
    };
  }

  migrationLog(tenantId: string, limit = 50) {
    const entries = DataStore.mem().find("n0va1o_migration_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    return { entries, total: entries.length };
  }

  private progressPct(phases: any[]): number {
    if (!phases.length) return 0;
    const sum = phases.reduce((acc: number, p: any) => acc + (p.status === "done" ? 100 : p.transferPct || 0), 0);
    return Math.round(sum / phases.length);
  }

  private migrationPublic(m: any) {
    return { migrationId: m._id, source: m.source, sourceName: m.sourceName, label: m.label, status: m.status, transferSizeEstimateMB: m.transferSizeEstimateMB, durationEstimateMin: m.durationEstimateMin, createdAt: m.createdAt, completedAt: m.completedAt };
  }

  private phasePublic(p: any) {
    return { phaseId: p.phaseId, name: p.name, order: p.order, dependsOn: p.dependsOn, status: p.status, transferPct: p.transferPct, itemsImported: p.itemsImported, startedAt: p.startedAt, completedAt: p.completedAt };
  }
}

export const n0va1oMigration = new N0VA1OMigrationService();
