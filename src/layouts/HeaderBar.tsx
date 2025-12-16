// components/HeaderBar.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
  User,
  Settings,
  HelpCircle,
  Command,
  ChevronRight,
} from "lucide-react";
import { getAccount } from "../services/authService"; // Assuming you have this

interface HeaderBarProps {
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export default function HeaderBar({ setSidebarOpen, handleLogout }: HeaderBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const account = getAccount(); // Real user data from your auth service

  // Dark mode – pure production with localStorage persistence
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ? saved === "dark" : prefersDark;
    setDarkMode(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  // Cmd+K global search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getPageTitle = () => {
    const map: Record<string, string> = {
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
    return map[location.pathname] || "Admin Dashboard";
  };

  // Real current date – no hardcoding
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Replace these with real data from your API / state in production
  // For now, placeholders – you will connect later
  const unreadNotifications = 0; // ← Connect to real count
  const notifications = []; // ← Fetch from API

  return (
    <>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Left: Menu + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {getPageTitle()}
              </h1>
              <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentDate}
              </p>
            </div>
          </div>

          {/* Center: Global Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4" />
                  <span>Search orders, customers, riders...</span>
                </div>
                <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs bg-white/50 dark:bg-black/30 rounded">
                  <Command className="w-3 h-3" />K
                </kbd>
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse ring-2 ring-white dark:ring-gray-800">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadNotifications > 0 && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400">
                          {unreadNotifications} unread
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No notifications at this time
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notif.time}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    <button
                      onClick={() => navigate("/notifications")}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg hover:ring-4 hover:ring-indigo-300 dark:hover:ring-indigo-800 transition"
                aria-label="User menu"
              >
                {account?.email?.[0]?.toUpperCase() || "A"}
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account?.name || "Admin User"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {account?.email || "admin@aquagas.com"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                      {account?.role || "administrator"}
                    </p>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => navigate("/profile")} // Add profile page later
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => navigate("/settings")}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </button>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs – Production Ready */}
      {location.pathname !== "/" && (
        <nav className="flex items-center gap-2 px-6 lg:px-8 py-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={() => navigate("/")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Dashboard
          </button>
          {location.pathname
            .split("/")
            .filter((p) => p)
            .map((segment, i, arr) => {
              const path = "/" + arr.slice(0, i + 1).join("/");
              const name = segment.charAt(0).toUpperCase() + segment.slice(1);
              return (
                <div key={path} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  {i === arr.length - 1 ? (
                    <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                  ) : (
                    <button
                      onClick={() => navigate(path)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      {name}
                    </button>
                  )}
                </div>
              );
            })}
        </nav>
      )}
    </>
  );
}