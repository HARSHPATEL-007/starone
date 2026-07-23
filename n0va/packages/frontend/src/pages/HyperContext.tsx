import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Task, Doc, Sheet, CalendarEvent } from "../types";
import { CheckSquare, FileText, Table, Calendar, Plus, ExternalLink, RefreshCw, ArrowRight, Edit3, Trash2, X } from "lucide-react";
import { SkeletonCard, SkeletonRow } from "../components/Skeleton";

type Tab = "tasks" | "docs" | "sheets" | "calendar";
type EntityType = "task" | "doc" | "sheet" | "event";
type ModalMode = "create" | "edit" | null;

const priorityColors: Record<string, string> = {
  low: "text-blue-400", medium: "text-yellow-400", high: "text-orange-400", critical: "text-red-400",
};
const statusColors: Record<string, string> = {
  todo: "text-gray-500", in_progress: "text-blue-400", done: "text-green-400", cancelled: "text-gray-600",
};
const docTypeColors: Record<string, string> = {
  brief: "text-purple-400 bg-purple-500/10", report: "text-blue-400 bg-blue-500/10",
  strategy: "text-green-400 bg-green-500/10", analysis: "text-orange-400 bg-orange-500/10", other: "text-gray-400 bg-gray-500/10",
};

export default function HyperContext() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d, s, e, c] = await Promise.all([
        api.hypercontext.tasks.list(),
        api.hypercontext.docs.list(),
        api.hypercontext.sheets.list(),
        api.hypercontext.calendar.list(),
        api.campaigns.list().catch(() => []),
      ]);
      setTasks(t); setDocs(d); setSheets(s); setEvents(e); setCampaigns(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getEntityHelpers = () => {
    switch (tab) {
      case "tasks":
        return {
          label: "Task",
          fields: [
            { key: "title", label: "Title", type: "text", required: true },
            { key: "description", label: "Description", type: "textarea" },
            { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
            { key: "status", label: "Status", type: "select", options: ["todo", "in_progress", "done", "cancelled"] },
            { key: "assignee", label: "Assignee", type: "text" },
            { key: "campaignId", label: "Campaign ID", type: "select", options: campaigns.map((c: any) => ({ value: c._id, label: c.name })) },
            { key: "dueDate", label: "Due Date", type: "date" },
          ],
          create: (data: any) => api.hypercontext.tasks.create(data),
          update: (id: string, data: any) => api.hypercontext.tasks.update(id, data),
          delete: (id: string) => api.hypercontext.tasks.delete(id),
        };
      case "docs":
        return {
          label: "Document",
          fields: [
            { key: "title", label: "Title", type: "text", required: true },
            { key: "content", label: "Content", type: "textarea" },
            { key: "type", label: "Type", type: "select", options: ["brief", "report", "strategy", "analysis", "other"] },
            { key: "tags", label: "Tags (comma separated)", type: "text" },
            { key: "campaignId", label: "Campaign ID", type: "select", options: campaigns.map((c: any) => ({ value: c._id, label: c.name })) },
          ],
          create: (data: any) => api.hypercontext.docs.create(data),
          update: (id: string, data: any) => api.hypercontext.docs.update(id, data),
          delete: (id: string) => api.hypercontext.docs.delete(id),
          fromItem: (item: Doc) => ({ ...item, tags: item.tags?.join(", ") || "" }),
          toSave: (form: any) => ({ ...form, tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [] }),
        };
      case "sheets":
        return {
          label: "Sheet",
          fields: [
            { key: "title", label: "Title", type: "text", required: true },
            { key: "type", label: "Type", type: "select", options: ["budget", "performance", "forecast", "custom"] },
            { key: "rows", label: "Rows", type: "number" },
            { key: "columns", label: "Columns", type: "number" },
            { key: "campaignId", label: "Campaign ID", type: "select", options: campaigns.map((c: any) => ({ value: c._id, label: c.name })) },
          ],
          create: (data: any) => api.hypercontext.sheets.create(data),
          update: (id: string, data: any) => api.hypercontext.sheets.update(id, data),
          delete: (id: string) => api.hypercontext.sheets.delete(id),
        };
      case "calendar":
        return {
          label: "Event",
          fields: [
            { key: "title", label: "Title", type: "text", required: true },
            { key: "description", label: "Description", type: "textarea" },
            { key: "type", label: "Type", type: "select", options: ["review", "launch", "meeting", "deadline", "milestone", "other"] },
            { key: "startDate", label: "Start Date", type: "datetime-local", required: true },
            { key: "endDate", label: "End Date", type: "datetime-local", required: true },
            { key: "campaignId", label: "Campaign ID", type: "select", options: campaigns.map((c: any) => ({ value: c._id, label: c.name })) },
          ],
          create: (data: any) => api.hypercontext.calendar.create(data),
          update: (id: string, data: any) => api.hypercontext.calendar.update(id, data),
          delete: (id: string) => api.hypercontext.calendar.delete(id),
          fromItem: (item: CalendarEvent) => ({
            ...item,
            startDate: item.startDate?.slice(0, 16),
            endDate: item.endDate?.slice(0, 16),
          }),
        };
    }
  };

  const helpers = getEntityHelpers();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!helpers) return;
    const form = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    const data: any = {};
    for (const [k, v] of Object.entries(form)) { if (v !== "" && v !== undefined) data[k] = v; }
    if (data.rows) data.rows = parseInt(data.rows);
    if (data.columns) data.columns = parseInt(data.columns);
    const processed = helpers.toSave ? helpers.toSave(data) : data;
    try {
      if (editItem) {
        await helpers.update(editItem._id, processed);
      } else {
        await helpers.create(processed);
      }
      setModalMode(null); setEditItem(null);
      loadAll();
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!helpers) return;
    try {
      await helpers.delete(id);
      setShowDelete(null);
      loadAll();
    } catch {}
  }

  const tabs = [
    { key: "tasks" as Tab, label: "Tasks", icon: CheckSquare, count: tasks.filter((t) => t.status !== "done").length },
    { key: "docs" as Tab, label: "Documents", icon: FileText, count: docs.length },
    { key: "sheets" as Tab, label: "Sheets", icon: Table, count: sheets.length },
    { key: "calendar" as Tab, label: "Calendar", icon: Calendar, count: events.length },
  ];

  function openCreate() { setEditItem(null); setModalMode("create"); }
  function openEdit(item: any) {
    const converted = helpers?.fromItem ? helpers.fromItem(item) : item;
    setEditItem(converted);
    setModalMode("edit");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hyper-Context Integration</h1>
          <p className="text-gray-500 mt-1">Cross-module tasks, documents, sheets, and calendar events</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary p-2" onClick={loadAll} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add {tab === "calendar" ? "Event" : tab.slice(0, -1)}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`} onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-xs text-gray-600">({t.count})</span>
          </button>
        ))}
      </div>

      {modalMode && helpers && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{editItem ? "Edit" : "New"} {helpers.label}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {helpers.fields.map((f: any) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select className="select" name={f.key} defaultValue={editItem?.[f.key] || ""} required={f.required}>
                      <option value="">{f.key === "campaignId" ? "No campaign" : "Select..."}</option>
                      {f.options?.map((o: any) => {
                        const val = typeof o === "object" ? o.value : o;
                        const lbl = typeof o === "object" ? o.label : o;
                        return <option key={val} value={val}>{lbl}</option>;
                      })}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea className="input font-mono text-xs h-20" name={f.key} defaultValue={editItem?.[f.key] || ""} required={f.required} />
                  ) : f.type === "number" ? (
                    <input className="input" type="number" name={f.key} defaultValue={editItem?.[f.key] ?? ""} required={f.required} min={0} />
                  ) : f.type === "date" ? (
                    <input className="input" type="date" name={f.key} defaultValue={editItem?.[f.key]?.slice(0, 10) || ""} required={f.required} />
                  ) : f.type === "datetime-local" ? (
                    <input className="input" type="datetime-local" name={f.key} defaultValue={editItem?.[f.key]?.slice(0, 16) || ""} required={f.required} />
                  ) : (
                    <input className="input" name={f.key} defaultValue={editItem?.[f.key] || ""} required={f.required} placeholder={`Enter ${f.label.toLowerCase()}`} />
                  )}
                </div>
              ))}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => { setModalMode(null); setEditItem(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editItem ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card max-w-sm mx-4 text-center">
            <p className="text-white mb-4">Delete this {tab === "calendar" ? "event" : tab.slice(0, -1)}?</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-secondary" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(showDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {tab === "tasks" || tab === "calendar"
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          }
        </div>
      ) : (
        <>
          {tab === "tasks" && (
            <div className="space-y-1">
              {tasks.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No tasks yet.</p>}
              {tasks.map((task) => (
                <div key={task._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-800 group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 cursor-pointer ${task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-600"}`} onClick={async () => {
                    await api.hypercontext.tasks.update(task._id, { status: task.status === "done" ? "todo" : "done" });
                    loadAll();
                  }}>
                    {task.status === "done" && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${task.status === "done" ? "text-gray-500 line-through" : "text-white"} font-medium`}>{task.title}</span>
                      <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                      {task.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500" />}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {task.assignee && <span>{task.assignee}</span>}
                      {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                      {task.campaignId && (
                        <Link to={`/campaigns/${task.campaignId}`} className="text-n0va-400 hover:text-n0va-300 flex items-center gap-1">
                          View campaign <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColors[task.status]}`}>{task.status.replace("_", " ")}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => openEdit(task)}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => setShowDelete(task._id)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "docs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.length === 0 && <p className="text-gray-500 text-sm col-span-2 text-center py-8">No documents yet.</p>}
              {docs.map((doc) => (
                <div key={doc._id} className="card hover:border-gray-700 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${docTypeColors[doc.type]}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate">{doc.title}</p>
                        {doc.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{doc.type}</p>
                      {doc.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.content}</p>}
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map((tag) => (<span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded text-xs">{tag}</span>))}
                        </div>
                      )}
                      {doc.campaignId && (
                        <Link to={`/campaigns/${doc.campaignId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1 mt-2">
                          View campaign <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => openEdit(doc)}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => setShowDelete(doc._id)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "sheets" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sheets.length === 0 && <p className="text-gray-500 text-sm col-span-2 text-center py-8">No sheets yet.</p>}
              {sheets.map((sheet) => (
                <div key={sheet._id} className="card hover:border-gray-700 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Table className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate">{sheet.title}</p>
                        {sheet.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{sheet.type} · {sheet.rows} rows × {sheet.columns} cols</p>
                      {sheet.campaignId && (
                        <Link to={`/campaigns/${sheet.campaignId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1 mt-2">
                          View campaign <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => openEdit(sheet)}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => setShowDelete(sheet._id)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "calendar" && (
            <div className="space-y-2">
              {events.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No events yet.</p>}
              {events.map((event) => (
                <div key={event._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-800 group">
                  <div className={`w-1 h-full min-h-[3rem] rounded-full shrink-0 ${event.type === "review" ? "bg-purple-500" : event.type === "launch" ? "bg-green-500" : event.type === "meeting" ? "bg-blue-500" : event.type === "deadline" ? "bg-red-500" : event.type === "milestone" ? "bg-yellow-500" : "bg-gray-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{event.title}</span>
                      {event.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{event.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(event.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {" — "}
                      {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    {event.campaignId && (
                      <Link to={`/campaigns/${event.campaignId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1 mt-1">
                        View campaign <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="text-gray-500 hover:text-n0va-400 p-1" onClick={() => openEdit(event)}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button className="text-gray-500 hover:text-red-400 p-1" onClick={() => setShowDelete(event._id)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
