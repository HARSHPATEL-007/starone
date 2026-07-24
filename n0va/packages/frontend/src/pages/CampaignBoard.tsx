import { useState, useEffect } from "react";
import { Columns3, Plus, X, Edit3, Trash2, Copy, Search, Users, Eye, MousePointerClick, DollarSign, Target, BarChart3, Megaphone, CheckCircle, Clock, ArrowRight, GripVertical } from "lucide-react";
import { useToast } from "../components/Toast";

type BoardStatus = "idea" | "planning" | "in_progress" | "review" | "completed" | "on_hold";

interface BoardCard {
  id: string;
  title: string;
  description: string;
  status: BoardStatus;
  assignee: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
  campaignName: string;
  labels: string[];
  createdAt: string;
}

interface CampaignBoard {
  id: string;
  name: string;
  cards: BoardCard[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_campaign_boards";

const STATUS_META: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-gray-700 text-gray-300" },
  planning: { label: "Planning", color: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  review: { label: "Review", color: "bg-purple-500/20 text-purple-400" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  on_hold: { label: "On Hold", color: "bg-red-500/20 text-red-400" },
};

const PRIORITY_META: Record<string, { color: string }> = {
  low: { color: "bg-gray-500" },
  medium: { color: "bg-yellow-500" },
  high: { color: "bg-orange-500" },
  critical: { color: "bg-red-500" },
};

const STATUSES: BoardStatus[] = ["idea", "planning", "in_progress", "review", "completed", "on_hold"];

const DEFAULT_BOARDS: CampaignBoard[] = [
  {
    id: "cb-1", name: "Q3 Campaign Planning",
    cards: [
      { id: "bc-1", title: "Brainstorm creative concepts", description: "Team brainstorming for Q3 campaign creative direction", status: "completed", assignee: "Alex", priority: "high", dueDate: new Date(Date.now() - 86400000 * 10).toISOString(), campaignName: "Product Launch Q3", labels: ["creative", "brainstorm"], createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
      { id: "bc-2", title: "Design landing page mockups", description: "Create 3 landing page variants for A/B testing", status: "in_progress", assignee: "Sarah", priority: "high", dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), campaignName: "Product Launch Q3", labels: ["design", "landing-page"], createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
      { id: "bc-3", title: "Set up Google Ads campaigns", description: "Configure campaign structure, ad groups, and keywords", status: "planning", assignee: "Mike", priority: "high", dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), campaignName: "Product Launch Q3", labels: ["ads", "google"], createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
      { id: "bc-4", title: "Write ad copy variants", description: "10 headlines, 5 body copies, 3 CTAs per variant", status: "idea", assignee: "Emily", priority: "medium", dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), campaignName: "Product Launch Q3", labels: ["copy", "creative"], createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "bc-5", title: "Review creative assets", description: "Final review of all creatives before launch", status: "on_hold", assignee: "James", priority: "critical", dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), campaignName: "Product Launch Q3", labels: ["review", "creative"], createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: "bc-6", title: "Set up conversion tracking", description: "Configure GA4 and platform-specific conversion pixels", status: "planning", assignee: "Mike", priority: "high", dueDate: new Date(Date.now() + 86400000 * 4).toISOString(), campaignName: "Product Launch Q3", labels: ["tracking", "tech"], createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "cb-2", name: "Summer Campaign Tasks",
    cards: [
      { id: "bc-7", title: "Select influencer partners", description: "Research and shortlist 10 micro-influencers", status: "completed", assignee: "Sarah", priority: "medium", dueDate: new Date(Date.now() - 86400000 * 5).toISOString(), campaignName: "Summer Sale 2025", labels: ["influencer"], createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
      { id: "bc-8", title: "Create Instagram Story templates", description: "5 story templates for the sale announcement", status: "in_progress", assignee: "Emily", priority: "high", dueDate: new Date(Date.now() + 86400000 * 1).toISOString(), campaignName: "Summer Sale 2025", labels: ["design", "social"], createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: "bc-9", title: "Schedule social posts", description: "Schedule 2 weeks of social content", status: "idea", assignee: "Alex", priority: "medium", dueDate: new Date(Date.now() + 86400000 * 6).toISOString(), campaignName: "Summer Sale 2025", labels: ["social"], createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

function load(): CampaignBoard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOARDS));
    return DEFAULT_BOARDS;
  } catch { return []; }
}

export default function CampaignBoard() {
  const { addToast } = useToast();
  const [boards, setBoards] = useState<CampaignBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [form, setForm] = useState<BoardCard>({ id: "", title: "", description: "", status: "idea", assignee: "", priority: "medium", dueDate: "", campaignName: "", labels: [], createdAt: "" });
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  useEffect(() => { setBoards(load()); }, []);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  function persist(updated: CampaignBoard[]) {
    setBoards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function updateBoard(updated: CampaignBoard) {
    persist(boards.map(b => b.id === updated.id ? updated : b));
  }

  function addCard(status: BoardStatus) {
    if (!activeBoard) return;
    const now = new Date().toISOString();
    const card: BoardCard = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4), title: "", description: "", status, assignee: "", priority: "medium", dueDate: "", campaignName: "", labels: [], createdAt: now };
    updateBoard({ ...activeBoard, cards: [...activeBoard.cards, card], updatedAt: now });
    setEditingCardId(card.id);
    setEditingBoardId(activeBoard.id);
    setForm(card);
    setShowForm(true);
  }

  function moveCard(cardId: string, newStatus: BoardStatus) {
    if (!activeBoard) return;
    updateBoard({ ...activeBoard, cards: activeBoard.cards.map(c => c.id === cardId ? { ...c, status: newStatus } : c), updatedAt: new Date().toISOString() });
    addToast("success", "Card moved");
  }

  function handleSaveCard() {
    if (!form.title.trim()) { addToast("error", "Card title is required"); return; }
    const now = new Date().toISOString();
    if (editingCardId && editingBoardId) {
      const board = boards.find(b => b.id === editingBoardId);
      if (!board) return;
      updateBoard({ ...board, cards: board.cards.map(c => c.id === editingCardId ? { ...form, title: form.title.trim() } : c), updatedAt: now });
      addToast("success", "Card updated");
    } else if (activeBoard) {
      const card: BoardCard = { ...form, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: form.title.trim(), createdAt: now };
      updateBoard({ ...activeBoard, cards: [...activeBoard.cards, card], updatedAt: now });
      addToast("success", "Card added");
    }
    setShowForm(false);
    setEditingCardId(null);
    setEditingBoardId(null);
  }

  function deleteCard(cardId: string) {
    if (!activeBoard) return;
    updateBoard({ ...activeBoard, cards: activeBoard.cards.filter(c => c.id !== cardId), updatedAt: new Date().toISOString() });
    addToast("success", "Card deleted");
  }

  function duplicateCard(cardId: string) {
    if (!activeBoard) return;
    const card = activeBoard.cards.find(c => c.id === cardId);
    if (!card) return;
    const copy: BoardCard = { ...card, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: `${card.title} (Copy)`, createdAt: new Date().toISOString() };
    updateBoard({ ...activeBoard, cards: [...activeBoard.cards, copy], updatedAt: new Date().toISOString() });
    addToast("success", "Card duplicated");
  }

  function createBoard() {
    if (!newBoardName.trim()) { addToast("error", "Board name required"); return; }
    const now = new Date().toISOString();
    const board: CampaignBoard = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: newBoardName.trim(), cards: [], createdAt: now, updatedAt: now };
    persist([board, ...boards]);
    setActiveBoardId(board.id);
    setNewBoardName("");
    setShowNewBoard(false);
    addToast("success", "Board created");
  }

  function deleteBoard(id: string) {
    const name = boards.find(b => b.id === id)?.name;
    persist(boards.filter(b => b.id !== id));
    if (activeBoardId === id) setActiveBoardId(null);
    addToast("success", `"${name}" deleted`);
  }

  if (!activeBoard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Columns3 className="w-6 h-6 text-n0va-400" />Campaign Board</h1>
          <button onClick={() => setShowNewBoard(true)} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Board</button>
        </div>
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <Columns3 className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No boards yet</h3>
          <p className="text-sm text-gray-500">Create your first campaign board to organize tasks.</p>
          <button onClick={() => setShowNewBoard(true)} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Board</button>
        </div>
        {showNewBoard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNewBoard(false)}>
            <div className="bg-n0va-800 rounded-xl border border-gray-800 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4">New Board</h3>
              <input className="input mb-4" placeholder="Board name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && createBoard()} />
              <div className="flex justify-end gap-3"><button onClick={() => setShowNewBoard(false)} className="btn-secondary">Cancel</button><button onClick={createBoard} className="btn-primary">Create</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredCards = activeBoard.cards.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.campaignName.toLowerCase().includes(search.toLowerCase()) || c.assignee.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Columns3 className="w-6 h-6 text-n0va-400" />
            Campaign Board
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input className="input pl-8 pr-3 py-1.5 text-xs w-48" placeholder="Search cards..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowNewBoard(true)} className="btn-secondary text-xs py-1.5">+ Board</button>
        </div>
      </div>

      {/* Board tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {boards.map(b => (
          <div key={b.id} className="flex items-center gap-1">
            <button onClick={() => setActiveBoardId(b.id)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${b.id === activeBoard.id ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
              {b.name}
            </button>
            <button onClick={() => deleteBoard(b.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-6 gap-3">
        {STATUSES.map(status => {
          const sm = STATUS_META[status];
          const cards = filteredCards.filter(c => c.status === status);
          return (
            <div key={status} className="bg-gray-900/60 rounded-xl p-3 min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sm.color}`}>{sm.label}</span>
                  <span className="text-[10px] text-gray-600">{cards.length}</span>
                </div>
                <button onClick={() => addCard(status)} className="p-1 text-gray-600 hover:text-white"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {cards.map(card => (
                  <div key={card.id} className="bg-n0va-800 rounded-lg p-3 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-white flex-1">{card.title}</h4>
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${PRIORITY_META[card.priority]?.color || "bg-gray-500"}`} />
                    </div>
                    {card.description && <p className="text-[10px] text-gray-500 mb-1.5">{card.description.slice(0, 60)}{card.description.length > 60 ? "..." : ""}</p>}
                    <div className="flex items-center gap-2 text-[9px] text-gray-600 flex-wrap">
                      {card.assignee && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{card.assignee}</span>}
                      {card.campaignName && <span className="flex items-center gap-0.5">{card.campaignName}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {card.labels.map(l => <span key={l} className="text-[8px] bg-gray-800 text-gray-600 px-1 py-0.5 rounded">{l}</span>)}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-800">
                      {STATUSES.map(s => {
                        if (s === card.status) return null;
                        return <button key={s} onClick={() => moveCard(card.id, s)} className="text-[8px] bg-gray-800 hover:bg-gray-700 text-gray-500 px-1 py-0.5 rounded capitalize">{s.replace("_", " ")}</button>;
                      })}
                      <div className="flex-1" />
                      <button onClick={() => { resetForm(card); setEditingCardId(card.id); setEditingBoardId(activeBoard.id); setForm(card); setShowForm(true); }} className="p-0.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-2.5 h-2.5" /></button>
                      <button onClick={() => duplicateCard(card.id)} className="p-0.5 text-gray-600 hover:text-gray-300"><Copy className="w-2.5 h-2.5" /></button>
                      <button onClick={() => deleteCard(card.id)} className="p-0.5 text-gray-600 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="text-[10px] text-gray-700 text-center py-4">No cards</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New board modal */}
      {showNewBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNewBoard(false)}>
          <div className="bg-n0va-800 rounded-xl border border-gray-800 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">New Board</h3>
            <input className="input mb-4" placeholder="Board name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && createBoard()} />
            <div className="flex justify-end gap-3"><button onClick={() => setShowNewBoard(false)} className="btn-secondary">Cancel</button><button onClick={createBoard} className="btn-primary">Create</button></div>
          </div>
        </div>
      )}

      {/* Card edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingCardId ? "Edit Card" : "New Card"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSaveCard(); }} className="space-y-3">
              <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as BoardStatus })}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div><label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
                    {["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Assignee</label><input className="input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} /></div>
                <div><label className="label">Due Date</label><input className="input" type="date" value={form.dueDate ? form.dueDate.slice(0, 10) : ""} onChange={e => setForm({ ...form, dueDate: new Date(e.target.value).toISOString() })} /></div>
              </div>
              <div><label className="label">Campaign</label><input className="input" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
