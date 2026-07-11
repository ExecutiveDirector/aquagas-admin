// src/components/dashboard/QuickActions.tsx
// New addition (recommendation #1 "Quick Actions"). Each shortcut just
// navigates to an existing route already registered in DashboardLayout, so
// nothing new is introduced on the backend or routing side.
import { useNavigate } from "react-router-dom";
import { Store, Truck, Package, ShoppingCart, Bell, BarChart3 } from "lucide-react";

const ACTIONS = [
  { label: "Add Vendor", href: "/vendors", icon: Store, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Register Rider", href: "/riders", icon: Truck, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Create Product", href: "/products", icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Pending Orders", href: "/orders", icon: ShoppingCart, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Notifications", href: "/notifications", icon: Bell, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Reports", href: "/analytics", icon: BarChart3, color: "text-rose-600", bg: "bg-rose-50" },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map(({ label, href, icon: Icon, color, bg }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 text-center transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm dark:border-gray-700"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={17} className={color} />
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
