import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Clock3, Rocket, Sparkles, Construction, ArrowRight,
} from "lucide-react";
import { MODULES, moduleById } from "../data/modules";

export default function ModuleStubPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [m] = useState(() => (id ? moduleById(id) : undefined));

  useEffect(() => {
    if (m?.status === "live" && m.path) {
      navigate(m.path, { replace: true });
    }
  }, [m, navigate]);

  if (!m) {
    return (
      <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6 text-center">
        <p className="text-gray-400 text-sm">Module not found.</p>
        <Link to="/workspace" className="inline-flex items-center gap-2 text-n0va-400 text-sm mt-2 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to workspace
        </Link>
      </div>
    );
  }

  const Icon = m.icon;
  const planned = m.status === "planned";

  return (
    <div className="space-y-6">
      <Link to="/workspace" className="inline-flex items-center gap-2 text-gray-400 text-sm hover:text-gray-200">
        <ArrowLeft className="w-4 h-4" /> Workspace
      </Link>

      <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6 md:p-8">
        <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
          <div className="w-14 h-14 rounded-xl bg-n0va-900/60 border border-n0va-700/40 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 text-n0va-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-white">{m.name}</h1>
              {planned ? (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  <Clock3 className="w-3 h-3" /> Planned
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-n0va-900/60 text-n0va-400 border border-n0va-700/40">
                  <CheckCircle2 className="w-3 h-3" /> Live
                </span>
              )}
            </div>
            <p className="text-sm text-n0va-400 mt-1">{m.tagline}</p>
            <p className="text-gray-400 text-sm mt-3 max-w-3xl leading-relaxed">{m.description}</p>
          </div>
        </div>
      </div>

      {planned ? (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl bg-gray-900/80 border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Construction className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Execution roadmap</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-n0va-500 mt-1" />
                  <div className="w-px flex-1 bg-gray-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Foundation</p>
                  <p className="text-xs text-gray-500">Data model, collections, singleton service + deterministic tests.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-n0va-500 mt-1" />
                  <div className="w-px flex-1 bg-gray-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Backend surface</p>
                  <p className="text-xs text-gray-500">Delegations, routes and client methods in the standard pattern.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-n0va-500 mt-1" />
                  <div className="w-px flex-1 bg-gray-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Live pages</p>
                  <p className="text-xs text-gray-500">Full page surfaces with one-click actions, mobile-first verification.</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="w-3.5 h-3.5 text-n0va-400" />
              This module joins the N0VA Enterprise System — shared identity, data and governance with every other module.
            </div>
          </div>
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="w-4 h-4 text-n0va-400" />
              <h2 className="text-sm font-semibold text-white">What it will do</h2>
            </div>
            <ul className="space-y-2.5">
              {m.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-n0va-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6">
          <p className="text-sm text-gray-300">
            {m.name} is live.{" "}
            <Link to={m.path || "/"} className="text-n0va-400 inline-flex items-center gap-1 hover:underline">
              Open module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">More modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULES.filter((x) => x.id !== m.id).slice(0, 8).map((x) => {
            const XIcon = x.icon;
            return (
              <Link
                key={x.id}
                to={x.status === "planned" ? `/workspace/module/${x.id}` : (x.path || `/workspace/module/${x.id}`)}
                className="rounded-xl bg-gray-900/80 border border-gray-800 hover:border-n0va-500/50 p-3 flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-n0va-900/60 border border-n0va-700/40 flex items-center justify-center shrink-0">
                  <XIcon className="w-4 h-4 text-n0va-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{x.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{x.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
