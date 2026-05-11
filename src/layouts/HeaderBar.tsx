import { Menu, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderBarProps {
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

const pathTitles: Record<string, string> = {
  "/":             "Dashboard Overview",
  "/users":        "Users",
  "/vendors":      "Vendors",
  "/riders":       "Riders",
  "/orders":       "Orders",
  "/products":     "Products",
  "/transactions": "Transactions",
  "/notifications":"Notifications",
  "/support":      "Support",
  "/analytics":    "Analytics",
  "/settings":     "Settings",
};

export default function HeaderBar({ setSidebarOpen, handleLogout }: HeaderBarProps) {
  const location  = useLocation();
  const pageTitle = pathTitles[location.pathname] ?? "Admin Dashboard";

  return (
    <header className="shrink-0 h-16 bg-[#13151e]/80 backdrop-blur border-b border-white/5 flex items-center px-5 gap-4 z-30">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb title */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-slate-600 text-sm">AquaGas</span>
        <span className="hidden sm:inline text-slate-600">/</span>
        <h1 className="text-white font-semibold text-[15px]">{pageTitle}</h1>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-3">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Live</span>
        </div>

        {/* Date */}
        <span className="hidden md:block text-slate-500 text-xs">
          {new Date().toLocaleDateString("en-KE", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
