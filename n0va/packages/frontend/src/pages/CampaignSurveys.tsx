import { useState, useEffect } from "react";
import { ClipboardList, Plus, X, Edit3, Trash2, Copy, Search, CheckCircle, Circle, Users, Eye, Calendar, Star, ThumbsUp, MessageSquare, BarChart3 } from "lucide-react";
import { useToast } from "../components/Toast";

type QuestionType = "rating" | "yesno" | "multiple_choice" | "text" | "likert";

interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  campaignName: string;
  questions: SurveyQuestion[];
  responses: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "n0va_surveys";

const QT_META: Record<string, { label: string; icon: any }> = {
  rating: { label: "Rating (1-5)", icon: Star },
  yesno: { label: "Yes/No", icon: CheckCircle },
  multiple_choice: { label: "Multiple Choice", icon: Circle },
  text: { label: "Open Text", icon: MessageSquare },
  likert: { label: "Likert Scale", icon: BarChart3 },
};

const QUESTION_TYPES: QuestionType[] = ["rating", "yesno", "multiple_choice", "text", "likert"];

const DEFAULT_SURVEYS: Survey[] = [
  { id: "sv-1", title: "Campaign Feedback Survey", description: "Post-campaign satisfaction survey for stakeholders", campaignName: "Product Launch Q3", questions: [
    { id: "sq-1", type: "rating", question: "How would you rate the campaign's overall performance?", options: [] },
    { id: "sq-2", type: "yesno", question: "Did the campaign meet its stated objectives?", options: [] },
    { id: "sq-3", type: "multiple_choice", question: "Which channel performed best?", options: ["Google Ads", "LinkedIn", "Email", "YouTube"] },
    { id: "sq-4", type: "text", question: "What would you improve for the next campaign?", options: [] },
  ], responses: 24, isActive: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "sv-2", title: "Customer Satisfaction Survey", description: "Measure customer satisfaction with our marketing communications", campaignName: "Brand Awareness", questions: [
    { id: "sq-5", type: "likert", question: "Our marketing content is relevant to my needs", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
    { id: "sq-6", type: "rating", question: "How relevant is our advertising to you?", options: [] },
    { id: "sq-7", type: "text", question: "What topics would you like to see more of?", options: [] },
  ], responses: 156, isActive: true, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "sv-3", title: "Channel Preference Poll", description: "Understand which channels our audience prefers", campaignName: "Market Research", questions: [
    { id: "sq-8", type: "multiple_choice", question: "Which social platform do you use most?", options: ["Instagram", "TikTok", "LinkedIn", "YouTube", "Facebook", "Twitter/X"] },
    { id: "sq-9", type: "multiple_choice", question: "How did you hear about us?", options: ["Social Media", "Search Engine", "Friend/Referral", "Email", "Advertisement", "Blog/Article"] },
    { id: "sq-10", type: "text", question: "Any other feedback?", options: [] },
  ], responses: 89, isActive: false, createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

function load(): Survey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SURVEYS));
    return DEFAULT_SURVEYS;
  } catch { return []; }
}

