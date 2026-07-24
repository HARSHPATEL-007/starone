import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Megaphone, Palette, Users, Bot, FileJson, X, Target, Sparkles } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "New Campaign", route: "/campaigns/new", icon: Megaphone, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "New Creative", route: "/creatives/new", icon: Palette, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "New Audience", route: "/audiences/new", icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
  { label: "New Agent", route: "/agents/new", icon: Bot, color: "text-n0va-400", bg: "bg-n0va-500/10" },
  { label: "New Recipe", route: "/recipes/new", icon: FileJson, color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleAction(route: string) {
    setOpen(false);
    navigate(route);
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 mb-2 space-y-1.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.route}
                  onClick={() => handleAction(action.route)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-n0va-500/50 shadow-xl hover:bg-gray-800 transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <span className="text-sm text-gray-200 font-medium whitespace-nowrap group-hover:text-white transition-colors">{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-n0va-600 hover:bg-n0va-500 text-white shadow-lg hover:shadow-n0va-600/30 transition-all flex items-center justify-center"
        title="Quick actions"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
