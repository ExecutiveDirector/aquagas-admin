import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, Store, Truck, Bell, Settings, BarChart,
  LogOut, Menu, ShoppingCart, CreditCard, Package, MessageSquare,
} from "lucide-react";

import AdminHome         from "../pages/home/AdminHome";
import UsersPage         from "../pages/users/UsersPage";
import RidersPage        from "../pages/riders/RidersPage";
import VendorsPage       from "../pages/vendors/VendorsPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import Finance           from "../pages/transactions/finance";
import ProductPage       from "../pages/products/ProductPage";
import OrdersPage        from "../pages/orders/OrderPage";
import SupportPage       from "../pages/support/SupportPage";
import SettingPage       from "../pages/settings/settings";
import AdminAnalytics    from "../pages/analytics/AnalyticsPage";

import { isAuthenticated, getAccount, logout } from "../services/authService";

/* ─── Nav config ─────────────────────────────────── */
const NAV_MAIN = [
  { name: "Overview",     href: "/",             icon: Home         },
  { name: "Users",        href: "/users",         icon: Users        },
  { name: "Vendors",      href: "/vendors",       icon: Store        },
  { name: "Riders",       href: "/riders",        icon: Truck        },
  { name: "Orders",       href: "/orders",        icon: ShoppingCart },
  { name: "Products",     href: "/products",      icon: Package      },
  { name: "Transactions", href: "/transactions",  icon: CreditCard   },
];
const NAV_SYSTEM = [
  { name: "Notifications", href: "/notifications", icon: Bell          },
  { name: "Support",       href: "/support",       icon: MessageSquare },
  { name: "Analytics",     href: "/analytics",     icon: BarChart      },
  { name: "Settings",      href: "/settings",      icon: Settings      },
];
const ALL_NAV = [...NAV_MAIN, ...NAV_SYSTEM];

/* ─── Reusable nav item ──────────────────────────── */
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

/* ─── Main layout ────────────────────────────────── */
export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [account,     setAccount]     = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) { logout(); navigate("/login"); }
    else setAccount(getAccount());
  }, [navigate]);

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const getPageTitle = () => {
    if (location.pathname === "/") return "Overview";
    return ALL_NAV.find(i => i.href !== "/" && location.pathname.startsWith(i.href))?.name ?? "Dashboard";
  };

  const handleNavClick = (href: string) => { navigate(href); setSidebarOpen(false); };
  const handleLogout   = () => { logout(); navigate("/login"); };

  const renderPage = () => {
    switch (location.pathname) {
      case "/":              return <AdminHome />;
      case "/users":         return <UsersPage />;
      case "/riders":        return <RidersPage />;
      case "/vendors":       return <VendorsPage />;
      case "/orders":        return <OrdersPage />;
      case "/products":      return <ProductPage />;
      case "/transactions":  return <Finance />;
      case "/notifications": return <NotificationsPage />;
      case "/support":       return <SupportPage />;
      case "/settings":      return <SettingPage />;
      case "/analytics":     return <AdminAnalytics />;
      default:               return <AdminHome />;
    }
  };

  /* Loading screen */
  if (!account) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Authenticating…</p>
      </div>
    </div>
  );

  const initials = account?.email?.[0]?.toUpperCase() ?? "A";

  return (
    /*
     * Root container:
     *   h-screen  →  locked to viewport height
     *   overflow-hidden  →  nothing leaks outside
     */
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F6FB]">

      {/* Mobile dim overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════
          SIDEBAR
          - Pure white, fixed height, own scroll
          ════════════════════════════════════════ */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-[232px]
        bg-white border-r border-slate-200/70 shadow-sm
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* ── Brand ── */}
        <div className="shrink-0 flex items-center gap-3 h-16 px-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                          flex items-center justify-center shadow-lg shadow-indigo-200/60">
            <span className="text-white font-black text-sm">AG</span>
          </div>
          <div className="leading-none">
            <p className="text-[14.5px] font-bold text-slate-800">AquaGas</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Admin</p>
          </div>
        </div>

        {/* ── Navigation (scrollable) ── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-5 pb-4 space-y-0.5">

          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Main
          </p>
          {NAV_MAIN.map(({ name, href, icon }) => (
            <NavItem key={href} name={name} icon={icon}
              active={isActive(href)} onClick={() => handleNavClick(href)} />
          ))}

          <p className="px-3 pt-5 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            System
          </p>
          {NAV_SYSTEM.map(({ name, href, icon }) => (
            <NavItem key={href} name={name} icon={icon}
              active={isActive(href)} onClick={() => handleNavClick(href)} />
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="shrink-0 p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl
                          hover:bg-slate-50 transition group cursor-default">
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
              className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition"
            >
              <LogOut className="w-[15px] h-[15px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN COLUMN
          ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header — shrink-0 keeps it pinned ── */}
        <header className="shrink-0 h-16 bg-white border-b border-slate-200/70
                           flex items-center px-6 gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] z-30">

          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700
                       hover:bg-slate-100 rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title + date */}
          <div>
            <h1 className="text-[16px] font-bold text-slate-800 leading-tight">
              {getPageTitle()}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400 leading-tight mt-0.5">
              {new Date().toLocaleDateString("en-KE", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">

            {/* Live badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-emerald-50 border border-emerald-100 text-emerald-600
                             text-[12px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System Live
            </span>

            {/* User chip (desktop only) */}
            <div className="hidden lg:flex items-center gap-2.5 pl-4 border-l border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
                              flex items-center justify-center text-white font-bold text-[13px]
                              shadow-sm shadow-indigo-200">
                {initials}
              </div>
              <div className="leading-tight">
                <p className="text-[12.5px] font-semibold text-slate-700 truncate max-w-[130px]">
                  {account?.email ?? "admin@aquagas.com"}
                </p>
                <p className="text-[11px] text-slate-400 capitalize">
                  {account?.role ?? "administrator"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Content — THIS is the only scrollable area ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
