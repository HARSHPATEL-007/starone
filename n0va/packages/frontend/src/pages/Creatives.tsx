import { useEffect, useState } from "react";
import { Plus, Palette } from "lucide-react";
import { api } from "../api/client";

export default function Creatives() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "image", headline: "", body: "", cta: "" });

  useEffect(() => { loadCreatives(); }, []);

  async function loadCreatives() {
    setLoading(true);
    try { setCreatives(await api.creatives.list()); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.creatives.create(form);
    setShowCreate(false);
    setForm({ name: "", type: "image", headline: "", body: "", cta: "" });
    loadCreatives();
  }

  const typeColors: Record<string, string> = { image: "text-blue-400", video: "text-purple-400", carousel: "text-orange-400", text: "text-green-400" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creatives</h1>
          <p className="text-gray-500 mt-1">Manage your ad creatives and assets</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Creative
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Create Creative</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carousel</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Headline</label>
                <input className="input" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Body</label>
                <textarea className="input" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">CTA</label>
                <input className="input" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="e.g., Learn More" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-n0va-500 border-t-transparent rounded-full" /></div>
      ) : creatives.length === 0 ? (
        <div className="card text-center py-12">
          <Palette className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No creatives yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((c) => (
            <div key={c._id} className="card">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-medium uppercase ${typeColors[c.type] || ""}`}>{c.type}</span>
                <span className="badge-draft">{c.status}</span>
              </div>
              <h3 className="text-white font-semibold mb-1">{c.name}</h3>
              {c.headline && <p className="text-sm text-gray-400 mb-3">{c.headline}</p>}
              {c.cta && <span className="text-xs text-n0va-400">{c.cta}</span>}
              <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                <span>{c.performance?.impressions?.toLocaleString() || 0} impressions</span>
                <span>{c.performance?.ctr?.toFixed(2) || 0}% CTR</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
