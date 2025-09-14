import React, { useEffect, useState } from 'react';
import {
  getDashboardStats,
  listVendors,
  vendorRegister,
  getVendorDetails,
  getVendorProducts,
  getVendorReviews,
  getRecentOrders,
  getInventory,
  updateInventory,
  recordInventoryMovement,
  getLowStockAlerts,
  getVendorOrders,
  updateOrderStatus,
  getVendorOrderDetails,
  getSalesAnalytics,
  getProductAnalytics,
  getOutlets,
  createOutlet,
  updateOutlet,
  updateVendor, // New import
} from '../../services/adminService';
import { Store } from 'lucide-react';

// Type definitions (unchanged)
interface Vendor {
  vendor_id: string;
  business_name: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
  business_registration_no?: string;
  tax_pin?: string;
  license_number?: string;
  contact_person: string;
  business_phone?: string;
  business_email?: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_featured: boolean;
  commission_rate: number;
  minimum_order_amount: number;
  delivery_radius_km: number;
  average_prep_time_minutes: number;
  business_hours?: string;
  verification_documents?: string;
  bank_account_details?: string;
  currency: string;
  is_active: boolean;
  outlets?: Outlet[];
  created_at: string;
  updated_at: string;
}

interface Product {
  product_id: string;
  name: string;
  stock: number;
  price: number;
  vendor_id: string;
}

interface Review {
  review_id: string;
  rating: number;
  comment: string;
  vendor_id: string;
  user_id: string;
  created_at: string;
}

interface Order {
  order_id: string;
  vendor_id: string;
  user_id: string;
  status: string;
  order_value: number;
  items?: OrderItem[];
  created_at: string;
}

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
}

interface Outlet {
  outlet_id: string;
  vendor_id: string;
  name: string;
  address: string;
  created_at: string;
}

interface SalesAnalytics {
  revenue: number;
  totalSales?: number;
  period?: string;
}

interface ProductAnalytics extends Product {
  orders: Order[];
  totalSold?: number;
}

