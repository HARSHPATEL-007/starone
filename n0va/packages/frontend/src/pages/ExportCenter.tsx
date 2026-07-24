import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, FileJson, CheckSquare, Square, ChevronDown, ChevronUp, Loader, Search, ExternalLink, Database } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

interface EntityDef {
  key: string;
  label: string;
  icon: string;
  listFn: () => Promise<any>;
  fields: { key: string; label: string }[];
}

const ENTITIES: EntityDef[] = [
  {
    key: "campaigns", label: "Campaigns", icon: "📢",
    listFn: () => api.campaigns.list().then((r: any) => (Array.isArray(r) ? r : r.campaigns || [])),
    fields: [
      { key: "name", label: "Name" }, { key: "status", label: "Status" },
      { key: "type", label: "Type" }, { key: "goal", label: "Goal" },
      { key: "budget.daily", label: "Daily Budget" }, { key: "budget.lifetime", label: "Lifetime Budget" },
      { key: "budget.spent", label: "Spent" }, { key: "budget.remaining", label: "Remaining" },
      { key: "startDate", label: "Start Date" }, { key: "endDate", label: "End Date" },
      { key: "platforms", label: "Platforms" }, { key: "tags", label: "Tags" },
    ],
  },
  {
    key: "creatives", label: "Creatives", icon: "🎨",
    listFn: () => api.creatives.list().then((r: any) => (Array.isArray(r) ? r : r.creatives || [])),
    fields: [
      { key: "name", label: "Name" }, { key: "type", label: "Type" },
      { key: "status", label: "Status" }, { key: "headline", label: "Headline" },
      { key: "body", label: "Body" }, { key: "cta", label: "CTA" },
      { key: "assetUrl", label: "Asset URL" }, { key: "tags", label: "Tags" },
    ],
  },
  {
    key: "audiences", label: "Audiences", icon: "👥",
    listFn: () => api.audiences.list().then((r: any) => (Array.isArray(r) ? r : r.audiences || [])),
    fields: [
      { key: "name", label: "Name" }, { key: "type", label: "Type" },
      { key: "status", label: "Status" }, { key: "description", label: "Description" },
      { key: "platform", label: "Platform" }, { key: "tags", label: "Tags" },
    ],
  },
  {
    key: "agents", label: "AI Agents", icon: "🤖",
    listFn: () => api.agents.list(),
    fields: [
      { key: "name", label: "Name" }, { key: "type", label: "Type" },
      { key: "status", label: "Status" }, { key: "schedule", label: "Schedule" },
      { key: "hitlThreshold", label: "HITL Threshold" },
    ],
  },
  {
    key: "recipes", label: "Recipes", icon: "📋",
    listFn: () => api.recipes.list(),
    fields: [
      { key: "name", label: "Name" }, { key: "status", label: "Status" },
      { key: "description", label: "Description" }, { key: "trigger", label: "Trigger" },
    ],
  },
];

