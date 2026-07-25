import { useState, useEffect, useMemo } from "react";
import { Send, Plus, X, Edit3, Trash2, Copy, Search, Calendar, Clock, Globe, Image, Smartphone, Monitor, Hash, CheckCircle, AlertCircle, BarChart3, TrendingUp, Filter, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "../components/Toast";
import { useEntityData } from "../hooks/useEntityData";

type SocialPlatform = "facebook" | "instagram" | "linkedin" | "twitter" | "tiktok" | "youtube";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

interface SocialPost {
  id: string;
  content: string;
  platforms: SocialPlatform[];
  scheduledDate: string;
  status: PostStatus;
  mediaUrls: string[];
  link: string;
  campaignName: string;
  createdAt: string;
  publishedAt?: string;
  engagement: { likes: number; comments: number; shares: number };
}

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  facebook: { label: "Facebook", icon: Globe, color: "bg-blue-600" },
  instagram: { label: "Instagram", icon: Smartphone, color: "bg-pink-600" },
  linkedin: { label: "LinkedIn", icon: Globe, color: "bg-blue-700" },
  twitter: { label: "Twitter/X", icon: Globe, color: "bg-sky-500" },
  tiktok: { label: "TikTok", icon: Smartphone, color: "bg-rose-500" },
  youtube: { label: "YouTube", icon: Monitor, color: "bg-red-600" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-700 text-gray-400" },
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-400" },
  published: { label: "Published", color: "bg-green-500/20 text-green-400" },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400" },
};

const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "linkedin", "twitter", "tiktok", "youtube"];

