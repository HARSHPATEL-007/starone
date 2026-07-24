import { useState, useEffect } from "react";
import { FileInput, Plus, X, Edit3, Trash2, Copy, Search, Users, Eye, MousePointerClick, GripVertical, AlignLeft, Hash, CheckSquare, Circle, ListOrdered, Mail, Phone, Calendar, Globe, Upload } from "lucide-react";
import { useToast } from "../components/Toast";

type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "radio" | "number" | "date" | "file";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

interface MarketingForm {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_forms";

const FIELD_TYPES: { value: FieldType; label: string; icon: any }[] = [
  { value: "text", label: "Text", icon: AlignLeft },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "textarea", label: "Textarea", icon: AlignLeft },
  { value: "select", label: "Select", icon: ListOrdered },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio", icon: Circle },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "file", label: "File Upload", icon: Upload },
];

const FIELD_ICONS: Record<string, any> = {
  text: AlignLeft, email: Mail, phone: Phone, textarea: AlignLeft,
  select: ListOrdered, checkbox: CheckSquare, radio: Circle,
  number: Hash, date: Calendar, file: Upload,
};

const DEFAULT_FORMS: MarketingForm[] = [
  {
    id: "fm-1", name: "Newsletter Signup", description: "Simple email capture for weekly newsletter",
    fields: [
      { id: "ff-1", type: "text", label: "Full Name", placeholder: "John Doe", required: true, options: [] },
      { id: "ff-2", type: "email", label: "Email Address", placeholder: "john@example.com", required: true, options: [] },
      { id: "ff-3", type: "checkbox", label: "Marketing Consent", placeholder: "", required: true, options: ["I agree to receive marketing emails"] },
    ],
    submissionCount: 1240, isActive: true, createdAt: new Date(Date.now() - 86400000 * 45).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "fm-2", name: "Demo Request Form", description: "Enterprise demo booking form with qualification",
    fields: [
      { id: "ff-4", type: "text", label: "Full Name", placeholder: "John Doe", required: true, options: [] },
      { id: "ff-5", type: "email", label: "Work Email", placeholder: "john@company.com", required: true, options: [] },
      { id: "ff-6", type: "phone", label: "Phone Number", placeholder: "+1 555-0000", required: false, options: [] },
      { id: "ff-7", type: "text", label: "Company Name", placeholder: "Acme Inc.", required: true, options: [] },
      { id: "ff-8", type: "select", label: "Company Size", placeholder: "", required: true, options: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
      { id: "ff-9", type: "textarea", label: "Message", placeholder: "Tell us about your needs...", required: false, options: [] },
    ],
    submissionCount: 456, isActive: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "fm-3", name: "Event Registration", description: "Webinar registration form with session selection",
    fields: [
      { id: "ff-10", type: "text", label: "Name", placeholder: "Your name", required: true, options: [] },
      { id: "ff-11", type: "email", label: "Email", placeholder: "your@email.com", required: true, options: [] },
      { id: "ff-12", type: "radio", label: "Session", placeholder: "", required: true, options: ["Morning (10AM EST)", "Afternoon (2PM EST)", "Evening (6PM EST)"] },
    ],
    submissionCount: 892, isActive: false, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

function load(): MarketingForm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FORMS));
    return DEFAULT_FORMS;
  } catch { return []; }
}

