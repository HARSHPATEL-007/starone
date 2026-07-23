import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Task, Doc, Sheet, CalendarEvent } from "../types";
import { CheckSquare, FileText, Table, Calendar, Plus, ExternalLink, RefreshCw, ArrowRight } from "lucide-react";

const MOCK_TASKS: Task[] = [
  { _id: "task_1", tenantId: "tenant_001", campaignId: "camp_001", title: "Review Q3 creative assets", status: "in_progress", priority: "high", assignee: "Jane Doe", dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), source: "n0va", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "task_2", tenantId: "tenant_001", campaignId: "camp_001", title: "Approve budget increase for prospecting", status: "todo", priority: "critical", assignee: "John Smith", dueDate: new Date(Date.now() + 86400000).toISOString(), source: "n0va", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "task_3", tenantId: "tenant_001", campaignId: "camp_002", title: "Set up LinkedIn conversion tracking", status: "done", priority: "medium", assignee: "Alice Wang", source: "n0va", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "task_4", tenantId: "tenant_001", title: "Prepare weekly performance report", status: "todo", priority: "high", assignee: "Jane Doe", dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), source: "external", externalUrl: "https://todo.example.com/task/4", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "task_5", tenantId: "tenant_001", campaignId: "camp_003", title: "A/B test creative variants", status: "in_progress", priority: "medium", assignee: "Alice Wang", dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), source: "n0va", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_DOCS: Doc[] = [
  { _id: "doc_1", tenantId: "tenant_001", campaignId: "camp_001", title: "Summer Sale Creative Brief", type: "brief", content: "Campaign targeting millennials with discount messaging...", source: "n0va", tags: ["creative", "summer"], createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "doc_2", tenantId: "tenant_001", campaignId: "camp_002", title: "Brand Awareness Strategy", type: "strategy", content: "Top-of-funnel strategy focusing on video content...", source: "n0va", tags: ["strategy", "brand"], createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "doc_3", tenantId: "tenant_001", title: "Monthly Performance Report - June", type: "report", source: "external", externalUrl: "https://docs.example.com/report/june", tags: ["report", "monthly"], createdBy: "user_002", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_SHEETS: Sheet[] = [
  { _id: "sheet_1", tenantId: "tenant_001", campaignId: "camp_001", title: "Campaign Budget Tracker", type: "budget", rows: 45, columns: 12, source: "n0va", createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "sheet_2", tenantId: "tenant_001", title: "Weekly KPI Dashboard", type: "performance", rows: 30, columns: 8, source: "external", externalUrl: "https://sheets.example.com/kpi", createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_EVENTS: CalendarEvent[] = [
  { _id: "cal_1", tenantId: "tenant_001", campaignId: "camp_001", title: "Creative Review Meeting", startDate: new Date(Date.now() + 86400000).toISOString(), endDate: new Date(Date.now() + 86400000 + 3600000).toISOString(), type: "review", source: "n0va", createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cal_2", tenantId: "tenant_001", campaignId: "camp_002", title: "Campaign Launch", startDate: new Date(Date.now() + 86400000 * 3).toISOString(), endDate: new Date(Date.now() + 86400000 * 3 + 3600000).toISOString(), type: "launch", source: "n0va", createdBy: "user_001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cal_3", tenantId: "tenant_001", title: "Budget Review with Stakeholders", startDate: new Date(Date.now() + 86400000 * 7).toISOString(), endDate: new Date(Date.now() + 86400000 * 7 + 3600000).toISOString(), type: "meeting", source: "external", externalUrl: "https://calendar.example.com/event/3", createdBy: "user_002", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

type Tab = "tasks" | "docs" | "sheets" | "calendar";

const priorityColors: Record<string, string> = {
  low: "text-blue-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const statusColors: Record<string, string> = {
  todo: "text-gray-500",
  in_progress: "text-blue-400",
  done: "text-green-400",
  cancelled: "text-gray-600",
};

const docTypeColors: Record<string, string> = {
  brief: "text-purple-400 bg-purple-500/10",
  report: "text-blue-400 bg-blue-500/10",
  strategy: "text-green-400 bg-green-500/10",
  analysis: "text-orange-400 bg-orange-500/10",
  other: "text-gray-400 bg-gray-500/10",
};

export default function HyperContext() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [docs, setDocs] = useState<Doc[]>(MOCK_DOCS);
  const [sheets, setSheets] = useState<Sheet[]>(MOCK_SHEETS);
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);

  const tabs = [
    { key: "tasks" as Tab, label: "Tasks", icon: CheckSquare, count: tasks.filter((t) => t.status !== "done").length },
    { key: "docs" as Tab, label: "Documents", icon: FileText, count: docs.length },
    { key: "sheets" as Tab, label: "Sheets", icon: Table, count: sheets.length },
    { key: "calendar" as Tab, label: "Calendar", icon: Calendar, count: events.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hyper-Context Integration</h1>
          <p className="text-gray-500 mt-1">Cross-module tasks, documents, sheets, and calendar events</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {tab.slice(0, -1)}
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {tabs.map((t) => (
          <button key={t.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`} onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-xs text-gray-600">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-800">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 cursor-pointer ${task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
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
            </div>
          ))}
        </div>
      )}

      {tab === "docs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map((doc) => (
            <div key={doc._id} className="card hover:border-gray-700 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${docTypeColors[doc.type]}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{doc.title}</p>
                    {doc.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{doc.type}</p>
                  {doc.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.content}</p>}
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                  {doc.campaignId && (
                    <Link to={`/campaigns/${doc.campaignId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1 mt-2">
                      View campaign <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "sheets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sheets.map((sheet) => (
            <div key={sheet._id} className="card hover:border-gray-700 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Table className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{sheet.title}</p>
                    {sheet.source === "external" && <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{sheet.type} · {sheet.rows} rows × {sheet.columns} cols</p>
                  {sheet.campaignId && (
                    <Link to={`/campaigns/${sheet.campaignId}`} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1 mt-2">
                      View campaign <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "calendar" && (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-800">
              <div className={`w-1 h-full min-h-[3rem] rounded-full flex-shrink-0 ${event.type === "review" ? "bg-purple-500" : event.type === "launch" ? "bg-green-500" : event.type === "meeting" ? "bg-blue-500" : event.type === "deadline" ? "bg-red-500" : event.type === "milestone" ? "bg-yellow-500" : "bg-gray-500"}`} />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
