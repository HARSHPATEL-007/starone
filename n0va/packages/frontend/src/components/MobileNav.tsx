import { NavLink } from "react-router-dom";
import { LayoutDashboard, Megaphone, Users, CheckCircle, Home } from "lucide-react";

const MOBILE_NAV = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/command-center", icon: LayoutDashboard, label: "Command" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/audiences", icon: Users, label: "Audiences" },
  { to: "/approvals", icon: CheckCircle, label: "Approvals" },
];

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900/95 backdrop-blur border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-n0va-400" : "text-gray-500 hover:text-gray-300"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
