// components/Sidebar.tsx
import React from "react";
import { X, LogOut } from "lucide-react";
import { getAccount } from "../services/authService";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navigation: { name: string; href: string; icon: React.ElementType }[];
  isActive: (href: string) => boolean;
  handleNavClick: (href: string) => void;
  handleLogout: () => void;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  navigation,
  isActive,
  handleNavClick,
  handleLogout,
}: SidebarProps) {
  const account  = getAccount();
  const initials = account?.email?.[0]?.toUpperCase() ?? "A";

  const mainNav   = navigation.slice(0, 7);
  const systemNav = navigation.slice(7);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        w-64 bg-[#13151e] border-r border-white/5
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <span className="text-white font-black text-sm tracking-tight">AG</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-white font-bold text-[15px] tracking-tight">AquaGas</span>
          <span className="text-slate-500 text-[10px] uppercase tracking-widest">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-white rounded-md transition"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Main Menu
        </p>
        {mainNav.map(({ name, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <NavItem
              key={name}
              label={name}
              Icon={Icon}
              active={active}
              onClick={() => handleNavClick(href)}
            />
          );
        })}

        <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          System
        </p>
        {systemNav.map(({ name, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <NavItem
              key={name}
              label={name}
              Icon={Icon}
              active={active}
              onClick={() => handleNavClick(href)}
            />
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-200 truncate">
              {account?.email ?? "admin@aquagas.com"}
            </p>
            <p className="text-[11px] text-slate-500 capitalize">
              {account?.role ?? "administrator"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-1.5 text-slate-500 hover:text-red-400 rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Reusable nav item ─────────────────── */
function NavItem({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-150 group relative
        ${active
          ? "bg-indigo-500/10 text-indigo-400"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
      )}
      <Icon className={`w-[18px] h-[18px] shrink-0 ${
        active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
      }`} />
      <span>{label}</span>
    </button>
  );
}
