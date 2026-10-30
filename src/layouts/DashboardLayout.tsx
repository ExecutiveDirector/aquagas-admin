// ================================================
// UPDATED ENTERPRISE DASHBOARD LAYOUT
// Modern SaaS / Ecommerce UX
// Shopify + Stripe + Linear Inspired
// ================================================

import LogoLoader from '../components/ui/LogoLoader';
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
  RefreshCw,
  Package,
  MessageSquare,
  ChevronRight,
  Shield,
  Megaphone,
  Plug,
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
import WholesalerCatalogPage from "../pages/wholesaler/WholesalerCatalogPage";
import OutreachPage from "../pages/outreach/OutreachPage";
import IntegrationsPage from "../pages/integrations/IntegrationsPage";

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

const NAV_OVERVIEW = [
  { name: "Overview", href: "/", icon: Home },
];

const NAV_OPERATIONS = [
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Riders", href: "/riders", icon: Truck },
  { name: "Vendors", href: "/vendors", icon: Store },
];

const NAV_MANAGEMENT = [
  { name: "Users", href: "/users", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Vendor Outreach", href: "/outreach", icon: Megaphone },
  { name: "Wholesaler Sync", href: "/wholesaler-sync", icon: RefreshCw },
  { name: "Integrations", href: "/integrations", icon: Plug },
];

const NAV_FINANCE = [
  { name: "Transactions", href: "/transactions", icon: CreditCard },
];

const NAV_SYSTEM = [
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support", href: "/support", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Admin access is role-dependent and is added at render time.
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
            ? "bg-orange-500/10 border-orange-400/20 text-orange-200 shadow-sm"
            : "border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10 hover:text-white"
        }
      `}
    >
      {/* Active indicator */}
      <div
        className={`
          absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all
          ${active ? "bg-orange-500" : "bg-transparent"}
        `}
      />

      {/* Icon */}
      <div
        className={`
          w-9 h-9 rounded-xl flex items-center justify-center
          transition-all duration-200 shrink-0

          ${
            active
              ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30"
              : "bg-white/10 text-slate-400 group-hover:bg-white/15 group-hover:text-white"
          }
        `}
      >
        <Icon className="w-4 h-4" />
      </div>

      <span className="truncate">{name}</span>

      {active && (
        <ChevronRight className="ml-auto w-4 h-4 text-orange-300" />
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
  const filterNav = (items: typeof NAV_OVERVIEW) =>
    items.filter((item) => canAccess(item.href, adminRole, mySections));
  const navGroups = [
    { label: "Overview", items: filterNav(NAV_OVERVIEW) },
    { label: "Operations", items: filterNav(NAV_OPERATIONS) },
    { label: "Management", items: filterNav(NAV_MANAGEMENT) },
    { label: "Finance", items: filterNav(NAV_FINANCE) },
    {
      label: "System",
      items: filterNav([...NAV_SYSTEM, ...(isSuperAdmin() ? [NAV_ADMINS] : [])]),
    },
  ].filter((group) => group.items.length > 0);
  const allNav = navGroups.flatMap((group) => group.items);

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

      case "/integrations":
        return <IntegrationsPage />;

      case "/transactions":
        return <Finance />;

      case "/notifications":
        return <NotificationsPage />;

      case "/support":
        return <SupportPage />;

      case "/wholesaler-sync":
        return <WholesalerCatalogPage />;

      case "/outreach":
        return <OutreachPage />;

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
        <LogoLoader size={140} />
      </div>
    );
  }

  const initials =
    account?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F5F7FB]">

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
          bg-[#101C2E]
          border-r border-white/10
          shadow-[8px_0_32px_rgba(15,23,42,0.12)]

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
        <div className="h-[76px] shrink-0 flex items-center justify-between px-5 border-b border-white/10">

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AquaGas"
              className="h-10 w-10 rounded-xl bg-white object-contain p-1.5 shadow-lg shadow-black/10"
            />

            <div>
              <p className="text-[15px] font-bold tracking-tight text-white">
                AquaGas
              </p>

              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Enterprise
              </p>
            </div>
          </div>
        </div>

        {/* =====================================
            NAVIGATION
        ===================================== */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">

          {navGroups.map((group) => (
            <section key={group.label} className="mb-7 last:mb-0">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ name, href, icon }) => (
                  <NavItem
                    key={href}
                    name={name}
                    icon={icon}
                    active={isActive(href)}
                    onClick={() => handleNavClick(href)}
                  />
                ))}
              </div>
            </section>
          ))}
        </nav>

        {/* =====================================
            FOOTER USER
        ===================================== */}
        <div className="p-4 border-t border-white/10">

          <div
            className="
              flex items-center gap-3
              p-3 rounded-2xl
              bg-white/5
              border border-white/10
            "
          >
            <div
              className="
                w-10 h-10 rounded-2xl
                bg-gradient-to-br from-orange-500 to-orange-600
                flex items-center justify-center
                text-white font-bold text-sm
                shadow-lg shadow-orange-950/30
              "
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
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
                hover:bg-white/10
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
            h-[76px] shrink-0
            bg-white/90 backdrop-blur-xl
            border-b border-slate-200/80
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
            <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">
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
                  bg-gradient-to-br from-orange-500 to-orange-600
                  flex items-center justify-center
                  text-white font-bold text-sm
                  shadow-lg shadow-orange-950/30
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
              p-5 sm:p-6 lg:p-8
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
