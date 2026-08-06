import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, LayoutGrid, CheckCircle2, Clock3, ArrowRight, Rocket,
} from "lucide-react";
import { MODULES, MODULE_CATEGORIES, moduleById } from "../data/modules";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function WorkspaceHome() {
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const live = MODULES.filter((m) => m.status === "live").length;
    const planned = MODULES.length - live;
    return { total: MODULES.length, live, planned };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MODULES;
    return MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.category.toLowerCase().includes(s) ||
        m.tagline.toLowerCase().includes(s) ||
        m.features.some((f) => f.toLowerCase().includes(s))
    );
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof MODULES> = {};
    for (const cat of MODULE_CATEGORIES) {
      g[cat] = filtered.filter((m) => m.category === cat);
    }
    return g;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-n0va-900/60 via-gray-900 to-gray-950 border border-gray-800 p-6 md:p-8">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-n0va-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-n0va-400">N0VA Enterprise System</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">One system. Every module. Built in-house.</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          N0VA is a single modular enterprise suite â€” AI, communication, content, business and
          security come together with shared data, identity and governance. Three modules are live
          today; the rest are queued for execution.
        </p>
        <div className="relative mt-5 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules, categories, features..."
            className="w-full bg-gray-900/80 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-n0va-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total modules" value={counts.total} accent="text-white" />
        <StatCard label="Live & operating" value={counts.live} accent="text-n0va-400" />
        <StatCard label="Planned" value={counts.planned} accent="text-gray-400" />
        <StatCard label="One system" value="In-house" accent="text-n0va-400" />
      </div>

      {Object.entries(grouped).map(([cat, mods]) =>
        mods.length === 0 ? null : (
          <section key={cat}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-gray-600" />
              {cat}
              <span className="text-gray-600 text-xs font-normal">{mods.length}</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {mods.map((m) => {
                const Icon = m.icon;
                const planned = m.status === "planned";
                return (
                  <Link
                    key={m.id}
                    to={planned ? `/workspace/module/${m.id}` : (m.path || `/workspace/module/${m.id}`)}
                    className="group rounded-xl bg-gray-900/80 border border-gray-800 hover:border-n0va-500/50 p-4 flex flex-col gap-3 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-n0va-900/60 border border-n0va-700/40 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-n0va-400" />
                      </div>
                      {planned ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                          <Clock3 className="w-3 h-3" /> Planned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-n0va-400">
                          <CheckCircle2 className="w-3 h-3" /> Live
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.tagline}</p>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{m.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )
      )}
    </div>
  );
}