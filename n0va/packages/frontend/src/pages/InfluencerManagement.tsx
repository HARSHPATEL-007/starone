import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Users, Star, Plus, X, Filter, ChevronDown, ChevronUp, Globe, Camera, Twitter, Linkedin, Youtube, Music } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: Camera, color: "text-pink-400" },
  { key: "tiktok", label: "TikTok", icon: Music, color: "text-cyan-400" },
  { key: "youtube", label: "YouTube", icon: Youtube, color: "text-red-400" },
  { key: "twitter", label: "Twitter", icon: Twitter, color: "text-blue-400" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-500" },
];

const CATEGORIES = [
  "Fashion", "Beauty", "Tech", "Gaming", "Fitness", "Travel",
  "Food", "Music", "Lifestyle", "Education", "Finance", "Sports",
];

const STATUSES = ["proposed", "accepted", "delivered", "approved", "paid"] as const;
type CampaignStatus = typeof STATUSES[number];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  proposed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  delivered: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  approved: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  paid: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
      ))}
    </div>
  );
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-n0va-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm ${className}`}>
      {initials}
    </div>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = PLATFORMS.find((pl) => pl.key === platform.toLowerCase());
  if (!p) return <Globe className="w-4 h-4 text-gray-500" />;
  const Icon = p.icon;
  return <Icon className={`w-4 h-4 ${p.color}`} />;
}

export default function InfluencerManagement() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<"discover" | "campaigns">("discover");

  // Discover state
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minFollowers, setMinFollowers] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Campaign assignment state
  const [campaignAssignments, setCampaignAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Campaigns for dropdown
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Add-to-campaign modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInfluencer, setAddInfluencer] = useState<any>(null);
  const [addForm, setAddForm] = useState({ campaignId: "", deliverables: "", compensation: "" });
  const [adding, setAdding] = useState(false);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusItem, setStatusItem] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({ status: "proposed" as CampaignStatus, performance: "" });
  const [updating, setUpdating] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (platformFilter) params.set("platform", platformFilter);
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    if (minFollowers > 0) params.set("minFollowers", String(minFollowers));
    if (maxPrice > 0) params.set("maxPrice", String(maxPrice));
    if (searchQuery) params.set("search", searchQuery);
    return params.toString();
  }, [platformFilter, selectedCategories, minFollowers, maxPrice, searchQuery]);

  const loadInfluencers = useCallback(async () => {
    setLoadingInfluencers(true);
    try {
      const res = await api.influencers.search(buildSearchParams());
      setInfluencers(res || []);
    } catch (e: any) {
      addToast("error", "Failed to search influencers", e.message);
    } finally {
      setLoadingInfluencers(false);
    }
  }, [buildSearchParams, addToast]);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await api.campaigns.list();
      setCampaigns(res.campaigns || res || []);
    } catch {}
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const res = await api.influencers.listCampaign();
      setCampaignAssignments(res || []);
    } catch {
      addToast("error", "Failed to load campaign influencers");
    } finally {
      setLoadingAssignments(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (tab === "discover") {
      loadInfluencers();
    } else {
      loadAssignments();
    }
  }, [tab, loadInfluencers, loadAssignments]);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function openAddModal(influencer: any) {
    setAddInfluencer(influencer);
    setAddForm({ campaignId: "", deliverables: "", compensation: "" });
    setShowAddModal(true);
  }

  async function handleAddToCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!addInfluencer || !addForm.campaignId) return;
    setAdding(true);
    try {
      await api.influencers.addToCampaign({
        campaignId: addForm.campaignId,
        influencerId: addInfluencer._id || addInfluencer.id,
        influencerName: addInfluencer.name,
        influencerHandle: addInfluencer.handle,
        platform: addInfluencer.platform,
        deliverables: addForm.deliverables,
        compensation: parseFloat(addForm.compensation) || 0,
      });
      addToast("success", "Influencer added to campaign");
      setShowAddModal(false);
      setAddInfluencer(null);
    } catch {
      addToast("error", "Failed to add influencer to campaign");
    } finally {
      setAdding(false);
    }
  }

  function openStatusModal(item: any) {
    setStatusItem(item);
    setStatusForm({ status: item.status || "proposed", performance: item.performance || "" });
    setShowStatusModal(true);
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!statusItem) return;
    setUpdating(true);
    try {
      const data: Record<string, unknown> = { status: statusForm.status };
      if (statusForm.performance) data.performance = statusForm.performance;
      const id = statusItem._id || statusItem.id;
      await api.influencers.updateStatus(id, data);
      addToast("success", `Status updated to ${statusForm.status}`);
      setShowStatusModal(false);
      setStatusItem(null);
      await loadAssignments();
    } catch {
      addToast("error", "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  const totalAssignments = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => { counts[s] = 0; });
    campaignAssignments.forEach((a: any) => {
      const st = a.status || "proposed";
      if (counts[st] !== undefined) counts[st]++;
    });
    return counts;
  }, [campaignAssignments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Influencer Management</h1>
          <p className="text-gray-500 mt-1">Discover influencers and manage campaign assignments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "discover"
              ? "text-n0va-400 border-n0va-400"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
          onClick={() => setTab("discover")}
        >
          <Users className="w-4 h-4 inline mr-1.5" />Discover
        </button>
        <button
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "campaigns"
              ? "text-n0va-400 border-n0va-400"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
          onClick={() => setTab("campaigns")}
        >
          <Star className="w-4 h-4 inline mr-1.5" />My Campaign Influencers
          {campaignAssignments.length > 0 && (
            <span className="ml-2 text-xs bg-n0va-600/20 text-n0va-400 px-1.5 py-0.5 rounded-full">
              {campaignAssignments.length}
            </span>
          )}
        </button>
      </div>

      {tab === "discover" ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                className="input pl-10"
                placeholder="Search influencers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadInfluencers()}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  onClick={() => { setSearchQuery(""); }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              className={`btn-secondary text-xs flex items-center gap-1.5 ${showFilters ? "border-n0va-600/40" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button className="btn-primary text-xs" onClick={loadInfluencers}>
              <Search className="w-3.5 h-3.5 mr-1" /> Search
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="card space-y-4">
              {/* Platform filter */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Platform</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      !platformFilter
                        ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/40"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                    onClick={() => setPlatformFilter("")}
                  >
                    All
                  </button>
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.key}
                        className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                          platformFilter === p.key
                            ? "bg-n0va-600/20 text-n0va-400 border-n0va-600/40"
                            : "border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                        onClick={() => setPlatformFilter(platformFilter === p.key ? "" : p.key)}
                      >
                        <Icon className={`w-3.5 h-3.5 ${p.color}`} /> {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selectedCategories.includes(cat)
                          ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                          : "border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Min Followers: {minFollowers >= 1_000_000 ? `${minFollowers / 1_000_000}M` : minFollowers >= 1_000 ? `${minFollowers / 1_000}K` : minFollowers}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10_000_000}
                    step={100_000}
                    value={minFollowers}
                    onChange={(e) => setMinFollowers(parseInt(e.target.value))}
                    className="w-full accent-n0va-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>0</span>
                    <span>10M</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Max Price: {maxPrice > 0 ? `$${maxPrice.toLocaleString()}` : "No limit"}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50_000}
                    step={500}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-n0va-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>$0</span>
                    <span>$50K</span>
                  </div>
                </div>
              </div>

              {(platformFilter || selectedCategories.length > 0 || minFollowers > 0 || maxPrice > 0) && (
                <button
                  className="text-xs text-gray-500 hover:text-white"
                  onClick={() => { setPlatformFilter(""); setSelectedCategories([]); setMinFollowers(0); setMaxPrice(0); }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Influencer Grid */}
          {loadingInfluencers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : influencers.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {platformFilter || selectedCategories.length > 0 || minFollowers > 0 || maxPrice > 0 || searchQuery
                  ? "No influencers match your filters."
                  : "No influencers found. Try searching."}
              </p>
              {(platformFilter || selectedCategories.length > 0 || minFollowers > 0 || maxPrice > 0 || searchQuery) && (
                <button
                  className="btn-secondary text-sm mt-3"
                  onClick={() => { setPlatformFilter(""); setSelectedCategories([]); setMinFollowers(0); setMaxPrice(0); setSearchQuery(""); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {influencers.map((inf) => (
                <div key={inf._id || inf.id} className="card flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={inf.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-semibold truncate">{inf.name}</h3>
                        <PlatformIcon platform={inf.platform} />
                      </div>
                      <p className="text-xs text-gray-500">@{inf.handle}</p>
                      <StarRating rating={inf.rating || Math.floor(Math.random() * 3) + 3} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-white font-bold">{formatFollowers(inf.followers || inf.followerCount || 0)}</p>
                      <p className="text-[10px] text-gray-500">Followers</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-white font-bold">{(inf.engagementRate || inf.engagement || 0).toFixed(1)}%</p>
                      <p className="text-[10px] text-gray-500">Engagement</p>
                    </div>
                  </div>

                  {(inf.priceMin || inf.priceMax || inf.priceRange) && (
                    <div className="text-xs text-gray-400 mb-2">
                      <span className="text-gray-500">Price: </span>
                      <span className="text-white font-medium">
                        ${(inf.priceMin || 0).toLocaleString()} – ${(inf.priceMax || (inf.priceRange?.max ?? 0)).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {inf.categories && inf.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {inf.categories.slice(0, 3).map((cat: string) => (
                        <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          {cat}
                        </span>
                      ))}
                      {inf.categories.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                          +{inf.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-t border-gray-800">
                    <button
                      className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
                      onClick={() => openAddModal(inf)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Campaign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* My Campaign Influencers */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {STATUSES.map((s) => (
              <div key={s} className="card p-3 text-center">
                <p className={`text-lg font-bold ${STATUS_COLORS[s].split(" ")[1]}`}>{totalAssignments[s] || 0}</p>
                <p className="text-[10px] text-gray-500 capitalize">{s}</p>
              </div>
            ))}
          </div>

          {loadingAssignments ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 w-48 bg-gray-800 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          ) : campaignAssignments.length === 0 ? (
            <div className="card text-center py-12">
              <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No influencers added to campaigns yet.</p>
              <p className="text-xs text-gray-600 mt-1">Discover influencers and add them to a campaign.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                    <th className="text-left px-3 py-3 font-medium">Influencer</th>
                    <th className="text-left px-3 py-3 font-medium">Campaign</th>
                    <th className="text-left px-3 py-3 font-medium">Platform</th>
                    <th className="text-left px-3 py-3 font-medium">Deliverables</th>
                    <th className="text-right px-3 py-3 font-medium">Compensation</th>
                    <th className="text-center px-3 py-3 font-medium">Status</th>
                    <th className="text-center px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignAssignments.map((item: any) => {
                    const id = item._id || item.id;
                    const st: CampaignStatus = STATUSES.includes(item.status) ? item.status : "proposed";
                    return (
                      <tr key={id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={item.influencerName || item.name} className="w-8 h-8 text-xs" />
                            <div>
                              <p className="text-white text-sm font-medium">{item.influencerName || item.name}</p>
                              {item.influencerHandle && (
                                <p className="text-xs text-gray-500">@{item.influencerHandle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-gray-300">{item.campaignName || item.campaignId || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <PlatformIcon platform={item.platform} />
                            <span className="text-gray-400 text-xs capitalize">{item.platform}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-gray-400 text-xs max-w-[160px] inline-block truncate">
                            {item.deliverables || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-white font-medium">
                            {item.compensation ? `$${(item.compensation).toLocaleString()}` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_COLORS[st]}`}
                          >
                            {st}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            className="btn-secondary text-[10px] py-1 px-2"
                            onClick={() => openStatusModal(item)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {campaignAssignments.length > 0 && (
            <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
              <span>{campaignAssignments.length} total assignment{campaignAssignments.length !== 1 ? "s" : ""}</span>
              <button className="hover:text-white" onClick={loadAssignments}>
                Refresh
              </button>
            </div>
          )}
        </>
      )}

      {/* Add to Campaign Modal */}
      {showAddModal && addInfluencer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="card w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add to Campaign</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
              <Avatar name={addInfluencer.name} />
              <div>
                <p className="text-white font-medium">{addInfluencer.name}</p>
                <p className="text-xs text-gray-500">@{addInfluencer.handle} · {formatFollowers(addInfluencer.followers || addInfluencer.followerCount || 0)} followers</p>
              </div>
            </div>

            <form onSubmit={handleAddToCampaign} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Campaign</label>
                <select
                  className="select"
                  value={addForm.campaignId}
                  onChange={(e) => setAddForm({ ...addForm, campaignId: e.target.value })}
                  required
                >
                  <option value="">Select a campaign...</option>
                  {campaigns.map((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deliverables</label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={addForm.deliverables}
                  onChange={(e) => setAddForm({ ...addForm, deliverables: e.target.value })}
                  placeholder="e.g., 2 Instagram posts + 1 Story"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compensation ($)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={addForm.compensation}
                  onChange={(e) => setAddForm({ ...addForm, compensation: e.target.value })}
                  placeholder="e.g., 500"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={adding}>
                  {adding && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  {adding ? "Adding..." : "Add to Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && statusItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowStatusModal(false)}>
          <div className="card w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Update Status</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setShowStatusModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-white font-medium">{statusItem.influencerName || statusItem.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {statusItem.campaignName || statusItem.campaignId}
                {statusItem.compensation ? ` · $${statusItem.compensation.toLocaleString()}` : ""}
              </p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <div className="grid grid-cols-5 gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`text-[10px] px-1 py-2 rounded border capitalize font-medium transition-colors ${
                        statusForm.status === s
                          ? `${STATUS_COLORS[s]} border-current`
                          : "border-gray-700 text-gray-500 hover:border-gray-600"
                      }`}
                      onClick={() => setStatusForm({ ...statusForm, status: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Performance Notes (optional)</label>
                <textarea
                  className="input min-h-[60px] resize-y"
                  value={statusForm.performance}
                  onChange={(e) => setStatusForm({ ...statusForm, performance: e.target.value })}
                  placeholder="e.g., Strong engagement, exceeded expectations"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={updating}>
                  {updating && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
