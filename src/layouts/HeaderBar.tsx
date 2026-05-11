import { Menu, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderBarProps {
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

const PATH_TITLES: Record<string, string> = {
  "/":             "Overview",
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
  const { pathname } = useLocation();
  const title = PATH_TITLES[pathname] ?? "Admin Dashboard";

  return (
    <header className="
      shrink-0 h-16 bg-white border-b border-slate-200/70
      flex items-center px-6 gap-4
      shadow-[0_1px_3px_rgba(0,0,0,0.04)] z-30
    ">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 text-slate-400 hover:text-slate-700
                   hover:bg-slate-100 rounded-lg transition"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title + date */}
      <div>
        <h1 className="text-[16px] font-bold text-slate-800 leading-tight">{title}</h1>
        <p className="hidden sm:block text-[11px] text-slate-400 leading-tight mt-0.5">
          {new Date().toLocaleDateString("en-KE", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-3">

        {/* Live badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-emerald-50 border border-emerald-100 text-emerald-600
                         text-[12px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">System Live</span>
          <span className="sm:hidden">Live</span>
        </span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                     text-[13px] font-medium text-slate-500
                     hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