export default function MarketingForms() {
  const { addToast } = useToast();
  const [forms, setForms] = useState<MarketingForm[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; fields: FormField[]; isActive: boolean }>({ name: "", description: "", fields: [], isActive: true });

  useEffect(() => { setForms(load()); }, []);

  function persist(updated: MarketingForm[]) {
    setForms(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(f?: MarketingForm) {
    if (f) setForm({ name: f.name, description: f.description, fields: f.fields.map(fld => ({ ...fld, options: [...fld.options] })), isActive: f.isActive });
    else setForm({ name: "", description: "", fields: [], isActive: true });
  }

  function addField() {
    setForm(f => ({ ...f, fields: [...f.fields, { id: Date.now().toString(36), type: "text" as FieldType, label: "", placeholder: "", required: false, options: [] }] }));
  }

  function updateField(id: string, field: keyof FormField, value: any) {
    setForm(f => ({ ...f, fields: f.fields.map(fld => fld.id === id ? { ...fld, [field]: value } : fld) }));
  }

  function removeField(id: string) {
    setForm(f => ({ ...f, fields: f.fields.filter(fld => fld.id !== id) }));
  }

  function moveField(from: number, to: number) {
    if (to < 0 || to >= form.fields.length) return;
    setForm(f => { const arr = [...f.fields]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); return { ...f, fields: arr }; });
  }

  function addOption(fieldId: string) {
    setForm(f => ({ ...f, fields: f.fields.map(fld => fld.id === fieldId ? { ...fld, options: [...fld.options, ""] } : fld) }));
  }

  function updateOption(fieldId: string, optIdx: number, value: string) {
    setForm(f => ({ ...f, fields: f.fields.map(fld => fld.id === fieldId ? { ...fld, options: fld.options.map((o, i) => i === optIdx ? value : o) } : fld) }));
  }

  function removeOption(fieldId: string, optIdx: number) {
    setForm(f => ({ ...f, fields: f.fields.map(fld => fld.id === fieldId ? { ...fld, options: fld.options.filter((_, i) => i !== optIdx) } : fld) }));
  }

  function handleSave() {
    if (!form.name.trim()) { addToast("error", "Form name is required"); return; }
    if (form.fields.filter(f => f.label.trim()).length === 0) { addToast("error", "Add at least one field with a label"); return; }
    const validFields = form.fields.filter(f => f.label.trim()).map(f => ({ ...f, label: f.label.trim(), options: f.options.filter(o => o.trim()).map(o => o.trim()) }));
    const now = new Date().toISOString();
    const mf: MarketingForm = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name.trim(), description: form.description.trim(), fields: validFields,
      submissionCount: editingId ? forms.find(fm => fm.id === editingId)!.submissionCount : 0,
      isActive: form.isActive,
      createdAt: editingId ? forms.find(fm => fm.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: MarketingForm[];
    if (editingId) { updated = forms.map(fm => fm.id === editingId ? mf : fm); addToast("success", "Form updated"); }
    else { updated = [mf, ...forms]; addToast("success", "Form created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = forms.find(f => f.id === id)?.name;
    persist(forms.filter(f => f.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function duplicateForm(id: string) {
    const f = forms.find(fm => fm.id === id);
    if (!f) return;
    const copy: MarketingForm = { ...f, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: `${f.name} (Copy)`, submissionCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), fields: f.fields.map(fld => ({ ...fld, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4) })) };
    persist([copy, ...forms]);
    addToast("success", "Form duplicated");
  }

  function toggleActive(id: string) {
    persist(forms.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f));
    const f = forms.find(fm => fm.id === id);
    addToast("success", `"${f?.name}" ${f?.isActive ? "deactivated" : "activated"}`);
  }

  const filtered = forms.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()));

  const previewForm = previewId ? forms.find(f => f.id === previewId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileInput className="w-6 h-6 text-n0va-400" />
            Marketing Forms
          </h1>
          <p className="text-gray-400 mt-1">{forms.length} forms · {forms.reduce((s, f) => s + f.submissionCount, 0).toLocaleString()} total submissions</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Form</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Form" : "New Form"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Form Name</label><input className="input" placeholder="e.g. Newsletter Signup" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="label">Status</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, isActive: true })} className={`text-xs px-3 py-1.5 rounded border ${form.isActive ? "border-green-500 bg-green-500/10 text-green-400" : "border-gray-700 bg-gray-800 text-gray-500"}`}>Active</button>
                    <button type="button" onClick={() => setForm({ ...form, isActive: false })} className={`text-xs px-3 py-1.5 rounded border ${!form.isActive ? "border-gray-600 bg-gray-800 text-gray-300" : "border-gray-700 bg-gray-800 text-gray-500"}`}>Inactive</button>
                  </div>
                </div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="What's this form for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

              {/* Fields */}
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Fields</label><button type="button" onClick={addField} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Field</button></div>
                {form.fields.length === 0 && <p className="text-xs text-gray-600 py-2">No fields yet. Add your first form field.</p>}
                {form.fields.map((fld, idx) => {
                  const FI = FIELD_ICONS[fld.type] || AlignLeft;
                  return (
                    <div key={fld.id} className="card p-3 mb-2 bg-n0va-900">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600 font-mono">{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveField(idx, idx - 1)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30"><Plus className="w-3 h-3 rotate-90" /></button>
                          <button type="button" onClick={() => moveField(idx, idx + 1)} disabled={idx === form.fields.length - 1} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30"><Plus className="w-3 h-3 -rotate-90" /></button>
                        </div>
                        <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700" value={fld.type} onChange={e => updateField(fld.id, "type", e.target.value as FieldType)}>
                          {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                        </select>
                        <div className="flex-1" />
                        <button type="button" onClick={() => setForm({ ...form, fields: form.fields.map(ff => ff.id === fld.id ? { ...ff, required: !ff.required } : ff) })} className={`text-[10px] px-1.5 py-0.5 rounded ${fld.required ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-600"}`}>Required</button>
                        <button type="button" onClick={() => removeField(fld.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input text-xs py-1.5" placeholder="Field label" value={fld.label} onChange={e => updateField(fld.id, "label", e.target.value)} />
                        <input className="input text-xs py-1.5" placeholder="Placeholder" value={fld.placeholder} onChange={e => updateField(fld.id, "placeholder", e.target.value)} />
                      </div>
                      {(fld.type === "select" || fld.type === "radio" || fld.type === "checkbox") && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] text-gray-600">Options</span>
                            <button type="button" onClick={() => addOption(fld.id)} className="text-[10px] text-n0va-400 hover:text-n0va-300">+ Add</button>
                          </div>
                          {fld.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1 mb-1">
                              <input className="input text-[11px] py-1 flex-1" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateOption(fld.id, oi, e.target.value)} />
                              <button type="button" onClick={() => removeOption(fld.id, oi)} className="p-0.5 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Form"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewId(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6" onClick={e => e.stopPropagation()} style={{ color: "#111" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{previewForm.name}</h3>
              <button onClick={() => setPreviewId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{previewForm.description}</p>
            <div className="space-y-4">
              {previewForm.fields.map(fld => {
                const FI = FIELD_ICONS[fld.type] || AlignLeft;
                return (
                  <div key={fld.id}>
                    <label className="block text-sm font-medium mb-1">{fld.label}{fld.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                    {fld.type === "textarea" ? <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder={fld.placeholder} />
                    : fld.type === "select" ? <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>{fld.placeholder || "Select..."}</option>{fld.options.map((o, i) => <option key={i}>{o}</option>)}</select>
                    : fld.type === "checkbox" ? <div className="space-y-1">{fld.options.map((o, i) => <label key={i} className="flex items-center gap-2 text-sm"><input type="checkbox" className="rounded" />{o}</label>)}</div>
                    : fld.type === "radio" ? <div className="space-y-1">{fld.options.map((o, i) => <label key={i} className="flex items-center gap-2 text-sm"><input type="radio" name={fld.id} className="rounded-full" />{o}</label>)}</div>
                    : fld.type === "file" ? <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500"><Upload className="w-6 h-6 mx-auto mb-1" />Click to upload</div>
                    : <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" type={fld.type === "number" ? "number" : fld.type} placeholder={fld.placeholder} />}
                  </div>
                );
              })}
              <button className="w-full bg-n0va-600 text-white rounded-lg py-2.5 text-sm font-medium">{previewForm.isActive ? "Submit" : "Form Inactive"}</button>
            </div>
            <p className="text-[10px] text-gray-400 mt-4 text-center">{previewForm.fields.length} fields · {previewForm.submissionCount.toLocaleString()} submissions</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <FileInput className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No forms found</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Build lead generation forms for your campaigns."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Form</button>}
        </div>
      )}

      {/* Form cards */}
      {filtered.map(fm => (
        <div key={fm.id} className="card p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${fm.isActive ? "bg-green-500/10" : "bg-gray-800"}`}>
              <FileInput className={`w-5 h-5 ${fm.isActive ? "text-green-400" : "text-gray-500"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">{fm.name}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${fm.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>{fm.isActive ? "Active" : "Inactive"}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{fm.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                <span>{fm.fields.length} field{fm.fields.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {fm.submissionCount.toLocaleString()} submissions</span>
                {fm.fields.filter(f => f.required).length > 0 && <span>{fm.fields.filter(f => f.required).length} required</span>}
                <span>Updated {new Date(fm.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {fm.fields.map(fld => {
                  const FI = FIELD_ICONS[fld.type] || AlignLeft;
                  return <span key={fld.id} className="flex items-center gap-1 text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"><FI className="w-2.5 h-2.5" />{fld.label}</span>;
                })}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => setPreviewId(fm.id)} className="p-1.5 text-gray-600 hover:text-gray-300" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleActive(fm.id)} className="p-1.5 text-gray-600 hover:text-yellow-400"><CheckSquare className="w-3.5 h-3.5" /></button>
              <button onClick={() => duplicateForm(fm.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => { resetForm(fm); setEditingId(fm.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(fm.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
