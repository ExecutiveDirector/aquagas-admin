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

import { listUsers, getAccount, logout, isAuthenticated } from "../services/api";
//import Support from "../pages/support/SupportPage";
import Finance from "../pages/transactions/finance";
import ProductPage from "../pages/products/ProductPage";
import OrdersPage from "../pages/orders/OrderPage";
import SupportPage from "../pages/support/SupportPage";
import SettingPage from "../pages/settings/settings";

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
    } else {
      setAccount(getAccount());
    }
  }, []);

  // Navigation config
  const navigation = [
    { name: "Overview", href: "/", icon: Home },
    { name: "Users", href: "/users", icon: Users },
    { name: "Vendors", href: "/vendors", icon: Store },
    { name: "Riders", href: "/riders", icon: Truck },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Package },
    { name: "Transactions", href: "/transactions", icon: CreditCard },
    { name: "Support", href: "/support", icon: MessageSquare },
    { name: "Analytics", href: "/analytics", icon: BarChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    return href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  const renderCurrentPage = () => {
    switch (location.pathname) {
      case "/":
        return <AdminHome />;
      case "/users":
        return <UsersPage listUsers={listUsers} />;
      case "/riders":
        return <RidersPage />;
        case "/transactions":
          return <Finance />;
      case "/vendors":
        return <VendorsPage />;
        case "/products":
          return <ProductPage />;
          case "/orders":
            return <OrdersPage />;
      case "/notifications":
        return <NotificationsPage />;
        case "/support":
         return <SupportPage />;        
        case "/settings":
          return <SettingPage />;
      default:
        const path = location.pathname;
        if (
          // path.startsWith("/orders") ||
          // path.startsWith("/products") ||
          //path.startsWith("/transactions") ||
          // path.startsWith("/support") ||
          path.startsWith("/analytics") 
          // path.startsWith("/settings")
        ) {
          return (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {path.slice(1).charAt(0).toUpperCase() + path.slice(2)} Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This section is ready for implementation. Connect to your backend API to
                manage {path.slice(1)}.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Expected API endpoints:</p>
                <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  GET /v1/admin{path} - List {path.slice(1)}
                </code>
                <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  GET /v1/admin{path}/:id - Get details
                </code>
                <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  PUT /v1/admin{path}/:id/status - Update status
                </code>
              </div>
            </div>
          );
        }

        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The requested page could not be found.
            </p>
          </div>
        );
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">A</span>
            </div>
            <span className="text-white font-bold text-lg">AquaGas Admin</span>
          </div>
          <button
            className="lg:hidden text-white hover:text-gray-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive(item.href)
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    }`}
                  />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Signed in as
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {account?.email ?? "Unknown"}
              </p>
              {account?.role && (
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {account.role}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="ml-3 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <button
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>System Online</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">{renderCurrentPage()}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
