import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  Users,
  Bot,
  Share2,
  BarChart3,
  FileJson,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/creatives", icon: Palette, label: "Creatives" },
  { to: "/audiences", icon: Users, label: "Audiences" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/agents", icon: Bot, label: "AI Agents" },
  { to: "/recipes", icon: FileJson, label: "Recipes" },
  { to: "/platforms", icon: Share2, label: "Platforms" },
];

export default function Sidebar() {
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

      <nav className="flex-1 p-4 space-y-1">
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
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Jane Doe</p>
            <p className="text-xs text-gray-500 truncate">Marketing Director</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
