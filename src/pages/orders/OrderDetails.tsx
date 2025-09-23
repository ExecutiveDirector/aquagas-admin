// OrderDetails.tsx
import React, { useState } from 'react';
import { Clock, DollarSign, Truck, User } from 'lucide-react';

interface Order {
  order_id: string;
  order_number: string;
  customer_id: string;
  outlet_id: string;
  vendor_id: string;
  vendor_name?: string;
  order_status: 'draft' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed';
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  delivery_type: 'home_delivery' | 'pickup' | 'scheduled';
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  customer?: { full_name: string; phone: string };
  rider?: { full_name: string; phone: string };
}

interface OrderItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderDetailsProps {
  order: Order;
  onUpdateStatus: (orderId: string, data: { status: Order['order_status']; notes?: string }) => Promise<void>;
  onAssignRider: (orderId: string, riderId: string) => Promise<void>;
  onRefund: (orderId: string, data: { amount: number; reason: string }) => Promise<void>;
  loading?: boolean;
}

export default function OrderDetails({ order, onUpdateStatus, onAssignRider, onRefund, loading }: OrderDetailsProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(order.order_status);
  const [statusNotes, setStatusNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(order.total_amount);
  const [refundReason, setRefundReason] = useState('');
  const [riderId, setRiderId] = useState('');

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateStatus(order.order_id, { status: newStatus, notes: statusNotes });
      setIsEditingStatus(false);
    } catch (error) {
      // Handled by parent
    }
  };

  const handleAssignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderId) return;
    try {
      await onAssignRider(order.order_id, riderId);
      setRiderId('');
    } catch (error) {
      // Handled by parent
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onRefund(order.order_id, { amount: refundAmount, reason: refundReason });
      setRefundAmount(order.total_amount);
      setRefundReason('');
    } catch (error) {
      // Handled by parent
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order #{order.order_number}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Status: {order.order_status} | Payment: {order.payment_status}
          </p>
        </div>
        <div className="flex space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm ${
            order.order_status === 'delivered' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
            order.order_status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
            'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
          }`}>
            {order.order_status}
          </div>
        </div>
      </div>

      {/* Order Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Customer</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {order.customer?.full_name || 'Guest'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ID: {order.customer_id}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Total</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                KES {order.total_amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Created</p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Delivery Type</p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {order.delivery_type}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {order.order_items?.map((item) => (
                <tr key={item.item_id}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">KES {item.unit_price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">KES {item.total_price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4">Update Status</h4>
          <form onSubmit={handleUpdateStatus}>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as Order['order_status'])}
              className="w-full px-4 py-2 border rounded-lg mb-2"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <input
              type="text"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-4 py-2 border rounded-lg mb-2"
            />
            <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              Update Status
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4">Assign Rider</h4>
          <form onSubmit={handleAssignRider}>
            <input
              type="text"
              value={riderId}
              onChange={(e) => setRiderId(e.target.value)}
              placeholder="Rider ID"
              className="w-full px-4 py-2 border rounded-lg mb-2"
            />
            <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              Assign Rider
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4">Refund Order</h4>
          <form onSubmit={handleRefund}>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
              placeholder="Refund Amount"
              className="w-full px-4 py-2 border rounded-lg mb-2"
            />
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason"
              className="w-full px-4 py-2 border rounded-lg mb-2"
            />
            <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
              Process Refund
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}