export default function CampaignSurveys() {
  const { addToast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; campaignName: string; questions: SurveyQuestion[]; isActive: boolean }>({ title: "", description: "", campaignName: "", questions: [], isActive: true });

  useEffect(() => { setSurveys(load()); }, []);

  function persist(updated: Survey[]) {
    setSurveys(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm(s?: Survey) {
    if (s) setForm({ title: s.title, description: s.description, campaignName: s.campaignName, questions: s.questions.map(q => ({ ...q, options: [...q.options] })), isActive: s.isActive });
    else setForm({ title: "", description: "", campaignName: "", questions: [], isActive: true });
  }

  function addQuestion() {
    setForm(f => ({ ...f, questions: [...f.questions, { id: Date.now().toString(36), type: "text" as QuestionType, question: "", options: [] }] }));
  }

  function updateQuestion(id: string, field: keyof SurveyQuestion, value: any) {
    setForm(f => ({ ...f, questions: f.questions.map(q => q.id === id ? { ...q, [field]: value } : q) }));
  }

  function removeQuestion(id: string) {
    setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== id) }));
  }

  function addOption(qId: string) {
    setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qId ? { ...q, options: [...q.options, ""] } : q) }));
  }

  function updateOption(qId: string, idx: number, value: string) {
    setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qId ? { ...q, options: q.options.map((o, i) => i === idx ? value : o) } : q) }));
  }

  function removeOption(qId: string, idx: number) {
    setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qId ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q) }));
  }

  function handleSave() {
    if (!form.title.trim()) { addToast("error", "Survey title required"); return; }
    if (form.questions.filter(q => q.question.trim()).length === 0) { addToast("error", "Add at least one question"); return; }
    const validQuestions = form.questions.filter(q => q.question.trim()).map(q => ({ ...q, question: q.question.trim(), options: q.options.filter(o => o.trim()).map(o => o.trim()) }));
    const now = new Date().toISOString();
    const survey: Survey = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: form.title.trim(), description: form.description.trim(), campaignName: form.campaignName.trim(),
      questions: validQuestions, responses: editingId ? surveys.find(s => s.id === editingId)!.responses : 0,
      isActive: form.isActive, createdAt: editingId ? surveys.find(s => s.id === editingId)!.createdAt : now, updatedAt: now,
    };
    let updated: Survey[];
    if (editingId) { updated = surveys.map(s => s.id === editingId ? survey : s); addToast("success", "Survey updated"); }
    else { updated = [survey, ...surveys]; addToast("success", "Survey created"); }
    persist(updated);
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const name = surveys.find(s => s.id === id)?.title;
    persist(surveys.filter(s => s.id !== id));
    addToast("success", `"${name}" deleted`);
  }

  function duplicateSurvey(id: string) {
    const s = surveys.find(sv => sv.id === id);
    if (!s) return;
    const copy: Survey = { ...s, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: `${s.title} (Copy)`, responses: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), questions: s.questions.map(q => ({ ...q, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4) })) };
    persist([copy, ...surveys]);
    addToast("success", "Survey duplicated");
  }

  function toggleActive(id: string) {
    persist(surveys.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }

  const filtered = surveys.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || s.campaignName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-n0va-400" />
            Campaign Surveys
          </h1>
          <p className="text-gray-400 mt-1">{surveys.length} surveys · {surveys.reduce((s, sv) => s + sv.responses, 0).toLocaleString()} total responses</p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> New Survey</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input className="input pl-10 pr-4 py-2 text-sm w-full" placeholder="Search surveys..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{editingId ? "Edit Survey" : "New Survey"}</h3><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Survey Title</label><input className="input" placeholder="e.g. Campaign Feedback" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
                <div><label className="label">Campaign</label><input className="input" placeholder="Related campaign" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Purpose of this survey..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <label className="label mb-0">Active</label>
                <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`text-xs px-3 py-1.5 rounded border ${form.isActive ? "border-green-500 bg-green-500/10 text-green-400" : "border-gray-700 bg-gray-800 text-gray-500"}`}>{form.isActive ? "Active" : "Inactive"}</button>
              </div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">Questions</label><button type="button" onClick={addQuestion} className="text-xs text-n0va-400 hover:text-n0va-300">+ Add Question</button></div>
                {form.questions.length === 0 && <p className="text-xs text-gray-600 py-2">No questions yet. Add your first question.</p>}
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="bg-n0va-900 rounded-lg p-3 mb-2 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600 font-mono">Q{idx + 1}</span>
                      <select className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-1 border border-gray-700" value={q.type} onChange={e => updateQuestion(q.id, "type", e.target.value as QuestionType)}>
                        {QUESTION_TYPES.map(t => <option key={t} value={t}>{QT_META[t].label}</option>)}
                      </select>
                      <div className="flex-1" />
                      <button type="button" onClick={() => removeQuestion(q.id)} className="p-1 text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                    <input className="input text-xs py-1.5 w-full" placeholder="Enter your question" value={q.question} onChange={e => updateQuestion(q.id, "question", e.target.value)} />
                    {(q.type === "multiple_choice" || q.type === "likert") && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] text-gray-600">Options</span>
                          {q.type === "multiple_choice" && <button type="button" onClick={() => addOption(q.id)} className="text-[10px] text-n0va-400">+ Add</button>}
                        </div>
                        {q.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-1 mb-1">
                            <input className="input text-[11px] py-1 flex-1" placeholder={`Option ${oi + 1}`} value={o} onChange={e => updateOption(q.id, oi, e.target.value)} />
                            {q.type === "multiple_choice" && <button type="button" onClick={() => removeOption(q.id, oi)} className="p-0.5 text-gray-600 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? "Save Changes" : "Create Survey"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <ClipboardList className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No surveys yet</h3>
          <p className="text-sm text-gray-500">{search ? "Try different search terms" : "Create surveys to gather campaign feedback."}</p>
          {!search && <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm mt-4"><Plus className="w-4 h-4 inline mr-1.5" /> Create Survey</button>}
        </div>
      )}

      {/* Survey cards */}
      {filtered.map(sv => (
        <div key={sv.id} className="card p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${sv.isActive ? "bg-green-500/10" : "bg-gray-800"}`}><ClipboardList className={`w-5 h-5 ${sv.isActive ? "text-green-400" : "text-gray-500"}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">{sv.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${sv.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>{sv.isActive ? "Active" : "Inactive"}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{sv.description}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{sv.questions.length} questions</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sv.responses} responses</span>
                {sv.campaignName && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{sv.campaignName}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {sv.questions.map(q => {
                  const qm = QT_META[q.type];
                  const QI = qm?.icon || MessageSquare;
                  return <span key={q.id} className="flex items-center gap-1 text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded"><QI className="w-2.5 h-2.5" />{q.question.slice(0, 40)}{q.question.length > 40 ? "..." : ""}</span>;
                })}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => toggleActive(sv.id)} className="p-1.5 text-gray-600 hover:text-yellow-400"><CheckCircle className="w-3.5 h-3.5" /></button>
              <button onClick={() => duplicateSurvey(sv.id)} className="p-1.5 text-gray-600 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => { resetForm(sv); setEditingId(sv.id); setShowForm(true); }} className="p-1.5 text-gray-600 hover:text-gray-300"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(sv.id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
