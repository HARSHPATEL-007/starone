import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Bell, Activity } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import QuickActions from "./QuickActions";
import AIAssistant from "./AIAssistant";
import { useFraudAlerts, useBudgetAlerts } from "../hooks/useSocket";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const fraudAlerts = useFraudAlerts();
  const budgetAlerts = useBudgetAlerts();
  const alertCount = fraudAlerts.length + budgetAlerts.length;

  useEffect(() => { setSearchVal(""); }, [location.pathname]);

  function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <form onSubmit={handleGlobalSearch} className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                className="input pl-10 pr-4 py-2 text-sm bg-gray-900/80 border-gray-800 w-full"
                placeholder='Search anything... (Cmd+K for palette)'
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </form>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </Link>
              <Link to="/activity" className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Activity className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <QuickActions />
      <AIAssistant />
    </div>
  );
}
