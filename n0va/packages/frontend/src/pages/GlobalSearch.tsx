import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Search, Megaphone, Palette, Users, Bot, FileJson, ArrowLeft, ExternalLink, Loader } from "lucide-react";
import { api } from "../api/client";

interface SearchGroup {
  type: string;
  icon: any;
  color: string;
  items: any[];
  route: string;
  labelKey: string;
  subKey: string;
}

const SEARCH_GROUPS: SearchGroup[] = [
  { type: "campaigns", icon: Megaphone, color: "text-n0va-400", items: [], route: "/campaigns", labelKey: "name", subKey: "type" },
  { type: "creatives", icon: Palette, color: "text-purple-400", items: [], route: "/creatives", labelKey: "name", subKey: "type" },
  { type: "audiences", icon: Users, color: "text-green-400", items: [], route: "/audiences", labelKey: "name", subKey: "type" },
  { type: "agents", icon: Bot, color: "text-blue-400", items: [], route: "/agents", labelKey: "name", subKey: "type" },
  { type: "recipes", icon: FileJson, color: "text-yellow-400", items: [], route: "/recipes", labelKey: "name", subKey: "trigger" },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [input, setInput] = useState(query);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[]>(SEARCH_GROUPS);

  useEffect(() => {
    setInput(query);
    if (!query.trim()) {
      setGroups(SEARCH_GROUPS.map((g) => ({ ...g, items: [] })));
      return;
    }
    setLoading(true);
    Promise.all([
      api.campaigns.list().then((r) => Array.isArray(r) ? r : r.campaigns || []).catch(() => []),
      api.creatives.list().catch(() => []),
      api.audiences.list().catch(() => []),
      api.agents.list().catch(() => []),
      api.recipes.list().catch(() => []),
    ]).then(([campaigns, creatives, audiences, agents, recipes]) => {
      const q = query.toLowerCase();
      setGroups([
        { ...SEARCH_GROUPS[0], items: (campaigns as any[]).filter((c) => (c.name || "").toLowerCase().includes(q) || (c.goal || "").toLowerCase().includes(q) || (c.tags || []).some((t: string) => t.toLowerCase().includes(q))) },
        { ...SEARCH_GROUPS[1], items: (creatives as any[]).filter((c) => (c.name || "").toLowerCase().includes(q) || (c.headline || "").toLowerCase().includes(q) || (c.tags || []).some((t: string) => t.toLowerCase().includes(q))) },
        { ...SEARCH_GROUPS[2], items: (audiences as any[]).filter((a) => (a.name || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) || (a.tags || []).some((t: string) => t.toLowerCase().includes(q))) },
        { ...SEARCH_GROUPS[3], items: (agents as any[]).filter((a) => (a.name || "").toLowerCase().includes(q) || (a.type || "").toLowerCase().includes(q)) },
        { ...SEARCH_GROUPS[4], items: (recipes as any[]).filter((r) => (r.name || "").toLowerCase().includes(q) || (r.trigger || "").toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)) },
      ]);
      setLoading(false);
    });
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
    }
  }

  const totalResults = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">Search</h1>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          className="input pl-12 pr-4 py-3.5 text-base"
          placeholder="Search campaigns, creatives, audiences, agents, recipes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>

      {query && !loading && (
        <p className="text-sm text-gray-500">
          {totalResults} result{totalResults !== 1 ? "s" : ""} for "<span className="text-gray-300">{query}</span>"
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 text-n0va-400 animate-spin" />
        </div>
      ) : query ? (
        <div className="space-y-8">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            const Icon = group.icon;
            return (
              <div key={group.type}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <h3 className={`text-sm font-semibold ${group.color}`}>{group.type.charAt(0).toUpperCase() + group.type.slice(1)}</h3>
                  <span className="text-xs text-gray-600">{group.items.length}</span>
                  <Link to={group.route} className="ml-auto text-xs text-gray-600 hover:text-n0va-400">View all</Link>
                </div>
                <div className="space-y-1">
                  {group.items.slice(0, 10).map((item) => (
                    <Link
                      key={item._id || item.id}
                      to={`${group.route}/${item._id || item.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800 transition-colors group/item"
                    >
                      <Icon className={`w-4 h-4 ${group.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item[group.labelKey] || "Unnamed"}</p>
                        <p className="text-xs text-gray-500 truncate">{item[group.subKey] || item.goal || item.headline || item.description || item.trigger || ""}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                  {group.items.length > 10 && (
                    <Link to={group.route} className="block text-center text-xs text-n0va-400 hover:text-n0va-300 py-2">
                      View all {group.items.length} results
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {totalResults === 0 && (
            <div className="card text-center py-12">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No results found for "<span className="text-gray-400">{query}</span>"</p>
              <p className="text-xs text-gray-600 mt-1">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
