import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Megaphone, Palette, Users, Bot, FileJson, BarChart3, Shield, Layers, Activity, Settings } from "lucide-react";

interface SearchResult {
  type: "page" | "campaign" | "creative" | "audience" | "agent" | "recipe";
  label: string;
  subtitle?: string;
  route: string;
  icon: any;
}

const PAGE_ITEMS: SearchResult[] = [
  { type: "page", label: "Dashboard", route: "/", icon: BarChart3 },
  { type: "page", label: "Campaigns", route: "/campaigns", icon: Megaphone },
  { type: "page", label: "Creatives", route: "/creatives", icon: Palette },
  { type: "page", label: "Audiences", route: "/audiences", icon: Users },
  { type: "page", label: "AI Agents", route: "/agents", icon: Bot },
  { type: "page", label: "Analytics", route: "/analytics", icon: BarChart3 },
  { type: "page", label: "Recipes", route: "/recipes", icon: FileJson },
  { type: "page", label: "War Room", route: "/war-room", icon: Shield },
  { type: "page", label: "Attribution", route: "/attribution", icon: BarChart3 },
  { type: "page", label: "Forecast", route: "/forecast", icon: BarChart3 },
  { type: "page", label: "A/B Testing", route: "/creative-ab-test", icon: Palette },
  { type: "page", label: "Overlap Analysis", route: "/audience-overlap", icon: Users },
  { type: "page", label: "Fraud Center", route: "/fraud-evaluation", icon: Shield },
  { type: "page", label: "Budget Strategy", route: "/budget-strategy", icon: BarChart3 },
  { type: "page", label: "Activity Feed", route: "/activity", icon: Activity },
  { type: "page", label: "Notifications", route: "/notifications", icon: Activity },
  { type: "page", label: "Hyper-Context", route: "/hyper-context", icon: Layers },
  { type: "page", label: "Settings", route: "/settings", icon: Settings },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>(PAGE_ITEMS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(PAGE_ITEMS);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      PAGE_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
      )
    );
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.route);
    },
    [navigate, onClose]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, campaigns, creatives..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
          />
          <kbd className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">No results for "{query}"</div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.type}-${result.label}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  i === selectedIndex ? "bg-n0va-600/20 text-n0va-400" : "text-gray-300 hover:bg-gray-800"
                }`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <result.icon className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{result.label}</span>
                  {result.subtitle && <span className="text-gray-500 ml-2 text-xs">{result.subtitle}</span>}
                </div>
                <span className="text-xs text-gray-600 capitalize">{result.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
