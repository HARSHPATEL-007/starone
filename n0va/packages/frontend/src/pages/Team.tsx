import { useState, useEffect } from "react";
import { Users, Plus, X, UserCheck, UserX, Shield, UserCog, Mail, Clock, Copy, Check, Search, ChevronDown, ChevronRight, MoreHorizontal, Ban, AlertTriangle } from "lucide-react";
import { useToast } from "../components/Toast";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "invited" | "suspended";
  joinedAt: string;
  lastActive: string | null;
}

const STORAGE_KEY = "n0va_team_members";
const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access to all features and settings", icon: Shield, color: "text-purple-400 bg-purple-500/10" },
  { value: "editor", label: "Editor", desc: "Can create and edit campaigns and content", icon: UserCog, color: "text-blue-400 bg-blue-500/10" },
  { value: "viewer", label: "Viewer", desc: "Read-only access to dashboards and reports", icon: UserCheck, color: "text-green-400 bg-green-500/10" },
];

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "u1", name: "You", email: "admin@n0va.io", role: "admin", status: "active", joinedAt: new Date(Date.now() - 86400000 * 90).toISOString(), lastActive: new Date(Date.now() - 60000 * 15).toISOString() },
  { id: "u2", name: "Sarah Chen", email: "sarah@n0va.io", role: "editor", status: "active", joinedAt: new Date(Date.now() - 86400000 * 60).toISOString(), lastActive: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: "u3", name: "Alex Rivera", email: "alex@n0va.io", role: "editor", status: "active", joinedAt: new Date(Date.now() - 86400000 * 45).toISOString(), lastActive: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: "u4", name: "Mia Johnson", email: "mia@n0va.io", role: "viewer", status: "active", joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastActive: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "u5", name: "James Park", email: "james@n0va.io", role: "editor", status: "invited", joinedAt: new Date(Date.now() - 86400000 * 3).toISOString(), lastActive: null },
  { id: "u6", name: "Emily Davis", email: "emily@n0va.io", role: "viewer", status: "suspended", joinedAt: new Date(Date.now() - 86400000 * 20).toISOString(), lastActive: new Date(Date.now() - 86400000 * 10).toISOString() },
];

function load(): TeamMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEMBERS));
    return DEFAULT_MEMBERS;
  } catch { return []; }
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function roleMeta(role: string) { return ROLES.find(r => r.value === role) || ROLES[2]; }

