import { useState, useEffect } from "react";
import { User, Key, Copy, Check, Eye, EyeOff, Trash2, Plus, Shield, Calendar, Clock, AlertTriangle, Activity, Loader, Download, BarChart3 } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

interface ApiKey {
  id: string;
  label: string;
  key: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  revoked: boolean;
}

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "n0va_";
  for (let i = 0; i < 48; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

const ENTITY_TYPE = "api_keys";

export default function AccountPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState<"profile" | "api-keys">("profile");

  // Profile state
  const [user, setUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [keysLoading, setKeysLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("n0va_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        setEditName(u.name || "");
        setEditEmail(u.email || "");
      } catch {}
    }
    api.entities.list(ENTITY_TYPE).then((r) => { setKeys(r || []); setKeysLoading(false); }).catch(() => { setKeysLoading(false); });
  }, []);

  async function saveProfile() {
    if (!user) return;
    setProfileLoading(true);
    try {
      const updated = { ...user, name: editName, email: editEmail };
      await api.settings.updateTenant({ name: editName });
      await api.entities.list("user_profile").then((profiles) => {
        if (profiles && profiles.length > 0) {
          api.entities.update("user_profile", profiles[0]._id, updated).catch(() => {});
        } else {
          api.entities.create("user_profile", updated).catch(() => {});
        }
      }).catch(() => api.entities.create("user_profile", updated).catch(() => {}));
      localStorage.setItem("n0va_user", JSON.stringify(updated));
      setUser(updated);
      addToast("success", "Profile updated");
    } catch {
      addToast("error", "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword() {
    if (!currentPw) { addToast("error", "Enter current password"); return; }
    if (!newPw || newPw.length < 6) { addToast("error", "New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { addToast("error", "Passwords do not match"); return; }
    try {
      const res = await api.users.changePassword(currentPw, newPw);
      addToast("success", res.message || "Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      addToast("error", err?.message || "Failed to change password");
    }
  }

  async function createKey() {
    if (!newLabel.trim()) { addToast("error", "Enter a label for this key"); return; }
    try {
      const key: ApiKey = {
        id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
        label: newLabel.trim(),
        key: generateKey(),
        prefix: "n0va_",
        createdAt: new Date().toISOString(),
        lastUsed: null,
        revoked: false,
      };
      const created = await api.entities.create(ENTITY_TYPE, key as any);
      setKeys([created, ...keys]);
      setNewLabel("");
      setShowKey(created.id || key.id);
      addToast("success", "API key created — copy it now, it won't be shown again");
    } catch {
      addToast("error", "Failed to create API key");
    }
  }

  async function revokeKey(id: string) {
    try {
      await api.entities.update(ENTITY_TYPE, id, { revoked: true });
      setKeys(keys.map((k) => k.id === id ? { ...k, revoked: true } : k));
      addToast("success", "API key revoked");
    } catch {
      addToast("error", "Failed to revoke key");
    }
  }

  async function deleteKey(id: string) {
    try {
      await api.entities.delete(ENTITY_TYPE, id);
      setKeys(keys.filter((k) => k.id !== id));
      addToast("success", "API key removed");
    } catch {
      addToast("error", "Failed to delete key");
    }
  }

  function copyKey(id: string, key: string) {
    navigator.clipboard.writeText(key);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 2000);
    addToast("success", "Key copied to clipboard");
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);

  const keyUsageData = (() => {
    const groups: Record<string, { created: number; revoked: number }> = {};
    keys.forEach(k => {
      const month = new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!groups[month]) groups[month] = { created: 0, revoked: 0 };
      groups[month].created++;
      if (k.revoked) groups[month].revoked++;
    });
    return Object.entries(groups).map(([month, counts]) => ({ month, ...counts }));
  })();

  function exportKeysCSV() {
    const rows = [["Label", "Prefix", "Created", "Last Used", "Status"]];
    keys.forEach(k => rows.push([k.label, k.prefix, k.createdAt, k.lastUsed || "Never", k.revoked ? "Revoked" : "Active"]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `api-keys-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast("success", `Exported ${keys.length} keys`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <User className="w-6 h-6 text-n0va-400" />
            Account
          </h1>
          <p className="text-gray-400 mt-1">Manage your profile and API keys</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setTab("profile")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            tab === "profile" ? "text-n0va-400 border-n0va-500" : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />Profile
        </button>
        <button
          onClick={() => setTab("api-keys")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            tab === "api-keys" ? "text-n0va-400 border-n0va-500" : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />API Keys {activeKeys.length > 0 && <span className="ml-1.5 text-xs bg-n0va-500/20 text-n0va-400 px-1.5 py-0.5 rounded-full">{activeKeys.length}</span>}
        </button>
      </div>

      {tab === "profile" && user && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white">Profile Information</h2>
              <div className="flex items-center gap-4 pb-4 border-b border-gray-800">
                <div className="w-16 h-16 bg-n0va-600/20 rounded-full flex items-center justify-center text-xl font-bold text-n0va-400">
                  {getInitials(user.name)}
                </div>
                <div>
                  <p className="text-white font-medium text-lg">{user.name}</p>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">User ID</label>
                  <input className="input text-xs text-gray-500" value={user.userId} disabled />
                </div>
                <div>
                  <label className="label text-xs">Tenant ID</label>
                  <input className="input text-xs text-gray-500" value={user.tenantId} disabled />
                </div>
              </div>
              <button onClick={saveProfile} disabled={profileLoading} className="btn-primary">{profileLoading ? <><Loader className="w-4 h-4 animate-spin inline" /> Saving...</> : "Save Changes"}</button>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-n0va-400" /> Change Password</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" className="input" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input type="password" className="input" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                </div>
              </div>
              <button onClick={changePassword} className="btn-ghost">Update Password</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> Account Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="text-white capitalize">{user.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="text-white">Pro</span></div>
                <div className="flex justify-between"><span className="text-gray-500">MFA</span><span className="text-emerald-400 text-xs font-medium">Enabled</span></div>
              </div>
            </div>

            <div className="card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" /> Session</h2>
              <div className="space-y-2 text-sm">
                <button className="btn-ghost text-xs w-full" onClick={() => { localStorage.removeItem("n0va_token"); addToast("success", "Signed out"); window.location.href = "/login"; }}>Sign Out All Sessions</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "api-keys" && (
        <div className="space-y-4">
          {keyUsageData.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-n0va-400" /> Key Creation Timeline</h3>
                <button onClick={exportKeysCSV} className="btn-ghost text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Export CSV</button>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={keyUsageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                    <Bar dataKey="created" fill="#6366f1" radius={[4, 4, 0, 0]} name="Created" />
                    <Bar dataKey="revoked" fill="#ef4444" radius={[4, 4, 0, 0]} name="Revoked" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Key className="w-4 h-4 text-n0va-400" /> Create API Key</h2>
            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="e.g. Production CI/CD"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createKey()}
              />
              <button onClick={createKey} className="btn-primary flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Generate Key
              </button>
            </div>
          </div>

          {activeKeys.length > 0 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Key className="w-4 h-4 text-emerald-400" /> Active Keys</h2>
              <div className="space-y-2">
                {activeKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{k.label}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {showKey === k.id ? (
                          <code className="text-xs bg-gray-900 px-2 py-0.5 rounded text-n0va-400 font-mono select-all">{k.key}</code>
                        ) : (
                          <span className="font-mono">{k.prefix}{"•".repeat(40)}</span>
                        )}
                        <span>Created {formatDate(k.createdAt)}</span>
                        {k.lastUsed && <span>Last used {formatDate(k.lastUsed)}</span>}
                        {!k.lastUsed && <span className="text-gray-600">Never used</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => showKey === k.id ? setShowKey(null) : setShowKey(k.id)}
                      className="text-gray-500 hover:text-gray-300"
                      title={showKey === k.id ? "Hide key" : "Show key"}
                    >
                      {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyKey(k.id, k.key)}
                      className="text-gray-500 hover:text-gray-300"
                      title="Copy key"
                    >
                      {copyId === k.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="text-gray-500 hover:text-red-400"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {revokedKeys.length > 0 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-gray-500" /> Revoked Keys</h2>
              <div className="space-y-2 opacity-60">
                {revokedKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-400 line-through">{k.label}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                        <span className="font-mono">{k.prefix}{"•".repeat(40)}</span>
                        <span>Created {formatDate(k.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteKey(k.id)}
                      className="text-gray-600 hover:text-red-400"
                      title="Remove permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keys.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Key className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No API keys yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Generate your first API key above to integrate N0VA with your tools and workflows.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
