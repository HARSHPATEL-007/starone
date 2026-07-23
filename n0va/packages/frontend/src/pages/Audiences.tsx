import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { api } from "../api/client";

export default function Audiences() {
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "custom", platform: "meta", criteria: "" });

  useEffect(() => { loadAudiences(); }, []);

  async function loadAudiences() {
    setLoading(true);
    try { setAudiences(await api.audiences.list()); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.audiences.create({
      ...form,
      criteria: form.criteria ? JSON.parse(form.criteria) : {},
    });
    setShowCreate(false);
    setForm({ name: "", description: "", type: "custom", platform: "meta", criteria: "" });
    loadAudiences();
  }

  const typeColors: Record<string, string> = { lookalike: "text-purple-400", retargeting: "text-blue-400", custom: "text-green-400", saved: "text-gray-400" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audiences</h1>
          <p className="text-gray-500 mt-1">Manage audience segments for targeting</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Audience
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Create Audience</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="custom">Custom</option>
                    <option value="lookalike">Lookalike</option>
                    <option value="retargeting">Retargeting</option>
                    <option value="saved">Saved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Platform</label>
                  <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    <option value="meta">Meta</option>
                    <option value="google">Google</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Criteria (JSON)</label>
                <textarea className="input font-mono text-xs" rows={4} value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder='{"age_range": "25-45", "interests": ["saas", "enterprise"]}' />
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
      ) : audiences.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No audience segments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiences.map((a) => (
            <div key={a._id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-semibold">{a.name}</span>
                    <span className={`text-xs font-medium ${typeColors[a.type] || ""}`}>{a.type}</span>
                    <span className="text-xs text-gray-500">{a.platform}</span>
                  </div>
                  {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{a.size?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">users</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
