// components/Sidebar.tsx
import React from "react";
import { X, LogOut } from "lucide-react";
import { getAccount } from "../services/authService"; // Real account data

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
  const account = getAccount(); // Real authenticated user data

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Logo Header */}
      <div className="relative flex items-center justify-between h-16 px-6 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">AG</span>
          </div>
          <span className="text-white font-bold text-lg">AquaGas Admin</span>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="mt-8 px-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? "text-white" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  }`}
                />
                <span>{item.name}</span>

                {/* Active Indicator Pill */}
                {active && (
                  <div className="absolute right-0 w-1.5 h-10 bg-white/30 rounded-l-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900">
        <div className="flex items-center gap-4">
          {/* Avatar with Gradient */}
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {account?.email?.[0]?.toUpperCase() || "A"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {account?.email || "admin@aquagas.com"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {account?.role || "administrator"}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}