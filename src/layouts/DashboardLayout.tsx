import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Store,
  Truck,
  Bell,
  Settings,
  BarChart,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  CreditCard,
  Package,
  MessageSquare,
} from "lucide-react";

import AdminHome from "../pages/home/AdminHome";
import UsersPage from "../pages/users/UsersPage";
import RidersPage from "../pages/riders/RidersPage";
import VendorsPage from "../pages/vendors/VendorsPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import Finance from "../pages/transactions/finance";
import ProductPage from "../pages/products/ProductPage";
import OrdersPage from "../pages/orders/OrderPage";
import SupportPage from "../pages/support/SupportPage";
import SettingPage from "../pages/settings/settings";
import AdminAnalytics from "../pages/analytics/AnalyticsPage";

import { isAuthenticated, getAccount, logout } from "../services/authService";

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
      navigate("/login"); // optional: redirect to login
    } else {
      setAccount(getAccount());
    }
  }, [navigate]);

  const navigation = [
    { name: "Overview", href: "/", icon: Home },
    { name: "Users", href: "/users", icon: Users },
    { name: "Vendors", href: "/vendors", icon: Store },
    { name: "Riders", href: "/riders", icon: Truck },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Package },
    { name: "Transactions", href: "/transactions", icon: CreditCard },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Support", href: "/support", icon: MessageSquare },
    { name: "Analytics", href: "/analytics", icon: BarChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const getPageTitle = () => {
    const item = navigation.find((i) => location.pathname.startsWith(i.href) && i.href !== "/");
    if (location.pathname === "/") return "Dashboard Overview";
    return item ? `${item.name} Management` : "Admin Dashboard";
  };

  const isActive = (href: string) => {
    return href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderCurrentPage = () => {
    switch (location.pathname) {
      case "/":
        return <AdminHome />;
      case "/users":
        return <UsersPage />;
      case "/riders":
        return <RidersPage />;
      case "/vendors":
        return <VendorsPage />;
      case "/orders":
        return <OrdersPage />;
      case "/products":
        return <ProductPage />;
      case "/transactions":
        return <Finance />;
      case "/notifications":
        return <NotificationsPage />;
      case "/support":
        return <SupportPage />;
      case "/settings":
        return <SettingPage />;
      case "/analytics":
        return <AdminAnalytics />;
      default:
        return <AdminHome />;
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">AG</span>
            </div>
            <span className="text-white font-bold text-lg">AquaGas Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
                  <span>{item.name}</span>
                  {active && <div className="ml-auto w-1.5 h-8 bg-white/30 rounded-full" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {account?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {account?.email || "admin@aquagas.com"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {account?.role || "administrator"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getPageTitle()}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">System Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
              {renderCurrentPage()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;