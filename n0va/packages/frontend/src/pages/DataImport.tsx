import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, FileJson, Download, Check, AlertCircle, Loader, Table, ArrowRight, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

type EntityType = "audiences" | "creatives";

interface ColumnMap {
  csvField: string;
  entityField: string;
}

const ENTITY_FIELDS: Record<EntityType, { key: string; label: string; required: boolean; default?: string }[]> = {
  audiences: [
    { key: "name", label: "Name", required: true },
    { key: "description", label: "Description", required: false },
    { key: "type", label: "Type", required: false, default: "custom" },
    { key: "platform", label: "Platform", required: false, default: "all" },
    { key: "tags", label: "Tags (comma-separated)", required: false },
  ],
  creatives: [
    { key: "name", label: "Name", required: true },
    { key: "type", label: "Type", required: false, default: "image" },
    { key: "headline", label: "Headline", required: true },
    { key: "body", label: "Body", required: false },
    { key: "cta", label: "CTA", required: false, default: "Learn More" },
    { key: "assetUrl", label: "Asset URL", required: false },
    { key: "tags", label: "Tags (comma-separated)", required: false },
  ],
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; }
      else current += ch;
    }
    vals.push(current.trim());
    return vals;
  }).filter((r) => r.some((v) => v));
  return { headers, rows };
}

function parseJSON(text: string): { headers: string[]; rows: string[][] } {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.audiences || data.creatives || data.items || [];
    if (!Array.isArray(arr) || arr.length === 0) return { headers: [], rows: [] };
    const headers = Object.keys(arr[0]);
    const rows = arr.map((item) => headers.map((h) => String(item[h] ?? "")));
    return { headers, rows };
  } catch { return { headers: [], rows: [] }; }
}

