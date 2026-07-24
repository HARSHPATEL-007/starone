import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import QuickActions from "./QuickActions";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

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
          <div className="max-w-7xl mx-auto">
            <form onSubmit={handleGlobalSearch} className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                className="input pl-10 pr-4 py-2 text-sm bg-gray-900/80 border-gray-800 w-full"
                placeholder='Search anything... (Cmd+K for palette)'
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </form>
          </div>
        </div>
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <QuickActions />
    </div>
  );
}
