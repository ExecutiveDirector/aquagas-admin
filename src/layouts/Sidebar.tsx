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

function NavItem({
  name, icon: Icon, active, onClick,
}: {
  name: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-[13.5px] font-medium transition-all duration-150 group
        ${active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }
      `}
    >
      <span className={`
        flex items-center justify-center w-[30px] h-[30px] rounded-lg
        transition-all duration-150 shrink-0
        ${active
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
        }
      `}>
        <Icon className="w-[14px] h-[14px]" />
      </span>
      {name}
    </button>
  );
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

  // Split nav into Main (first 7) and System (rest)
  const mainNav   = navigation.slice(0, 7);
  const systemNav = navigation.slice(7);

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 flex flex-col w-[232px]
      bg-white border-r border-slate-200/70 shadow-sm
      transition-transform duration-300 ease-in-out
      lg:static lg:translate-x-0
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    `}>

      {/* Brand */}
      <div className="shrink-0 flex items-center gap-3 h-16 px-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                        flex items-center justify-center shadow-lg shadow-indigo-200/60">
          <span className="text-white font-black text-sm">AG</span>
        </div>
        <div className="leading-none">
          <p className="text-[14.5px] font-bold text-slate-800">AquaGas</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Admin</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-slate-600
                     hover:bg-slate-100 rounded-lg transition"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-5 pb-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Main
        </p>
        {mainNav.map(({ name, href, icon }) => (
          <NavItem key={href} name={name} icon={icon}
            active={isActive(href)} onClick={() => handleNavClick(href)} />
        ))}

        <p className="px-3 pt-5 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          System
        </p>
        {systemNav.map(({ name, href, icon }) => (
          <NavItem key={href} name={name} icon={icon}
            active={isActive(href)} onClick={() => handleNavClick(href)} />
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
                          flex items-center justify-center text-white font-bold text-[13px]
                          shrink-0 shadow-sm shadow-indigo-200">
            {initials}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[12.5px] font-semibold text-slate-700 truncate">
              {account?.email ?? "admin@aquagas.com"}
            </p>
            <p className="text-[11px] text-slate-400 capitalize">
              {account?.role ?? "administrator"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition"
          >
            <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