export default function DataImport() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entityType, setEntityType] = useState<EntityType>("audiences");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, done: 0, errors: 0 });
  const [results, setResults] = useState<{ success: number; errors: { row: number; msg: string }[] } | null>(null);

  const fields = ENTITY_FIELDS[entityType];

  function handleFile(f: File) {
    setFile(f);
    setResults(null);
    setProgress({ total: 0, done: 0, errors: 0 });
    const ext = f.name.endsWith(".json") ? "json" : "csv";
    setFormat(ext);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = ext === "json" ? parseJSON(text) : parseCSV(text);
      if (parsed.headers.length === 0) { addToast("error", "No data found in file"); return; }
      if (parsed.rows.length === 0) { addToast("error", "No data rows found"); return; }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setColumnMap(
        parsed.headers.map((h) => {
          const match = fields.find((f) => f.key.toLowerCase() === h.toLowerCase() || f.label.toLowerCase() === h.toLowerCase());
          return { csvField: h, entityField: match?.key || "" };
        })
      );
    };
    reader.readAsText(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function updateMap(csvField: string, entityField: string) {
    setColumnMap((prev) => prev.map((m) => m.csvField === csvField ? { ...m, entityField } : m));
  }

  function buildPayload(row: string[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const m of columnMap) {
      if (!m.entityField) continue;
      const idx = headers.indexOf(m.csvField);
      if (idx === -1) continue;
      const val = row[idx]?.trim() || "";
      if (val) payload[m.entityField] = m.entityField === "tags" ? val.split(",").map((t) => t.trim()).filter(Boolean) : val;
    }
    for (const f of fields) {
      if (!payload[f.key] && f.default) payload[f.key] = f.default;
    }
    return payload;
  }

  async function startImport() {
    const required = fields.filter((f) => f.required);
    const mapped = columnMap.filter((m) => m.entityField);
    const missing = required.filter((r) => !mapped.some((m) => m.entityField === r.key));
    if (missing.length > 0) { addToast("error", `Missing required fields: ${missing.map((m) => m.label).join(", ")}`); return; }

    setImporting(true);
    setProgress({ total: rows.length, done: 0, errors: 0 });
    const errs: { row: number; msg: string }[] = [];
    let done = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const payload = buildPayload(rows[i]);
        if (entityType === "audiences") await api.audiences.create(payload);
        else await api.creatives.create(payload);
        done++;
      } catch (e: any) {
        errs.push({ row: i + 1, msg: e.message || "Import failed" });
      }
      setProgress({ total: rows.length, done, errors: errs.length });
    }

    setImporting(false);
    setResults({ success: done, errors: errs });
    if (errs.length === 0) addToast("success", `Imported ${done} ${entityType} successfully`);
    else addToast("error", `Imported ${done} with ${errs.length} errors`);
  }

  function downloadTemplate() {
    const fieldNames = fields.map((f) => f.label);
    const sample = fields.map((f) => f.default || `Sample ${f.label}`);
    const csv = [fieldNames.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${entityType}_template.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Template downloaded");
  }

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Upload className="w-6 h-6 text-n0va-400" />
            Data Import
          </h1>
          <p className="text-gray-400 mt-1">Import audiences or creatives from CSV or JSON</p>
        </div>
      </div>

      {!results && (
        <div className="flex gap-2">
          {(["audiences", "creatives"] as EntityType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setEntityType(t); setFile(null); setHeaders([]); setRows([]); setColumnMap([]); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                entityType === t ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              {t === "audiences" ? "Audiences" : "Creatives"}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`card p-16 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed transition-colors ${
            dragging ? "border-n0va-500 bg-n0va-500/5" : "border-gray-800 hover:border-gray-700"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            {format === "json" ? <FileJson className="w-8 h-8 text-gray-500" /> : <FileSpreadsheet className="w-8 h-8 text-gray-500" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            {dragging ? "Drop file here" : "Upload a file"}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mb-4">
            Drag & drop a CSV or JSON file, or click to browse. {entityType === "audiences" ? "Audiences" : "Creatives"} will be created from the data.
          </p>
          <div className="flex items-center gap-3">
            <button className="btn-primary text-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Upload className="w-4 h-4 inline mr-1.5" /> Choose File
            </button>
            <button className="btn-ghost text-sm" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
              <Download className="w-4 h-4 inline mr-1.5" /> Download Template
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {importing && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Importing...</span>
                <span className="text-sm text-gray-400">{progress.done}/{progress.total} ({progress.errors} errors)</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-n0va-500 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium text-gray-300">{file?.name}</span>
              <span className="text-gray-600">({rows.length} rows, {headers.length} columns)</span>
            </div>
            <button onClick={() => { setRows([]); setHeaders([]); setColumnMap([]); setFile(null); setResults(null); }} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column Mapping */}
          <div className="card p-6 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Table className="w-4 h-4 text-n0va-400" /> Column Mapping</h2>
            <p className="text-xs text-gray-500">Map your file columns to entity fields. Required fields are marked.</p>
            <div className="space-y-2">
              {columnMap.map((m) => (
                <div key={m.csvField} className="flex items-center gap-3">
                  <div className="flex-1">
                    <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">{m.csvField}</code>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                  <select
                    className="input flex-1 text-sm"
                    value={m.entityField}
                    onChange={(e) => updateMap(m.csvField, e.target.value)}
                  >
                    <option value="">— Skip column —</option>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label} {f.required ? "*" : ""}{f.default ? ` (default: ${f.default})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="card p-6 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Table className="w-4 h-4 text-n0va-400" /> Preview ({previewRows.length} of {rows.length} rows)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 font-medium py-2 pr-4 text-xs">#</th>
                    {columnMap.map((m) => (
                      <th key={m.csvField} className="text-left text-gray-500 font-medium py-2 pr-4 text-xs whitespace-nowrap">
                        {m.entityField ? <span className="text-n0va-400">{m.entityField}</span> : <span className="text-gray-600">{m.csvField}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-600 text-xs">{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-2 pr-4 text-gray-300 max-w-[200px] truncate">{cell || <span className="text-gray-700">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={startImport} disabled={importing} className="btn-primary flex items-center gap-2">
              {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? `Importing ${progress.done}/${progress.total}...` : `Import ${rows.length} ${entityType}`}
            </button>
            <button onClick={() => { setRows([]); setHeaders([]); setColumnMap([]); setFile(null); }} disabled={importing} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <div className={`card p-6 ${results.errors.length > 0 ? "border-amber-500/30" : "border-emerald-500/30"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${results.errors.length > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                {results.errors.length > 0 ? <AlertCircle className="w-6 h-6 text-amber-400" /> : <Check className="w-6 h-6 text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {results.errors.length > 0 ? "Import completed with errors" : "Import completed successfully"}
                </h3>
                <p className="text-sm text-gray-400">
                  {results.success} of {rows.length} {entityType} imported successfully
                </p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Errors</p>
                {results.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-sm text-gray-400">Row {e.row}: {e.msg}</p>
                ))}
                {results.errors.length > 10 && <p className="text-sm text-gray-600">...and {results.errors.length - 10} more</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate(entityType === "audiences" ? "/audiences" : "/creatives")} className="btn-primary flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> View {entityType === "audiences" ? "Audiences" : "Creatives"}
            </button>
            <button onClick={() => { setRows([]); setHeaders([]); setColumnMap([]); setFile(null); setResults(null); }} className="btn-ghost">
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