function flatten(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) Object.assign(result, flatten(v, key));
    else result[key] = Array.isArray(v) ? v.join("; ") : v ?? "";
  }
  return result;
}

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => {
      const val = String(row[h] ?? "");
      return val.includes(",") || val.includes('"') || val.includes("\n") ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: Record<string, any>[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.json`; a.click();
  URL.revokeObjectURL(url);
}

export default function ExportCenter() {
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set(ENTITIES.map((e) => e.key)));
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const results: Record<string, any[]> = {};
    await Promise.all(ENTITIES.map(async (entity) => {
      try { results[entity.key] = await entity.listFn(); }
      catch { results[entity.key] = []; }
    }));
    setData(results);
    setLoading(false);
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleExport() {
    const toExport = ENTITIES.filter((e) => selected.has(e.key));
    if (toExport.length === 0) { addToast("error", "Select at least one entity to export"); return; }
    setExporting(true);
    setTimeout(() => {
      for (const entity of toExport) {
        const items = data[entity.key] || [];
        if (items.length === 0) continue;
        const flat = items.map((item) => flatten(item));
        const timestamp = new Date().toISOString().split("T")[0];
        if (format === "csv") downloadCSV(flat, `n0va_${entity.key}_${timestamp}`);
        else downloadJSON(flat, `n0va_${entity.key}_${timestamp}`);
      }
      addToast("success", `Exported ${toExport.length} entit${toExport.length === 1 ? "y" : "ies"} as ${format.toUpperCase()}`);
      setExporting(false);
    }, 300);
  }

  const totalItems = ENTITIES.reduce((s, e) => s + (data[e.key]?.length || 0), 0);
  const selectedCount = ENTITIES.filter((e) => selected.has(e.key)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Download className="w-6 h-6 text-n0va-400" />
            Export Center
          </h1>
          <p className="text-gray-400 mt-1">Export your data as CSV or JSON</p>
        </div>
        <button onClick={loadData} disabled={loading} className="btn-ghost text-sm flex items-center gap-1.5">
          <Loader className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-white">{totalItems}</p>
          <p className="text-xs text-gray-500">Total Records</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-n0va-400">{ENTITIES.length}</p>
          <p className="text-xs text-gray-500">Entity Types</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-white">{selectedCount}</p>
          <p className="text-xs text-gray-500">Selected</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-white uppercase text-xs">{format}</p>
          <p className="text-xs text-gray-500">Export Format</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><Loader className="w-6 h-6 animate-spin text-n0va-400" /></div>
      ) : (
        <div className="space-y-4">
          {/* Format selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Format:</span>
            <button onClick={() => setFormat("csv")} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${format === "csv" ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-800 text-gray-400 hover:border-gray-700"}`}>
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => setFormat("json")} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${format === "json" ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-800 text-gray-400 hover:border-gray-700"}`}>
              <FileJson className="w-4 h-4" /> JSON
            </button>
          </div>

          {/* Entity cards */}
          {ENTITIES.map((entity) => {
            const items = data[entity.key] || [];
            const isSelected = selected.has(entity.key);
            const isExpanded = expanded.has(entity.key);
            return (
              <div key={entity.key} className={`card p-5 ${isSelected ? "border-n0va-500/30" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => toggle(entity.key)} className="shrink-0">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-n0va-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{entity.icon}</span>
                        <span className="text-sm font-medium text-white">{entity.label}</span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{items.length} records</span>
                      </div>
                      {isSelected && items.length > 0 && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {entity.fields.length} fields · {items.length} rows · ~{Math.round(JSON.stringify(items[0]).length * items.length / 1024)} KB estimated
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {items.length > 0 && (
                      <button onClick={() => toggleExpanded(entity.key)} className="text-gray-500 hover:text-gray-300 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {isExpanded && items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">Preview (first 3 rows):</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-800">
                            {entity.fields.map((f) => <th key={f.key} className="text-left text-gray-500 font-medium py-1.5 pr-3 whitespace-nowrap">{f.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {items.slice(0, 3).map((item: any, i: number) => {
                            const flat = flatten(item);
                            return (
                              <tr key={i} className="border-b border-gray-800/50">
                                {entity.fields.map((f) => (
                                  <td key={f.key} className="py-1.5 pr-3 text-gray-400 truncate max-w-[150px]">
                                    {String(flat[f.key] ?? flat[f.key.replace(/\./g, ".")] ?? "") || <span className="text-gray-700">—</span>}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {items.length === 0 && (
                  <p className="text-xs text-gray-600 mt-1 ml-9">No records found</p>
                )}
              </div>
            );
          })}

          {/* Export button */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleExport} disabled={exporting || selectedCount === 0 || loading} className="btn-primary flex items-center gap-2">
              {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting..." : `Export ${selectedCount} entit${selectedCount === 1 ? "y" : "ies"} as ${format.toUpperCase()}`}
            </button>
            <button onClick={() => setSelected(new Set(ENTITIES.map((e) => e.key)))} className="btn-ghost text-sm">Select All</button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-sm">Deselect All</button>
          </div>
        </div>
      )}
    </div>
  );
}
