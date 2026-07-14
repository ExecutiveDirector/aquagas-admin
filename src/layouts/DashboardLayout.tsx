// ================================================
// UPDATED ENTERPRISE DASHBOARD LAYOUT
// Modern SaaS / Ecommerce UX
// Shopify + Stripe + Linear Inspired
// ================================================

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Store,
  Truck,
  Bell,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  ShoppingCart,
  CreditCard,
  Package,
  MessageSquare,
  Search,
  Command,
  ChevronRight,
  Sparkles,
  Shield,
} from "lucide-react";

import { motion } from "framer-motion";

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
import AdminsPage from "../pages/admins/AdminsPage";

import {
  isAuthenticated,
  getAccount,
  logout,
  isSuperAdmin,
  getAdminRole,
  getPermissions,
} from "../services/authService";
import { canAccess, roleLabel } from "../config/rolePermissions";

// ======================================================
// NAVIGATION
// ======================================================

const NAV_MAIN = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Users", href: "/users", icon: Users },
  { name: "Vendors", href: "/vendors", icon: Store },
  { name: "Riders", href: "/riders", icon: Truck },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
];

const NAV_SYSTEM = [
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support", href: "/support", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

// "Admins" is appended per-render (see DashboardLayout body) rather than
// here, since it depends on the logged-in admin's admin_role — a static
// module-level array can't react to who's currently logged in.
const NAV_ADMINS = { name: "Admins", href: "/admins", icon: Shield };

// ======================================================
// NAV ITEM
// ======================================================

function NavItem({
  name,
  icon: Icon,
  active,
  onClick,
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
        relative w-full flex items-center gap-3
        px-3 py-2.5 rounded-2xl
        text-[13px] font-medium
        transition-all duration-200 group
        border

        ${
          active
            ? "bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm"
            : "border-transparent text-slate-500 hover:bg-white hover:border-slate-200 hover:text-slate-800"
        }
      `}
    >
      {/* Active indicator */}
      <div
        className={`
          absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all
          ${active ? "bg-indigo-600" : "bg-transparent"}
        `}
      />

      {/* Icon */}
      <div
        className={`
          w-9 h-9 rounded-xl flex items-center justify-center
          transition-all duration-200 shrink-0

          ${
            active
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-700"
          }
        `}
      >
        <Icon className="w-4 h-4" />
      </div>

      <span className="truncate">{name}</span>

      {active && (
        <ChevronRight className="ml-auto w-4 h-4 text-indigo-400" />
      )}
    </button>
  );
}

// ======================================================
// MAIN LAYOUT
// ======================================================

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
      navigate("/login");
    } else {
      setAccount(getAccount());
    }
  }, [navigate]);

  // Every nav item is filtered against the logged-in admin's sub-role via
  // the shared rolePermissions map (kept in sync with the backend's route
  // guards) — not just the "Admins" entry. A support_admin, for instance,
  // shouldn't see Vendors/Riders/Products any more than a non-super-admin
  // should see Admins; all of it 403s on the backend anyway, so hiding it
  // avoids dead-end nav items for every role, not just one.
  const adminRole = getAdminRole();
  const mySections = getPermissions().sections;
  const navMain = NAV_MAIN.filter((item) => canAccess(item.href, adminRole, mySections));
  const navSystemBase = [...NAV_SYSTEM, ...(isSuperAdmin() ? [NAV_ADMINS] : [])];
  const navSystem = navSystemBase.filter((item) => canAccess(item.href, adminRole, mySections));
  const allNav = [...navMain, ...navSystem];

  const isActive = (href: string) =>
    href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(href);

  const getPageTitle = () => {
    if (location.pathname === "/") return "Overview";

    return (
      allNav.find(
        (i) =>
          i.href !== "/" &&
          location.pathname.startsWith(i.href)
      )?.name ?? "Dashboard"
    );
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderPage = () => {
    // Nav hides restricted items, but someone can still type the URL
    // directly. Same permission map the nav uses — if the API would 403 it,
    // don't render the page at all.
    if (!canAccess(location.pathname, adminRole, mySections)) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="max-w-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Access restricted
            </p>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Your role ({roleLabel(adminRole)}) doesn't have access to this
              section. Contact a super admin if you think this is a mistake.
            </p>
          </div>
        </div>
      );
    }

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

      case "/admins":
        return <AdminsPage />;

      default:
        return <AdminHome />;
    }
  };

  if (!account) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  const initials =
    account?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F6F8FC]">

      {/* =========================================
          MOBILE OVERLAY
      ========================================= */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* =========================================
          SIDEBAR
      ========================================= */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          w-[260px]
          bg-white
          border-r border-slate-200/70
          shadow-[0_10px_40px_rgba(0,0,0,0.04)]

          transition-transform duration-300

          lg:translate-x-0 lg:static

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* =====================================
            BRAND
        ===================================== */}
        <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-slate-100">

          <div className="flex items-center gap-3">
            <div
              className="
                w-10 h-10 rounded-2xl
                bg-gradient-to-br from-indigo-500 to-violet-600
                flex items-center justify-center
                shadow-lg shadow-indigo-200
              "
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            <div>
              <p className="text-[15px] font-bold text-slate-800">
                AquaGas
              </p>

              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Enterprise
              </p>
            </div>
          </div>
        </div>

        {/* =====================================
            SEARCH
        ===================================== */}
        <div className="px-4 pt-4">
          <button
            className="
              w-full flex items-center gap-3
              px-4 py-3 rounded-2xl
              bg-slate-50 hover:bg-white
              border border-slate-200
              transition-all
            "
          >
            <Search className="w-4 h-4 text-slate-400" />

            <span className="text-sm text-slate-400">
              Search anything...
            </span>

            <div
              className="
                ml-auto flex items-center gap-1
                px-2 py-1 rounded-lg
                bg-white border border-slate-200
                text-[11px] text-slate-400
              "
            >
              <Command className="w-3 h-3" />
              K
            </div>
          </button>
        </div>

        {/* =====================================
            NAVIGATION
        ===================================== */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">

          {/* MAIN */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Main
            </p>

            {navMain.map(({ name, href, icon }) => (
              <NavItem
                key={href}
                name={name}
                icon={icon}
                active={isActive(href)}
                onClick={() => handleNavClick(href)}
              />
            ))}
          </div>

          {/* SYSTEM */}
          <div className="space-y-1 mt-8">
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              System
            </p>

            {navSystem.map(({ name, href, icon }) => (
              <NavItem
                key={href}
                name={name}
                icon={icon}
                active={isActive(href)}
                onClick={() => handleNavClick(href)}
              />
            ))}
          </div>
        </nav>

        {/* =====================================
            FOOTER USER
        ===================================== */}
        <div className="p-4 border-t border-slate-100">

          <div
            className="
              flex items-center gap-3
              p-3 rounded-2xl
              bg-slate-50
              border border-slate-100
            "
          >
            <div
              className="
                w-10 h-10 rounded-2xl
                bg-gradient-to-br from-indigo-500 to-violet-600
                flex items-center justify-center
                text-white font-bold text-sm
                shadow-lg shadow-indigo-200
              "
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {account?.email}
              </p>

              <p className="text-xs text-slate-400 capitalize">
                {account?.role ?? "Administrator"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="
                p-2 rounded-xl
                text-slate-400 hover:text-red-500
                hover:bg-white
                transition-all
              "
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* =====================================
            HEADER
        ===================================== */}
        <header
          className="
            h-16 shrink-0
            bg-white/80 backdrop-blur-xl
            border-b border-slate-200/70
            px-6
            flex items-center
            shadow-sm
            z-30
          "
        >

          {/* Mobile button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="
              lg:hidden mr-4
              p-2 rounded-xl
              hover:bg-slate-100
              transition-all
            "
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Title */}
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-slate-800">
              {getPageTitle()}
            </h1>

            <p className="text-[12px] text-slate-400 mt-0.5">
              {new Date().toLocaleDateString("en-KE", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">

            {/* Live */}
            <div
              className="
                hidden md:flex items-center gap-2
                px-3 py-2 rounded-full
                bg-emerald-50 border border-emerald-100
                text-emerald-700 text-xs font-semibold
              "
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Operational
            </div>

            {/* Notification */}
            <button
              className="
                relative p-2.5 rounded-2xl
                bg-white border border-slate-200
                hover:border-slate-300
                transition-all
              "
            >
              <Bell className="w-4 h-4 text-slate-600" />

              <span
                className="
                  absolute top-2 right-2
                  w-2 h-2 rounded-full
                  bg-red-500
                "
              />
            </button>

            {/* User */}
            <div
              className="
                hidden lg:flex items-center gap-3
                pl-4 ml-2 border-l border-slate-200
              "
            >
              <div
                className="
                  w-10 h-10 rounded-2xl
                  bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center
                  text-white font-bold text-sm
                  shadow-lg shadow-indigo-200
                "
              >
                {initials}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {account?.email}
                </p>

                <p className="text-xs text-slate-400 capitalize">
                  {account?.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* =====================================
            PAGE CONTENT
        ===================================== */}
        <main className="flex-1 overflow-y-auto">

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="
              p-6 lg:p-8
              max-w-[1600px]
              mx-auto
              w-full
            "
          >
            {renderPage()}
          </motion.div>

        </main>
      </div>
    </div>
  );
}