export default function Team() {
  const { addToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "editor" as TeamMember["role"] });
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMembers(load()); }, []);

  function persist(updated: TeamMember[]) {
    setMembers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) { addToast("error", "Name and email are required"); return; }
    if (members.some(m => m.email === inviteForm.email.trim())) { addToast("error", "A member with this email already exists"); return; }
    const member: TeamMember = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      status: "invited",
      joinedAt: new Date().toISOString(),
      lastActive: null,
    };
    persist([member, ...members]);
    setInviteForm({ name: "", email: "", role: "editor" });
    setShowInvite(false);
    addToast("success", `Invitation sent to ${member.email}`);
  }

  function updateRole(id: string, role: TeamMember["role"]) {
    const member = members.find(m => m.id === id);
    if (member?.name === "You") { addToast("error", "Cannot change your own role"); return; }
    persist(members.map(m => m.id === id ? { ...m, role } : m));
    addToast("success", "Role updated");
  }

  function updateStatus(id: string, status: TeamMember["status"]) {
    const member = members.find(m => m.id === id);
    if (member?.name === "You") { addToast("error", "Cannot change your own status"); return; }
    if (status === "suspended" && members.filter(m => m.role === "admin" && m.status === "active").length <= 1 && member?.role === "admin") {
      addToast("error", "Cannot suspend the last active admin"); return;
    }
    persist(members.map(m => m.id === id ? { ...m, status } : m));
    addToast("success", status === "active" ? "Member reactivated" : status === "suspended" ? "Member suspended" : "Invitation resent");
  }

  function removeMember(id: string) {
    const member = members.find(m => m.id === id);
    if (member?.name === "You") { addToast("error", "Cannot remove yourself"); return; }
    persist(members.filter(m => m.id !== id));
    addToast("success", `"${member?.name}" removed from team`);
  }

  function resendInvite(id: string) {
    addToast("success", "Invitation resent");
  }

  const filtered = members.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole !== "all" && m.role !== filterRole) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const inviteLink = "https://app.n0va.io/invite/abc123def456";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-n0va-400" />
            Team
          </h1>
          <p className="text-gray-400 mt-1">{members.length} members · {members.filter(m => m.status === "active").length} active</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Invite Member</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Active</p><p className="text-2xl font-bold text-green-400">{members.filter(m => m.status === "active").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Admins</p><p className="text-2xl font-bold text-purple-400">{members.filter(m => m.role === "admin" && m.status === "active").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Editors</p><p className="text-2xl font-bold text-blue-400">{members.filter(m => m.role === "editor" && m.status === "active").length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Pending</p><p className="text-2xl font-bold text-amber-400">{members.filter(m => m.status === "invited").length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input className="input pl-10 pr-4 py-2 text-sm" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
        </select>
        {(search || filterRole !== "all" || filterStatus !== "all") && <button onClick={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Invite Team Member</h3><button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div><label className="label">Name</label><input className="input" placeholder="e.g. Jane Smith" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} autoFocus /></div>
              <div><label className="label">Email</label><input className="input" type="email" placeholder="jane@company.com" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
              <div><label className="label">Role</label><select className="input" value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as TeamMember["role"] })}>{ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}</select></div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Or share invite link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-gray-500 bg-gray-900 px-2 py-1.5 rounded truncate">{inviteLink}</code>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="p-1.5 text-gray-600 hover:text-n0va-400">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Send Invite</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No members found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Invite your first team member."}</p>
        </div>
      )}

      {/* Member list */}
      {filtered.length > 0 && (
        <div className="space-y-1">
          {filtered.map(member => {
            const rm = roleMeta(member.role);
            const RoleIcon = rm.icon;
            const isYou = member.name === "You";
            return (
              <div key={member.id} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${member.status === "active" ? "bg-gray-800 text-gray-400" : member.status === "invited" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                    {member.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{member.name}</span>
                      {isYou && <span className="text-[10px] text-n0va-400 bg-n0va-500/10 px-1.5 py-0.5 rounded">You</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${member.status === "active" ? "bg-green-500/10 text-green-400" : member.status === "invited" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{member.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                      <span className="flex items-center gap-1"><RoleIcon className="w-3 h-3" /> {rm.label}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Joined {timeAgo(member.joinedAt)}</span>
                      {member.lastActive && <span>Last active {timeAgo(member.lastActive)}</span>}
                    </div>
                  </div>

                  {/* Role badge */}
                  <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${rm.color}`}>
                    <RoleIcon className="w-3 h-3" /> {rm.label}
                  </span>

                  {/* Actions */}
                  {!isYou && (
                    <div className="flex items-center gap-1">
                      {/* Role changer */}
                      <select
                        className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700"
                        value={member.role}
                        onChange={e => updateRole(member.id, e.target.value as TeamMember["role"])}
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>

                      {member.status === "invited" ? (
                        <>
                          <button onClick={() => resendInvite(member.id)} className="p-1.5 text-gray-600 hover:text-n0va-400"><Mail className="w-4 h-4" /></button>
                          <button onClick={() => removeMember(member.id)} className="p-1.5 text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                        </>
                      ) : member.status === "suspended" ? (
                        <button onClick={() => updateStatus(member.id, "active")} className="p-1.5 text-gray-600 hover:text-green-400"><UserCheck className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => updateStatus(member.id, "suspended")} className="p-1.5 text-gray-600 hover:text-red-400"><Ban className="w-4 h-4" /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
