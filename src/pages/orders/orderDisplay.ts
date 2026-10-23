// Display config for the detailed admin order statuses (mirrors backend utils/orderDisplay.js).
export const DISPLAY_STATUS: Record<string, { label: string; cls: string }> = {
  new_order:         { label: 'New Order',           cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  vendor_accepted:   { label: 'Vendor Accepted',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  preparing:         { label: 'Preparing',           cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  ready_for_pickup:  { label: 'Ready for Pickup',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  waiting_for_rider: { label: 'Waiting for Rider',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  rider_assigned:    { label: 'Rider Assigned',      cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  rider_accepted:    { label: 'Rider Accepted',      cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  en_route_pickup:   { label: 'En Route to Pickup',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  arrived_pickup:    { label: 'Arrived at Pickup',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  picked_up:         { label: 'Picked Up',           cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  out_for_delivery:  { label: 'Out for Delivery',    cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  arrived_customer:  { label: 'Arrived at Customer', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  delivered:         { label: 'Delivered',           cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed:         { label: 'Completed',           cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  refunded:          { label: 'Refunded',            cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  vendor_rejected:   { label: 'Vendor Rejected',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  delivery_failed:   { label: 'Delivery Failed',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled:         { label: 'Cancelled',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  disputed:          { label: 'Disputed',            cls: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' },
};

export const DELAY_LABEL: Record<string, string> = {
  vendor_slow: 'Vendor not accepting',
  no_rider: 'No rider found',
  rider_no_show: 'Rider has not collected',
  delivery_overdue: 'Delivery overdue',
};

// Mirrors backend utils/orderStatus.js NEXT table (what an admin can do without an override).
export const ORDER_NEXT: Record<string, string[]> = {
  draft: ['pending', 'canceled'], pending: ['confirmed', 'canceled'],
  confirmed: ['preparing', 'ready', 'canceled'], preparing: ['ready', 'canceled'],
  ready: ['dispatched', 'canceled'], dispatched: ['delivered', 'canceled'],
  delivered: ['refunded'], canceled: [], refunded: [],
};
export const ALL_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'canceled', 'refunded'];