export default function VendorsPage() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    business_name: '',
    contact_person: '',
    business_phone: '',
    business_email: '',
    password: '',
  });
  const [updateFormData, setUpdateFormData] = useState({
    business_name: '',
    contact_person: '',
    business_phone: '',
    business_email: '',
    trading_name: '',
  });
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [vendorReviews, setVendorReviews] = useState<Review[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([]);
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [newOutlet, setNewOutlet] = useState({ name: '', address: '' });
  const [inventoryUpdate, setInventoryUpdate] = useState({ productId: '', updates: {} });
  const [inventoryMovement, setInventoryMovement] = useState({ product_id: '', quantity: 0, type: 'in' as 'in' | 'out' });
  const [orderStatusUpdate, setOrderStatusUpdate] = useState({ orderId: '', status: '' });

  useEffect(() => {
    (async () => {
      try {
        const response = await listVendors();
        setItems(response.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load vendors');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectVendor = async (vendorId: string) => {
    setSelectedVendor(vendorId);
    setActiveTab('details');
    try {
      const [details, products, reviews, stats, orders, inventoryData, lowStock, vendorOrdersData, sales, productAnalyticsData, outletsData] = await Promise.all([
        getVendorDetails(vendorId),
        getVendorProducts(vendorId),
        getVendorReviews(vendorId),
        getDashboardStats(vendorId),
        getRecentOrders(vendorId),
        getInventory(vendorId),
        getLowStockAlerts(vendorId),
        getVendorOrders(vendorId),
        getSalesAnalytics(vendorId),
        getProductAnalytics(vendorId),
        getOutlets(vendorId),
      ]);
      setVendorDetails(details.data);
      setVendorProducts(products.data || []);
      setVendorReviews(reviews.data || []);
      setDashboardStats(stats);
      setRecentOrders(orders.data || []);
      setInventory(inventoryData.data || []);
      setLowStockAlerts(lowStock.data || []);
      setVendorOrders(vendorOrdersData.data || []);
      setSalesAnalytics(sales.data);
      setProductAnalytics(productAnalyticsData.data || []);
      setOutlets(outletsData.data || []);
      // Initialize update form with current vendor details
      setUpdateFormData({
        business_name: details.data.business_name || '',
        contact_person: details.data.contact_person || '',
        business_phone: details.data.business_phone || '',
        business_email: details.data.business_email || '',
        trading_name: details.data.trading_name || '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load vendor details');
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await vendorRegister({
        business_name: formData.business_name,
        contact_person: formData.contact_person,
        business_email: formData.business_email,
        business_phone: formData.business_phone,
        password: formData.password,
      });
      alert('Vendor added successfully: ' + response.message);
      setFormData({
        business_name: '',
        contact_person: '',
        business_email: '',
        business_phone: '',
        password: '',
      });
      const updatedVendors = await listVendors();
      setItems(updatedVendors.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to add vendor');
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      const response = await updateVendor(selectedVendor, updateFormData);
      alert('Vendor updated successfully: ' + response.message);
      const updatedDetails = await getVendorDetails(selectedVendor);
      setVendorDetails(updatedDetails.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update vendor');
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      const response = await updateInventory(selectedVendor, inventoryUpdate.productId, inventoryUpdate.updates);
      alert('Inventory updated: ' + response.message);
      const updatedInventory = await getInventory(selectedVendor);
      setInventory(updatedInventory.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update inventory');
    }
  };

  const handleRecordInventoryMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      const response = await recordInventoryMovement(selectedVendor, inventoryMovement);
      alert('Inventory movement recorded: ' + response.message);
      const updatedInventory = await getInventory(selectedVendor);
      setInventory(updatedInventory.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to record inventory movement');
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      const response = await updateOrderStatus(selectedVendor, orderStatusUpdate.orderId, orderStatusUpdate.status);
      alert('Order status updated: ' + response.message);
      const updatedOrders = await getVendorOrders(selectedVendor);
      setVendorOrders(updatedOrders.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      const response = await createOutlet(selectedVendor, newOutlet);
      alert('Outlet created: ' + response.message);
      const updatedOutlets = await getOutlets(selectedVendor);
      setOutlets(updatedOutlets.data || []);
      setNewOutlet({ name: '', address: '' });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create outlet');
    }
  };

  const handleUpdateOutlet = async (outletId: string, updates: { name?: string; address?: string }) => {
    if (!selectedVendor) return;
    try {
      const response = await updateOutlet(selectedVendor, outletId, updates);
      alert('Outlet updated: ' + response.message);
      const updatedOutlets = await getOutlets(selectedVendor);
      setOutlets(updatedOutlets.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update outlet');
    }
  };

  const handleGetOrderDetails = async (orderId: string) => {
    if (!selectedVendor) return;
    try {
      const response = await getVendorOrderDetails(selectedVendor, orderId);
      setOrderDetails(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load order details');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Vendors</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((v, index) => (
                    <tr key={v.vendor_id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/20' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{v.vendor_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{v.business_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{v.business_email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{v.contact_person}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleSelectVendor(v.vendor_id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'logistics':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Admin Logistics</h2>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Vendor</h3>
            <form className="space-y-4 max-w-md" onSubmit={handleAddVendor}>
              <input
                type="text"
                placeholder="Business Name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Contact Person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="email"
                placeholder="Business Email"
                value={formData.business_email}
                onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Business Phone Number"
                value={formData.business_phone}
                onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Vendor
              </button>
            </form>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Other Logistics Actions</h3>
            <p className="text-gray-600 dark:text-gray-400">Additional logistics features can be added here (e.g., manage delivery zones, assign riders, etc.).</p>
          </div>
        );
      case 'details':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Vendor Details</h2>
            {vendorDetails && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Update Vendor</h3>
                <form className="space-y-4 max-w-md" onSubmit={handleUpdateVendor}>
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={updateFormData.business_name}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, business_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={updateFormData.contact_person}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Business Email"
                    value={updateFormData.business_email}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, business_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Business Phone Number"
                    value={updateFormData.business_phone}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, business_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Trading Name"
                    value={updateFormData.trading_name}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, trading_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Vendor
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>ID:</strong> {vendorDetails.vendor_id}</p>
                    <p><strong>Business Name:</strong> {vendorDetails.business_name}</p>
                    <p><strong>Trading Name:</strong> {vendorDetails.trading_name || 'N/A'}</p>
                    <p><strong>Contact Person:</strong> {vendorDetails.contact_person}</p>
                    <p><strong>Business Email:</strong> {vendorDetails.business_email || 'N/A'}</p>
                    <p><strong>Business Phone:</strong> {vendorDetails.business_phone || 'N/A'}</p>
                    <p><strong>Brand:</strong> {vendorDetails.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Rating:</strong> {vendorDetails.rating}/5 ({vendorDetails.total_reviews} reviews)</p>
                    <p><strong>Verified:</strong> {vendorDetails.is_verified ? 'Yes' : 'No'}</p>
                    <p><strong>Featured:</strong> {vendorDetails.is_featured ? 'Yes' : 'No'}</p>
                    <p><strong>Active:</strong> {vendorDetails.is_active ? 'Yes' : 'No'}</p>
                    <p><strong>Commission Rate:</strong> {(vendorDetails.commission_rate * 100).toFixed(2)}%</p>
                    <p><strong>Min Order Amount:</strong> {vendorDetails.currency} {vendorDetails.minimum_order_amount}</p>
                    <p><strong>Delivery Radius:</strong> {vendorDetails.delivery_radius_km} km</p>
                    <p><strong>Avg Prep Time:</strong> {vendorDetails.average_prep_time_minutes} minutes</p>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Outlets ({outlets.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {outlets.map((outlet) => (
                    <li key={outlet.outlet_id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      <span>{outlet.name} - {outlet.address}</span>
                      <button
                        onClick={() => {
                          const newName = prompt('New name:');
                          if (newName) handleUpdateOutlet(outlet.outlet_id, { name: newName });
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Update
                      </button>
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Create Outlet</h3>
                <form className="space-y-4 max-w-md" onSubmit={handleCreateOutlet}>
                  <input
                    type="text"
                    placeholder="Outlet Name"
                    value={newOutlet.name}
                    onChange={(e) => setNewOutlet({ ...newOutlet, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Outlet Address"
                    value={newOutlet.address}
                    onChange={(e) => setNewOutlet({ ...newOutlet, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Outlet
                  </button>
                </form>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Products ({vendorProducts.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {vendorProducts.map((product) => (
                    <li key={product.product_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      {product.name} - Stock: {product.stock} - Price: ${product.price}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Current Inventory ({inventory.length} items)</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {inventory.map((item) => (
                    <li key={item.product_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      {item.name} - Stock: {item.stock} - Price: ${item.price}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Inventory Management</h3>
                <form className="space-y-4 max-w-md" onSubmit={handleUpdateInventory}>
                  <input
                    type="text"
                    placeholder="Product ID"
                    value={inventoryUpdate.productId}
                    onChange={(e) => setInventoryUpdate({ ...inventoryUpdate, productId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Updates (JSON)"
                    value={JSON.stringify(inventoryUpdate.updates)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || '{}');
                        setInventoryUpdate({ ...inventoryUpdate, updates: parsed });
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Inventory
                  </button>
                </form>

                <form className="space-y-4 max-w-md mt-4" onSubmit={handleRecordInventoryMovement}>
                  <input
                    type="text"
                    placeholder="Product ID"
                    value={inventoryMovement.product_id}
                    onChange={(e) => setInventoryMovement({ ...inventoryMovement, product_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={inventoryMovement.quantity}
                    onChange={(e) => setInventoryMovement({ ...inventoryMovement, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <select
                    value={inventoryMovement.type}
                    onChange={(e) => setInventoryMovement({ ...inventoryMovement, type: e.target.value as 'in' | 'out' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="in">In</option>
                    <option value="out">Out</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Record Movement
                  </button>
                </form>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Low Stock Alerts ({lowStockAlerts.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {lowStockAlerts.map((product) => (
                    <li key={product.product_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded text-red-600 dark:text-red-400">
                      {product.name} - Stock: {product.stock}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Reviews ({vendorReviews.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {vendorReviews.map((review) => (
                    <li key={review.review_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      Rating: {review.rating}/5 - {review.comment}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Dashboard Stats</h3>
                {dashboardStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase">Total Users</h4>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardStats.users}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase">Total Vendors</h4>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{dashboardStats.vendors}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase">Total Riders</h4>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{dashboardStats.riders}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase">Today's Revenue</h4>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">${dashboardStats.todayRevenue}</p>
                    </div>
                    {dashboardStats.totalRevenue && (
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-teal-600 dark:text-teal-400 uppercase">Total Revenue</h4>
                        <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">${dashboardStats.totalRevenue}</p>
                      </div>
                    )}
                    {dashboardStats.pendingOrders && (
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase">Pending Orders</h4>
                        <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{dashboardStats.pendingOrders}</p>
                      </div>
                    )}
                    {dashboardStats.completedOrders && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase">Completed Orders</h4>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{dashboardStats.completedOrders}</p>
                      </div>
                    )}
                  </div>
                )}

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Recent Orders ({recentOrders.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {recentOrders.map((order) => (
                    <li key={order.order_id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      <span>Order {order.order_id} - Status: {order.status} - Value: ${order.order_value}</span>
                      <button
                        onClick={() => handleGetOrderDetails(order.order_id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Vendor Orders ({vendorOrders.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {vendorOrders.map((order) => (
                    <li key={order.order_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      Order {order.order_id} - Status: {order.status} - Value: ${order.order_value}
                    </li>
                  ))}
                </ul>

                {orderDetails && (
                  <div className="mt-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Order Details</h4>
                    <p><strong>Order ID:</strong> {orderDetails.order_id}</p>
                    <p><strong>Status:</strong> {orderDetails.status}</p>
                    <p><strong>Order Value:</strong> ${orderDetails.order_value}</p>
                    <p><strong>Items:</strong></p>
                    <ul className="list-disc pl-5 space-y-2">
                      {orderDetails.items?.map((item) => (
                        <li key={item.product_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                          {item.name} - Qty: {item.quantity} - Price: ${item.price}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Update Order Status</h3>
                <form className="space-y-4 max-w-md" onSubmit={handleUpdateOrderStatus}>
                  <input
                    type="text"
                    placeholder="Order ID"
                    value={orderStatusUpdate.orderId}
                    onChange={(e) => setOrderStatusUpdate({ ...orderStatusUpdate, orderId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Status"
                    value={orderStatusUpdate.status}
                    onChange={(e) => setOrderStatusUpdate({ ...orderStatusUpdate, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Status
                  </button>
                </form>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Sales Analytics</h3>
                {salesAnalytics && (
                  <div className="space-y-2">
                    <p><strong>Total Revenue:</strong> ${salesAnalytics.revenue}</p>
                    {salesAnalytics.totalSales && <p><strong>Total Sales:</strong> {salesAnalytics.totalSales}</p>}
                    {salesAnalytics.period && <p><strong>Period:</strong> {salesAnalytics.period}</p>}
                  </div>
                )}

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6">Product Analytics ({productAnalytics.length})</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {productAnalytics.map((product) => (
                    <li key={product.product_id} className="bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                      {product.name} - Orders: {product.orders?.length || 0}
                      {product.totalSold && ` - Total Sold: ${product.totalSold}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      default:
        return <div className="text-red-600 dark:text-red-400">Invalid tab</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading vendors...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 flex items-center justify-center mb-4">
            <Store className="w-8 h-8 mr-2" />
            <span className="text-lg font-semibold">Error</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('list')}
        >
          Vendors List
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'logistics'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('logistics')}
        >
          Admin Logistics
        </button>
        {selectedVendor && (
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Vendor Details
          </button>
        )}
      </nav>

      <main>{renderTabContent()}</main>
    </div>
  );
}