const COLORS = ["#8b5cf6", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899"];

export default function SocialPublisher() {
  const { addToast } = useToast();
  const { data: posts, loading, create, update, remove, replaceAll } = useEntityData<SocialPost>("social_posts");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "all">("all");
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "analytics">("list");
  const [form, setForm] = useState<{ content: string; platforms: SocialPlatform[]; scheduledDate: string; link: string; campaignName: string; mediaUrls: string[]; status: PostStatus }>({ content: "", platforms: [], scheduledDate: "", link: "", campaignName: "", mediaUrls: [], status: "draft" });
  const [calendarWeek, setCalendarWeek] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return start;
  });

  function resetForm(p?: SocialPost) {
    if (p) setForm({ content: p.content, platforms: [...p.platforms], scheduledDate: p.scheduledDate, link: p.link, campaignName: p.campaignName, mediaUrls: [...p.mediaUrls], status: p.status });
    else setForm({ content: "", platforms: [], scheduledDate: "", link: "", campaignName: "", mediaUrls: [], status: "draft" });
  }

  function togglePlatform(pl: SocialPlatform) {
    setForm(f => ({ ...f, platforms: f.platforms.includes(pl) ? f.platforms.filter(p => p !== pl) : [...f.platforms, pl] }));
  }

  function handleSave() {
    if (!form.content.trim()) { addToast("error", "Post content is required"); return; }
    if (form.platforms.length === 0) { addToast("error", "Select at least one platform"); return; }
    const now = new Date().toISOString();
    const post: SocialPost = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content: form.content.trim(), platforms: form.platforms, scheduledDate: form.scheduledDate,
      status: form.status, mediaUrls: form.mediaUrls.filter(u => u.trim()), link: form.link.trim(),
      campaignName: form.campaignName.trim(), createdAt: editingId ? posts.find(p => p.id === editingId)!.createdAt : now,
      engagement: editingId ? posts.find(p => p.id === editingId)!.engagement : { likes: 0, comments: 0, shares: 0 },
    };
    if (editingId) { update(editingId, post); addToast("success", "Post updated"); }
    else { create(post); addToast("success", "Post created"); }
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    remove(id);
    addToast("success", "Post deleted");
  }

  function publishNow(id: string) {
    replaceAll(posts.map(p => p.id === id ? { ...p, status: "published" as PostStatus, publishedAt: new Date().toISOString(), engagement: { likes: Math.floor(Math.random() * 100), comments: Math.floor(Math.random() * 20), shares: Math.floor(Math.random() * 10) } } : p));
    addToast("success", "Post published!");
  }

  const filtered = posts.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterPlatform !== "all" && !p.platforms.includes(filterPlatform)) return false;
    if (search && !p.content.toLowerCase().includes(search.toLowerCase()) && !p.campaignName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const analytics = useMemo(() => {
    const published = posts.filter(p => p.status === "published");
    const totalEngagement = published.reduce((s, p) => s + p.engagement.likes + p.engagement.comments + p.engagement.shares, 0);
    const byPlatform: Record<string, { posts: number; engagement: number }> = {};
    published.forEach(p => {
      p.platforms.forEach(pl => {
        if (!byPlatform[pl]) byPlatform[pl] = { posts: 0, engagement: 0 };
        byPlatform[pl].posts++;
        byPlatform[pl].engagement += p.engagement.likes + p.engagement.comments + p.engagement.shares;
      });
    });
    return { published: published.length, totalEngagement, byPlatform, scheduled: posts.filter(p => p.status === "scheduled").length };
  }, [posts]);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calendarWeek);
      d.setDate(d.getDate() + i);
      const dayPosts = posts.filter(p => {
        if (p.status !== "scheduled") return false;
        const pd = new Date(p.scheduledDate);
        return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      });
      days.push({ date: d, posts: dayPosts });
    }
    return days;
  }, [posts, calendarWeek]);

  const scheduledCount = posts.filter(p => p.status === "scheduled").length;
  const draftCount = posts.filter(p => p.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Send className="w-6 h-6 text-n0va-400" /> Social Publisher</h1>
          <p className="text-gray-400 mt-1">{posts.length} posts · {scheduledCount} scheduled · {draftCount} drafts · {analytics.published} published</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "list" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("list")}>Posts</button>
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "calendar" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("calendar")}>Schedule</button>
            <button className={`px-3 py-1.5 text-xs rounded-md ${viewMode === "analytics" ? "bg-n0va-600/20 text-n0va-400" : "text-gray-500"}`} onClick={() => setViewMode("analytics")}>Analytics</button>
          </div>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Post</button>
        </div>
      </div>

      {viewMode !== "analytics" && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input py-2 text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as PostStatus | "all")}>
            <option value="all">All Status</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
          <select className="input py-2 text-sm w-auto" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as SocialPlatform | "all")}>
            <option value="all">All Platforms</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_META[p].label}</option>)}
          </select>
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { const d = new Date(calendarWeek); d.setDate(d.getDate() - 7); setCalendarWeek(d); }} className="btn-secondary p-1.5"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-white">
              {calendarDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {calendarDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button onClick={() => { const d = new Date(calendarWeek); d.setDate(d.getDate() + 7); setCalendarWeek(d); }} className="btn-secondary p-1.5"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, posts: dayPosts }) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={date.toISOString()} className={`min-h-[120px] rounded-lg border p-2 ${isToday ? "border-n0va-600/40 bg-n0va-600/5" : "border-gray-800"}`}>
                  <p className={`text-xs font-medium text-center mb-2 ${isToday ? "text-n0va-400" : "text-gray-500"}`}>{date.getDate()}</p>
                  {dayPosts.length === 0 && <p className="text-[10px] text-gray-700 text-center">—</p>}
                  {dayPosts.map(p => (
                    <div key={p.id} className="text-[10px] px-1.5 py-1 rounded bg-gray-800/70 mb-1 truncate" title={p.content}>
                      <span className="text-gray-400">{p.platforms.slice(0, 2).map(pl => PLATFORM_META[pl].label.slice(0, 4)).join("/")}</span>
                      <p className="text-gray-500 truncate">{p.content.slice(0, 30)}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-2xl font-bold text-white">{analytics.published}</p><p className="text-xs text-gray-500">Published</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-n0va-400">{analytics.scheduled}</p><p className="text-xs text-gray-500">Scheduled</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-green-400">{analytics.totalEngagement.toLocaleString()}</p><p className="text-xs text-gray-500">Total Engagement</p></div>
            <div className="card p-4"><p className="text-2xl font-bold text-yellow-400">{posts.length > 0 ? Math.round(analytics.published / posts.length * 100) : 0}%</p><p className="text-xs text-gray-500">Pub. Rate</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Posts by Platform</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={Object.entries(analytics.byPlatform).map(([pl, d]) => ({ name: PLATFORM_META[pl]?.label || pl, value: d.posts }))} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {Object.keys(analytics.byPlatform).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Engagement by Platform</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(analytics.byPlatform).map(([pl, d]) => ({ name: PLATFORM_META[pl]?.label || pl, engagement: d.engagement }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} />
                    <Bar dataKey="engagement" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Post" : "New Social Post"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div><label className="label">Content</label><textarea className="input" rows={4} placeholder="What do you want to share?" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} autoFocus /><p className="text-[10px] text-gray-600 mt-1 text-right">{form.content.length} chars</p></div>
              <div><label className="label">Platforms</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map(pl => {
                    const pm = PLATFORM_META[pl];
                    return <button key={pl} type="button" onClick={() => togglePlatform(pl)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors ${form.platforms.includes(pl) ? `${pm.color} text-white border-transparent` : "border-gray-700 bg-gray-800 text-gray-400"}`}><pm.icon className="w-3 h-3" />{pm.label}</button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Schedule Date</label><input className="input" type="datetime-local" value={form.scheduledDate ? form.scheduledDate.slice(0, 16) : ""} onChange={e => setForm({ ...form, scheduledDate: new Date(e.target.value).toISOString() })} /></div>
                <div><label className="label">Status</label>
                  <div className="flex gap-1.5">
                    {(["draft", "scheduled", "published"] as PostStatus[]).map(s => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} className={`text-xs px-2 py-1 rounded border ${form.status === s ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>{STATUS_META[s].label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign name" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              <div><label className="label">Link</label><input className="input" placeholder="https://example.com/page" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} /></div>
              <div><label className="label">Media URLs (one per line)</label><textarea className="input" rows={2} placeholder="https://images.unsplash.com/..." value={form.mediaUrls.join("\n")} onChange={e => setForm({ ...form, mediaUrls: e.target.value.split("\n").filter(u => u.trim()) })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Post"}</button></div>
            </form>
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <>
          {filtered.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Send className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No posts found</h3>
              <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Create and schedule social media posts."}</p>
              {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Post</button>}
            </div>
          )}
          {filtered.map(p => {
            const sm = STATUS_META[p.status];
            const isUpcoming = p.status === "scheduled" && new Date(p.scheduledDate) > new Date();
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>
                      {p.platforms.map(pl => {
                        const pm = PLATFORM_META[pl];
                        return <span key={pl} className={`text-[10px] px-1.5 py-0.5 rounded text-white ${pm.color}`}>{pm.label}</span>;
                      })}
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{p.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600 flex-wrap">
                      {p.campaignName && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{p.campaignName}</span>}
                      {isUpcoming && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.scheduledDate).toLocaleDateString()} {new Date(p.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {p.status === "published" && p.publishedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Published {new Date(p.publishedAt).toLocaleDateString()}</span>}
                      {p.status === "published" && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{p.engagement.likes} likes · {p.engagement.comments} comments · {p.engagement.shares} shares</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {p.status === "draft" && <button onClick={() => publishNow(p.id)} className="p-1.5 text-gray-600 hover:text-green-400" title="Publish now"><Send className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => { resetForm(p); setEditingId(p.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
