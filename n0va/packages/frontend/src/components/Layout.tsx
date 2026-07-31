import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Bell, Activity, HelpCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import QuickActions from "./QuickActions";
import AIAssistant from "./AIAssistant";
import HelpDialog from "./HelpDialog";
import MobileNav from "./MobileNav";
import { useFraudAlerts, useBudgetAlerts } from "../hooks/useSocket";

interface LayoutProps {
  children: ReactNode;
}

const GO_SEQUENCES: Record<string, string> = { d: "/", c: "/campaigns", r: "/reports" };

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingGo, setPendingGo] = useState<string | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const fraudAlerts = useFraudAlerts();
  const budgetAlerts = useBudgetAlerts();
  const alertCount = fraudAlerts.length + budgetAlerts.length;

  useEffect(() => { setSearchVal(""); }, [location.pathname]);

  useEffect(() => {
    if (!pendingGo) return;
    const t = setTimeout(() => setPendingGo(null), 1500);
    return () => clearTimeout(t);
  }, [pendingGo]);

  function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTypingTarget(e.target);

      if (mod && e.key === "k") {
        e.preventDefault();
        setHelpOpen(false);
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        setHelpOpen(false);
        navigate("/campaigns/new");
        return;
      }
      if (mod && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setHelpOpen(false);
        navigate("/approvals");
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        setPaletteOpen(false);
        setHelpOpen(false);
        window.dispatchEvent(new CustomEvent("n0va:toggle-assistant"));
        return;
      }
      if (mod && e.shiftKey && e.key === "R") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("n0va:refresh-data"));
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        return;
      }
      if (typing) return;

      if (e.key === "?") {
        e.preventDefault();
        setPaletteOpen(false);
        setHelpOpen((prev) => !prev);
        return;
      }
      if (e.key === "g" || e.key === "G") {
        setPendingGo("g");
        return;
      }
      if (pendingGo && e.key.length === 1) {
        const route = GO_SEQUENCES[e.key.toLowerCase()];
        setPendingGo(null);
        if (route) {
          setHelpOpen(false);
          navigate(route);
        }
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, pendingGo]);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-4 md:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <form onSubmit={handleGlobalSearch} className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                className="input pl-10 pr-4 py-2 text-sm bg-gray-900/80 border-gray-800 w-full"
                placeholder='Search anything... (Cmd+K for palette)'
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </form>
            <div className="sm:hidden flex items-center gap-2 flex-1">
              <span className="text-sm font-semibold text-white truncate">N0VA Ads</span>
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <button
                onClick={() => { setPaletteOpen(false); setHelpOpen((prev) => !prev); }}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Contextual help (?)"
              >
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </button>
              <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </Link>
              <Link to="/activity" className="hidden sm:block p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Activity className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <MobileNav />
      <QuickActions />
      <AIAssistant />
    </div>
  );
}
