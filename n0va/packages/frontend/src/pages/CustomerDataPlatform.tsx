import { useState, useEffect } from "react";
import { Users, Activity, BarChart3, UserCheck, Tag, Search, ChevronDown, ChevronRight, Clock, Database, Layers, RefreshCw } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

type Tab = "profiles" | "events" | "segments";

interface CDPStats {
  totalProfiles: number;
  activeProfiles: number;
  totalEvents: number;
  totalSegments: number;
  avgLifetimeValue: number;
  topTraits: { trait: string; count: number }[];
}

interface CDPProfile {
  _id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "churned";
  traits: Record<string, any>;
  tags: string[];
  lifetimeValue: number;
  createdAt: string;
  updatedAt: string;
}

interface CDPEvent {
  _id: string;
  profileId: string;
  type: string;
  data: Record<string, any>;
  timestamp: string;
}

interface CDPEventTypeStat {
  type: string;
  count: number;
  lastOccurrence: string;
}

interface CDPSegment {
  _id: string;
  name: string;
  description: string;
  rules: Record<string, any>[];
  profileCount: number;
  status: "active" | "inactive" | "draft";
  createdAt: string;
  updatedAt: string;
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  inactive: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  churned: "bg-red-500/10 text-red-400 border-red-500/30",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export default function CustomerDataPlatform() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("profiles");
  const [stats, setStats] = useState<CDPStats | null>(null);
  const [profiles, setProfiles] = useState<CDPProfile[]>([]);
  const [events, setEvents] = useState<CDPEvent[]>([]);
  const [eventTypeStats, setEventTypeStats] = useState<CDPEventTypeStat[]>([]);
  const [segments, setSegments] = useState<CDPSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSearch, setProfileSearch] = useState("");
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<CDPProfile | null>(null);
  const [profileEvents, setProfileEvents] = useState<CDPEvent[]>([]);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, p, e, et, seg] = await Promise.all([
        api.cdp.stats(),
        api.cdp.profiles(),
        api.cdp.events(),
        api.cdp.eventTypeStats(),
        api.cdp.segments(),
      ]);
      setStats(s);
      setProfiles(p);
      setEvents(e);
      setEventTypeStats(et);
      setSegments(seg);
    } catch (err: any) {
      addToast("error", "Failed to load CDP data", err.message);
    }
    setLoading(false);
  }

  async function loadProfiles(search?: string, segment?: string) {
    try {
      const p = await api.cdp.profiles(search || undefined, segment || undefined);
      setProfiles(p);
    } catch (err: any) {
      addToast("error", "Failed to load profiles", err.message);
    }
  }

  async function handleProfileSearch(val: string) {
    setProfileSearch(val);
    loadProfiles(val || undefined, selectedSegmentFilter || undefined);
  }

  async function handleSegmentFilter(val: string) {
    setSelectedSegmentFilter(val);
    loadProfiles(profileSearch || undefined, val || undefined);
  }

  async function toggleProfileDetail(id: string) {
    if (expandedProfile === id) {
      setExpandedProfile(null);
      setProfileDetail(null);
      setProfileEvents([]);
      return;
    }
    setExpandedProfile(id);
    setProfileDetailLoading(true);
    try {
      const [detail, evts] = await Promise.all([
        api.cdp.getProfile(id),
        api.cdp.events(id),
      ]);
      setProfileDetail(detail);
      setProfileEvents(evts);
    } catch (err: any) {
      addToast("error", "Failed to load profile detail", err.message);
    }
    setProfileDetailLoading(false);
  }

  async function handleUpdateProfile(id: string, data: Record<string, unknown>) {
    try {
      await api.cdp.updateProfile(id, data);
      addToast("success", "Profile updated");
      const p = await api.cdp.profiles(profileSearch || undefined, selectedSegmentFilter || undefined);
      setProfiles(p);
    } catch (err: any) {
      addToast("error", "Failed to update profile", err.message);
    }
  }

  async function handleDeleteSegment(id: string) {
    const seg = segments.find(s => s._id === id);
    try {
      await api.cdp.deleteSegment(id);
      setSegments(prev => prev.filter(s => s._id !== id));
      addToast("success", `Segment "${seg?.name}" deleted`);
    } catch (err: any) {
      addToast("error", "Failed to delete segment", err.message);
    }
  }

  async function handleToggleSegmentStatus(id: string, current: string) {
    const newStatus = current === "active" ? "inactive" : "active";
    try {
      await api.cdp.updateSegment(id, { status: newStatus });
      setSegments(prev => prev.map(s => s._id === id ? { ...s, status: newStatus as CDPSegment["status"] } : s));
      addToast("success", `Segment ${newStatus}`);
    } catch (err: any) {
      addToast("error", "Failed to update segment", err.message);
    }
  }

  function getTraitKeys(profile: CDPProfile): string[] {
    if (!profile.traits) return [];
    return Object.keys(profile.traits).slice(0, 5);
  }

  const filteredEvents = events;

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-56 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-20 bg-gray-800 rounded mb-3" />
              <div className="h-7 w-24 bg-gray-800 rounded mb-1" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
        <div className="card animate-pulse p-6">
          <div className="h-5 w-32 bg-gray-800 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-6 h-6 text-n0va-400" />
            Customer Data Platform
          </h1>
          <p className="text-gray-400 mt-1">
            {stats ? `${fmt(stats.totalProfiles)} profiles · ${fmt(stats.totalEvents)} events · ${stats.totalSegments} segments` : "Loading..."}
          </p>
        </div>
        <button onClick={loadAll} className="btn-ghost text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Total Profiles
            </div>
            <p className="text-2xl font-bold text-white">{fmt(stats.totalProfiles)}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Active
            </div>
            <p className="text-2xl font-bold text-green-400">{fmt(stats.activeProfiles)}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Activity className="w-3.5 h-3.5" /> Events
            </div>
            <p className="text-2xl font-bold text-white">{fmt(stats.totalEvents)}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Layers className="w-3.5 h-3.5" /> Segments
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalSegments}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Avg LTV
            </div>
            <p className="text-2xl font-bold text-n0va-400">{fmtCurrency(stats.avgLifetimeValue)}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Tag className="w-3.5 h-3.5" /> Top Traits
            </div>
            <p className="text-2xl font-bold text-white">{stats.topTraits?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-800">
        {(["profiles", "events", "segments"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "text-n0va-400 border-n0va-400"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t === "profiles" && <Users className="w-4 h-4 inline mr-1.5" />}
            {t === "events" && <Activity className="w-4 h-4 inline mr-1.5" />}
            {t === "segments" && <Layers className="w-4 h-4 inline mr-1.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ============ PROFILES TAB ============ */}
      {tab === "profiles" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                className="input pl-10 pr-4 py-2 text-sm w-full"
                placeholder="Search profiles by name or email..."
                value={profileSearch}
                onChange={e => handleProfileSearch(e.target.value)}
              />
            </div>
            <select
              className="input py-2 text-sm w-auto"
              value={selectedSegmentFilter}
              onChange={e => handleSegmentFilter(e.target.value)}
            >
              <option value="">All Segments</option>
              {segments.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">{profiles.length} profile{profiles.length !== 1 ? "s" : ""}</span>
          </div>

          {profiles.length === 0 && !loading && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No profiles found</h3>
              <p className="text-sm text-gray-500">{profileSearch ? "Try different search terms" : "No customer profiles yet."}</p>
            </div>
          )}

          {profiles.map(profile => (
            <div key={profile._id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleProfileDetail(profile._id)}
                    className="p-1 mt-1 text-gray-600 hover:text-gray-300"
                  >
                    {expandedProfile === profile._id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="w-10 h-10 rounded-full bg-n0va-500/20 text-n0va-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {initials(profile.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{profile.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_COLORS[profile.status] || STATUS_COLORS.draft}`}>
                        {profile.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> {fmtCurrency(profile.lifetimeValue)}
                      </span>
                      {profile.tags && profile.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {profile.tags.length} tags
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" /> {getTraitKeys(profile).length} traits
                      </span>
                    </div>
                    {getTraitKeys(profile).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {getTraitKeys(profile).map(key => (
                          <span key={key} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                            {key}: {String(profile.traits[key]).length > 20 ? String(profile.traits[key]).slice(0, 20) + "..." : String(profile.traits[key])}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded profile detail */}
              {expandedProfile === profile._id && (
                <div className="border-t border-gray-800">
                  {profileDetailLoading ? (
                    <div className="p-6 space-y-3 animate-pulse">
                      <div className="h-4 w-32 bg-gray-800 rounded" />
                      <div className="h-20 bg-gray-800/50 rounded" />
                      <div className="h-4 w-32 bg-gray-800 rounded" />
                      <div className="h-20 bg-gray-800/50 rounded" />
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {/* Traits table */}
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-n0va-400" /> All Traits
                        </h4>
                        {profileDetail && profileDetail.traits && Object.keys(profileDetail.traits).length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 border-b border-gray-800">
                                  <th className="text-left py-2 pr-4">Trait</th>
                                  <th className="text-left py-2">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(profileDetail.traits).map(([key, value]) => (
                                  <tr key={key} className="border-b border-gray-800/50">
                                    <td className="py-2 pr-4 text-gray-400">{key}</td>
                                    <td className="py-2 text-white">{typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">No traits recorded.</p>
                        )}
                      </div>

                      {/* Recent events timeline */}
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-n0va-400" /> Recent Events
                        </h4>
                        {profileEvents.length > 0 ? (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {profileEvents.map(evt => (
                              <div key={evt._id} className="flex items-start gap-3 py-2 px-3 bg-gray-800/30 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-n0va-400 mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white">{evt.type}</p>
                                  {evt.data && Object.keys(evt.data).length > 0 && (
                                    <p className="text-xs text-gray-500 truncate">{JSON.stringify(evt.data)}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-600 shrink-0">{fmtDate(evt.timestamp)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">No events for this profile.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============ EVENTS TAB ============ */}
      {tab === "events" && (
        <div className="space-y-6">
          {/* Event type distribution */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-n0va-400" /> Event Type Distribution
            </h3>
            {eventTypeStats.length === 0 ? (
              <p className="text-sm text-gray-600">No event data available.</p>
            ) : (
              <div className="space-y-3">
                {eventTypeStats
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map(stat => {
                    const maxCount = Math.max(...eventTypeStats.map(s => s.count));
                    const pct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                    return (
                      <div key={stat.type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">{stat.type}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-white font-medium">{fmt(stat.count)}</span>
                            <span className="text-[10px] text-gray-600">{fmtDate(stat.lastOccurrence)}</span>
                          </div>
                        </div>
                        <div className="w-full h-5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-n0va-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Event timeline */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-n0va-400" /> Event Timeline
            </h3>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-gray-600">No events recorded.</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {filteredEvents.map(evt => (
                  <div key={evt._id} className="flex items-start gap-3 py-2 px-3 bg-gray-800/30 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-n0va-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white">{evt.type}</p>
                        <span className="text-[10px] text-gray-600">profile: {evt.profileId.slice(-6)}</span>
                      </div>
                      {evt.data && Object.keys(evt.data).length > 0 && (
                        <p className="text-xs text-gray-500 truncate">{JSON.stringify(evt.data)}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0">{fmtDate(evt.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ SEGMENTS TAB ============ */}
      {tab === "segments" && (
        <div className="space-y-4">
          {segments.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Layers className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No segments</h3>
              <p className="text-sm text-gray-500">Create segments to organize your audience.</p>
            </div>
          ) : (
            segments.map(seg => (
              <div key={seg._id} className="card">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold text-white">{seg.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_COLORS[seg.status] || STATUS_COLORS.draft}`}>
                          {seg.status}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {fmt(seg.profileCount)} profiles
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          seg.profileCount > 10000
                            ? "bg-green-500/10 text-green-400"
                            : seg.profileCount > 1000
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-500/10 text-gray-400"
                        }`}>
                          {seg.profileCount > 10000 ? "High" : seg.profileCount > 1000 ? "Medium" : "Low"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{seg.description}</p>
                      {seg.rules && seg.rules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {seg.rules.slice(0, 3).map((rule, i) => (
                            <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                              {typeof rule === "object" ? JSON.stringify(rule).length > 30 ? JSON.stringify(rule).slice(0, 30) + "..." : JSON.stringify(rule) : String(rule)}
                            </span>
                          ))}
                          {seg.rules.length > 3 && (
                            <span className="text-[10px] text-gray-600">+{seg.rules.length - 3} more</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>{seg.rules?.length || 0} rule{(seg.rules?.length || 0) !== 1 ? "s" : ""}</span>
                        <span>Created {fmtDate(seg.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleSegmentStatus(seg._id, seg.status)}
                        className={`p-1.5 text-gray-600 hover:text-n0va-400`}
                        title={seg.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSegment(seg._id)}
                        className="p-1.5 text-gray-600 hover:text-red-400"
                        title="Delete segment"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
