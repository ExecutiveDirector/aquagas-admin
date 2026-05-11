import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, Store, Truck, Bell, Settings, BarChart,
  LogOut, Menu, X, ShoppingCart, CreditCard, Package, MessageSquare,
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

const navigation = [
  { name: "Overview",      href: "/",             icon: Home },
  { name: "Users",         href: "/users",         icon: Users },
  { name: "Vendors",       href: "/vendors",       icon: Store },
  { name: "Riders",        href: "/riders",        icon: Truck },
  { name: "Orders",        href: "/orders",        icon: ShoppingCart },
  { name: "Products",      href: "/products",      icon: Package },
  { name: "Transactions",  href: "/transactions",  icon: CreditCard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support",       href: "/support",       icon: MessageSquare },
  { name: "Analytics",     href: "/analytics",     icon: BarChart },
  { name: "Settings",      href: "/settings",      icon: Settings },
];

function DashboardLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [account,     setAccount]     = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) { logout(); navigate("/login"); }
    else setAccount(getAccount());
  }, [navigate]);

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const getPageTitle = () => {
    if (location.pathname === "/") return "Dashboard Overview";
    const item = navigation.find(i => i.href !== "/" && location.pathname.startsWith(i.href));
    return item ? `${item.name}` : "Admin Dashboard";
  };

  const handleNavClick = (href: string) => { navigate(href); setSidebarOpen(false); };
  const handleLogout   = () => { logout(); navigate("/login"); };

  const renderPage = () => {
    switch (location.pathname) {
      case "/":             return <AdminHome />;
      case "/users":        return <UsersPage />;
      case "/riders":       return <RidersPage />;
      case "/vendors":      return <VendorsPage />;
      case "/orders":       return <OrdersPage />;
      case "/products":     return <ProductPage />;
      case "/transactions": return <Finance />;
      case "/notifications":return <NotificationsPage />;
      case "/support":      return <SupportPage />;
      case "/settings":     return <SettingPage />;
      case "/analytics":    return <AdminAnalytics />;
      default:              return <AdminHome />;
    }
  };

  if (!account) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm tracking-widest uppercase">Authenticating</p>
        </div>
      </div>
    );
  }

  const initials = account?.email?.[0]?.toUpperCase() ?? "A";

  return (
    /* ── Root: full-viewport, no overflow ── */
    <div className="h-screen w-screen flex overflow-hidden bg-[#0f1117]">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════
          SIDEBAR  –  fixed height, its own scroll
          ════════════════════════════════════════ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-64 bg-[#13151e] border-r border-white/5
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
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
            className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav — scrollable if items overflow */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Main Menu
          </p>
          {navigation.slice(0, 7).map(({ name, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <button
                key={name}
                onClick={() => handleNavClick(href)}
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
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{name}</span>
              </button>
            );
          })}

          <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            System
          </p>
          {navigation.slice(7).map(({ name, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <button
                key={name}
                onClick={() => handleNavClick(href)}
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
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{name}</span>
              </button>
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
              className="p-1.5 text-slate-500 hover:text-red-400 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN COLUMN  –  header fixed + content scrolls
          ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top header  (never scrolls) ── */}
        <header className="shrink-0 h-16 bg-[#13151e]/80 backdrop-blur border-b border-white/5 flex items-center px-5 gap-4 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb-style title */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm hidden sm:inline">AquaGas</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <h1 className="text-white font-semibold text-[15px]">{getPageTitle()}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Live pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Live</span>
            </div>

            {/* Date */}
            <span className="hidden md:block text-slate-500 text-xs">
              {new Date().toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
        </header>

        {/* ── Page content  (ONLY this scrolls) ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
