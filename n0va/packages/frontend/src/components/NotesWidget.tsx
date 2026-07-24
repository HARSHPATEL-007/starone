import { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Clock, User } from "lucide-react";

interface Note {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

interface NotesWidgetProps {
  entityType: string;
  entityId: string;
  entityName: string;
}

function storageKey(entityType: string, entityId: string) {
  return `n0va_notes_${entityType}_${entityId}`;
}

export default function NotesWidget({ entityType, entityId, entityName }: NotesWidgetProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(() => {
    try {
      const u = localStorage.getItem("n0va_user");
      if (u) return JSON.parse(u).name || "User";
    } catch {}
    return "User";
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(entityType, entityId));
      if (saved) setNotes(JSON.parse(saved));
    } catch {}
  }, [entityType, entityId]);

  function persist(updated: Note[]) {
    setNotes(updated);
    localStorage.setItem(storageKey(entityType, entityId), JSON.stringify(updated));
  }

  function addNote() {
    if (!text.trim()) return;
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      author: author || "User",
      timestamp: new Date().toISOString(),
    };
    persist([note, ...notes]);
    setText("");
  }

  function deleteNote(id: string) {
    persist(notes.filter((n) => n.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <textarea
            className="input pr-10 resize-none h-20 text-sm"
            placeholder={`Add a note about "${entityName}"...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="btn-primary self-end h-10" onClick={addNote} disabled={!text.trim()}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No notes yet. Add the first note above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="group flex items-start gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
              <div className="w-7 h-7 bg-n0va-600/20 rounded-full flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-n0va-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white">{note.author}</span>
                  <span className="text-[10px] text-gray-600 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(note.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.text}</p>
              </div>
              <button className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" onClick={() => deleteNote(note.id)} title="Delete note">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
