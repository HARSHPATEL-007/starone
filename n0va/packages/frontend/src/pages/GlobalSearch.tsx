import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Search, Megaphone, Palette, Users, Bot, FileJson, ArrowLeft, ExternalLink, Loader, ListFilter } from "lucide-react";
import { api } from "../api/client";

const GROUP_CONFIG: Record<string, { icon: any; color: string; route: string }> = {
  campaigns: { icon: Megaphone, color: "text-n0va-400", route: "/campaigns" },
  creatives: { icon: Palette, color: "text-purple-400", route: "/creatives" },
  audiences: { icon: Users, color: "text-green-400", route: "/audiences" },
  agents: { icon: Bot, color: "text-blue-400", route: "/agents" },
  recipes: { icon: FileJson, color: "text-yellow-400", route: "/recipes" },
};

const TYPE_LABELS: Record<string, string> = {
  all: "All Results",
  campaigns: "Campaigns",
  creatives: "Creatives",
  audiences: "Audiences",
  agents: "Agents",
  recipes: "Recipes",
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [input, setInput] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ entityType: string; _id: string; label: string; subtitle: string }[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    setInput(query);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    api.search.global(query.trim()).then((r) => {
      setResults(r || []);
      setLoading(false);
    }).catch(() => { setResults([]); setLoading(false); });
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) setSearchParams({ q: input.trim() });
  }

  const grouped: Record<string, typeof results> = {};
  for (const r of results) {
    if (!grouped[r.entityType]) grouped[r.entityType] = [];
    grouped[r.entityType].push(r);
  }

  const entityTypes = Object.keys(grouped).sort();
  const filteredResults = filterType === "all"
    ? results
    : (grouped[filterType] || []);
  const totalResults = filteredResults.length;

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
        <input className="input pl-12 pr-4 py-3.5 text-base" placeholder="Search campaigns, creatives, audiences, agents, recipes..." value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
      </form>

      {query && !loading && (
        <p className="text-sm text-gray-500">{totalResults} result{totalResults !== 1 ? "s" : ""} for "<span className="text-gray-300">{query}</span>"</p>
      )}

      {query && results.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border-b border-gray-800 pb-2">
          <button onClick={() => setFilterType("all")} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filterType === "all" ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"}`}>
            <ListFilter className="w-3 h-3 inline mr-1" />All ({results.length})
          </button>
          {entityTypes.map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${filterType === type ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"}`}>
              {(() => {
                const Icon = GROUP_CONFIG[type]?.icon || Search;
                return <Icon className="w-3 h-3" />;
              })()}
              {TYPE_LABELS[type] || type} ({grouped[type]?.length || 0})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader className="w-6 h-6 text-n0va-400 animate-spin" /></div>
      ) : query ? (
        <div className="space-y-8">
          {filterType === "all" ? (
            Object.entries(grouped).map(([entityType, items]) => {
              const cfg = GROUP_CONFIG[entityType];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const detailRoute = cfg.route;
              return (
                <div key={entityType}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <h3 className={`text-sm font-semibold ${cfg.color}`}>{TYPE_LABELS[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h3>
                    <span className="text-xs text-gray-600">{items.length}</span>
                    <Link to={detailRoute} className="ml-auto text-xs text-gray-600 hover:text-n0va-400">View all</Link>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 10).map((item) => (
                      <Link key={item._id} to={`${detailRoute}/${item._id}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800 transition-colors group/item">
                        <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.label}</p>
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                    {items.length > 10 && (
                      <Link to={detailRoute} className="block text-center text-xs text-n0va-400 hover:text-n0va-300 py-2">View all {items.length} results</Link>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-1">
              {filteredResults.map((item) => {
                const cfg = GROUP_CONFIG[item.entityType];
                const Icon = cfg?.icon || Search;
                const detailRoute = cfg?.route || "/";
                return (
                  <Link key={item._id} to={`${detailRoute}/${item._id}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800 transition-colors group/item">
                    <Icon className={`w-4 h-4 ${cfg?.color || "text-gray-400"} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{item.label}</p>
                      <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          )}
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
