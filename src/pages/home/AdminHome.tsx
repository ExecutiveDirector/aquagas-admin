// src/pages/AdminHome.tsx
// Modern Admin Dashboard UI/UX for AquaGas
//Delivery-App

import { useEffect, useState } from "react"; import { motion } from "framer-motion"; import { TrendingUp, Users, Store, Bike, DollarSign, RefreshCcw } from "lucide-react"; import { getDashboardStats } from "../../services/api"; import { listOrders } from "../../services/orderService";

interface DashboardStats { users: number; vendors: number; riders: number; orders: number; todayRevenue: number; totalRevenue?: number; pendingOrders?: number; completedOrders?: number; }

interface Order { id: string; customerName: string; vendorName: string; totalAmount: number; status: string; createdAt: string; }

export default function AdminHomeV2() { const [stats, setStats] = useState<DashboardStats | null>(null); const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true);

const load = async () => { setLoading(true); const s = await getDashboardStats(); const o = await listOrders(1, 5); setStats(s); setOrders(o?.data || []); setLoading(false); };

useEffect(() => { load(); }, []);

const cards = [ { title: "Users", value: stats?.users, icon: Users, color: "bg-blue-500" }, { title: "Vendors", value: stats?.vendors, icon: Store, color: "bg-green-500" }, { title: "Riders", value: stats?.riders, icon: Bike, color: "bg-purple-500" }, { title: "Revenue Today", value: $${stats?.todayRevenue ?? 0}, icon: DollarSign, color: "bg-orange-500" }, ];

return ( <div className="p-6 space-y-8 bg-gray-50 min-h-screen"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold">AquaGas Admin</h1> <p className="text-gray-500">Real‑time business overview</p> </div> <button
onClick={load}
className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
> <RefreshCcw size={18} /> Refresh </button> </div>

{/* KPI Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {cards.map((c, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="bg-white rounded-2xl shadow p-6 flex items-center gap-4"
      >
        <div className={`p-4 rounded-xl text-white ${c.color}`}>
          <c.icon />
        </div>
        <div>
          <div className="text-gray-500 text-sm">{c.title}</div>
          <div className="text-2xl font-bold">{loading ? "—" : c.value}</div>
        </div>
      </motion.div>
    ))}
  </div>

  {/* Revenue + Orders Summary */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-1 bg-white rounded-2xl shadow p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="text-green-600" /> Revenue Summary
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Total Revenue</span>
          <span className="font-semibold">${stats?.totalRevenue ?? 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Completed Orders</span>
          <span className="font-semibold">{stats?.completedOrders ?? 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Pending Orders</span>
          <span className="font-semibold">{stats?.pendingOrders ?? 0}</span>
        </div>
      </div>
    </div>

    {/* Orders Table */}
    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
      <h3 className="font-semibold mb-4">Recent Orders</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 text-left">Order</th>
              <th className="py-2 text-left">Customer</th>
              <th className="py-2 text-left">Vendor</th>
              <th className="py-2 text-left">Total</th>
              <th className="py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-none">
                <td className="py-2 font-mono">#{o.id.slice(0, 6)}</td>
                <td className="py-2">{o.customerName}</td>
                <td className="py-2">{o.vendorName}</td>
                <td className="py-2 font-semibold">${o.totalAmount}</td>
                <td className="py-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    o.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : o.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

); }