import React, { useState, useEffect, useMemo } from "react";
import { Shield, Building2, Users, DollarSign, BarChart3, Settings, CheckCircle, XCircle, Edit3, Save, Activity, Clock, Database, ChevronRight, ChevronDown, Search, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  users: number;
  storageUsed: number;
  apiCalls: number;
  monthlySpend: number;
  features: string[];
}

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
  annualRunRate: number;
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
  totalStorage: number;
  totalApiCalls: number;
}

interface AuditEntry {
  id: string;
  action: string;
  tenantId: string;
  tenantName: string;
  user: string;
  timestamp: string;
  details: string;
}

const PLANS = ["starter", "growth", "enterprise"];
const STATUSES = ["active", "suspended", "cancelled"];

const PLAN_COLORS: Record<string, string> = {
  starter: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  growth: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  enterprise: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400 bg-green-500/10 border-green-500/30",
  suspended: "text-red-400 bg-red-500/10 border-red-500/30",
  cancelled: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6"];

function fmtN(n: number): string {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function storageFmt(mb: number): string {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + " GB";
  return mb.toFixed(0) + " MB";
}

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [allFeatures, setAllFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, t, f, a] = await Promise.all([
        api.admin.stats(),
        api.admin.tenants(),
        api.admin.features(),
        api.admin.auditLog(50),
      ]);
      setStats(s);
      setTenants(t);
      setAllFeatures(f);
      setAuditLog(a);
    } catch {
      addToast("error", "Failed to load admin data");
    }
    setLoading(false);
  }

  async function handleSave(tenant: Tenant) {
    try {
      await api.admin.updateTenant(tenant.id, {
        plan: tenant.plan,
        status: tenant.status,
        features: tenant.features,
      });
      addToast("success", `Updated ${tenant.name}`);
      setEditingTenant(null);
      setExpandedTenant(null);
      loadAll();
    } catch {
      addToast("error", "Failed to update tenant");
    }
  }

  function toggleFeature(f: string) {
    if (!editingTenant) return;
    const next = editingTenant.features.includes(f)
      ? editingTenant.features.filter(x => x !== f)
      : [...editingTenant.features, f];
    setEditingTenant({ ...editingTenant, features: next });
  }

  const filteredTenants = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(t => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.plan.includes(q) || t.status.includes(q));
  }, [tenants, search]);

  const planData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byPlan).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [stats]);

  const statusData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-n0va-400" />
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Multi-tenant management · {stats?.totalTenants || 0} tenants</p>
        </div>
        <button onClick={loadAll} className="btn-ghost text-sm flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-n0va-400" />
            <p className="text-xs text-gray-500">Tenants</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.activeTenants || 0}<span className="text-sm text-gray-500 font-normal"> / {stats?.totalTenants || 0}</span></p>
          <p className="text-xs text-gray-500 mt-1">active / total</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-500">Total Users</p>
          </div>
          <p className="text-2xl font-bold text-white">{fmtN(stats?.totalUsers || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">across all tenants</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <p className="text-xs text-gray-500">Monthly Revenue</p>
          </div>
          <p className="text-2xl font-bold text-white">${fmtN(stats?.monthlyRevenue || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">MRR</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-gray-500">ARR</p>
          </div>
          <p className="text-2xl font-bold text-white">${fmtN(stats?.annualRunRate || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">annual run rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Plan Distribution</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {planData.map((_, i) => (
                    <Cell key={i} fill={["#6b7280", "#3b82f6", "#a855f7"][i] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No plan data</p>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-n0va-400" /> Status Breakdown</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-400">{s.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No status data</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-gray-500">{filteredTenants.length} tenants</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-3 font-medium">Name</th>
                <th className="text-left py-3 px-3 font-medium">Plan</th>
                <th className="text-left py-3 px-3 font-medium">Status</th>
                <th className="text-right py-3 px-3 font-medium">Users</th>
                <th className="text-right py-3 px-3 font-medium">Storage</th>
                <th className="text-right py-3 px-3 font-medium">API Calls</th>
                <th className="text-right py-3 px-3 font-medium">Monthly</th>
                <th className="text-center py-3 px-3 font-medium">Features</th>
                <th className="text-center py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(t => (
                <React.Fragment key={t.id}>
                  <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={() => setExpandedTenant(expandedTenant === t.id ? null : t.id)}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {expandedTenant === t.id ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                        <div>
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          <p className="text-[10px] text-gray-600">{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PLAN_COLORS[t.plan] || PLAN_COLORS.starter}`}>{t.plan}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[t.status] || STATUS_COLORS.cancelled}`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-white">{t.users}</td>
                    <td className="py-3 px-3 text-right text-sm text-white">{storageFmt(t.storageUsed)}</td>
                    <td className="py-3 px-3 text-right text-sm text-white">{fmtN(t.apiCalls)}</td>
                    <td className="py-3 px-3 text-right text-sm text-white">${t.monthlySpend.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-gray-400">{t.features.length}/{allFeatures.length}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button onClick={e => { e.stopPropagation(); setEditingTenant({ ...t }); setExpandedTenant(t.id); }} className="text-gray-500 hover:text-n0va-400 transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedTenant === t.id && editingTenant?.id === t.id && (
                    <tr>
                      <td colSpan={9} className="p-4 bg-gray-800/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Plan</label>
                            <select
                              value={editingTenant.plan}
                              onChange={e => setEditingTenant({ ...editingTenant, plan: e.target.value })}
                              className="input text-sm w-full"
                            >
                              {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Status</label>
                            <select
                              value={editingTenant.status}
                              onChange={e => setEditingTenant({ ...editingTenant, status: e.target.value })}
                              className="input text-sm w-full"
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <button onClick={() => handleSave(editingTenant)} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
                            <button onClick={() => { setEditingTenant(null); setExpandedTenant(null); }} className="btn-ghost text-sm">Cancel</button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="text-xs text-gray-500 block mb-2">Features</label>
                          <div className="flex flex-wrap gap-2">
                            {allFeatures.map(f => {
                              const enabled = editingTenant.features.includes(f);
                              return (
                                <button
                                  key={f}
                                  onClick={() => toggleFeature(f)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${enabled ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}
                                >
                                  {enabled ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                                  {f}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTenants.length === 0 && !loading && (
          <div className="py-12 text-center text-gray-500">No tenants found</div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-n0va-400" /> Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No audit entries yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3 font-medium">Action</th>
                  <th className="text-left py-2 px-3 font-medium">Tenant</th>
                  <th className="text-left py-2 px-3 font-medium">User</th>
                  <th className="text-left py-2 px-3 font-medium">Details</th>
                  <th className="text-right py-2 px-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a, i) => (
                  <tr key={a.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3">
                      <span className="text-xs text-white font-medium">{a.action}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400">{a.tenantName || a.tenantId}</td>
                    <td className="py-2 px-3 text-xs text-gray-400">{a.user}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-xs truncate">{a.details}</td>
                    <td className="py-2 px-3 text-right text-xs text-gray-500">{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


