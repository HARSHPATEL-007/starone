import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  Users,
  Bot,
  Share2,
  BarChart3,
  FileJson,
  Shield,
  Link2,
  Webhook,
  Settings,
  GitCompare,
  TrendingUp,
  Split,
  Target,
  SearchX,
  Wallet,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/creatives", icon: Palette, label: "Creatives" },
  { to: "/audiences", icon: Users, label: "Audiences" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/war-room", icon: Shield, label: "War Room" },
  { to: "/fraud-evaluation", icon: SearchX, label: "Fraud Center" },
  { to: "/budget-strategy", icon: Wallet, label: "Budget Strategy" },
  { to: "/agents", icon: Bot, label: "AI Agents" },
  { to: "/recipes", icon: FileJson, label: "Recipes" },
  { to: "/platforms", icon: Share2, label: "Platforms" },
  { to: "/connected-accounts", icon: Link2, label: "Accounts" },
  { to: "/attribution", icon: GitCompare, label: "Attribution" },
  { to: "/forecast", icon: TrendingUp, label: "Forecast" },
  { to: "/creative-ab-test", icon: Split, label: "A/B Testing" },
  { to: "/audience-overlap", icon: Target, label: "Overlap Analysis" },
  { to: "/webhooks", icon: Webhook, label: "Webhooks" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("n0va_token");
    localStorage.removeItem("n0va_user");
    navigate("/login");
  }

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-n0va-600 rounded-lg flex items-center justify-center text-sm font-bold">
            N0
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">N0VA</h1>
            <p className="text-xs text-gray-500">Ads & Marketing</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
            {(() => {
              const userData = localStorage.getItem("n0va_user");
              if (userData) {
                try {
                  const u = JSON.parse(userData);
                  return u.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "U";
                } catch {}
              }
              return "JD";
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">
              {(() => {
                const userData = localStorage.getItem("n0va_user");
                if (userData) {
                  try { return JSON.parse(userData).name; } catch {}
                }
                return "User";
              })()}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {(() => {
                const userData = localStorage.getItem("n0va_user");
                if (userData) {
                  try { return JSON.parse(userData).role; } catch {}
                }
                return "User";
              })()}
            </p>
          </div>
          <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
