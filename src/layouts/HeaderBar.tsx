import { Menu, LogOut, MoreVertical } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderBarProps {
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export default function HeaderBar({ setSidebarOpen, handleLogout }: HeaderBarProps) {
  const location = useLocation();

  // Dynamic page title based on current route
  const getPageTitle = () => {
    const pathMap: Record<string, string> = {
      "/": "Dashboard Overview",
      "/users": "Users Management",
      "/vendors": "Vendors Management",
      "/riders": "Riders Management",
      "/orders": "Orders Management",
      "/products": "Products Management",
      "/transactions": "Transactions",
      "/notifications": "Notifications",
      "/support": "Customer Support",
      "/analytics": "Analytics & Reports",
      "/settings": "Settings",
    };

    return pathMap[location.pathname] || "Admin Dashboard";
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Menu + Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {getPageTitle()}
            </h1>
            <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Welcome back, Admin • {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex items-center gap-4">
          {/* System Status */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              System Live
            </span>
          </div>

          {/* Mobile Status (smaller) */}
          <div className="sm:hidden flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Live</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Optional: Mobile More Menu (if you want future actions like notifications) */}
          {/* <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden">
            <MoreVertical className="w-5 h-5" />
          </button> */}
        </div>
      </div>
    </header>
  );
}