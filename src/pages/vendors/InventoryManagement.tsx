import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, Minus, Edit3, TrendingUp } from 'lucide-react';

interface Product {
  product_id: string;
  name: string;
  stock: number;
  price: number;
  vendor_id: string;
}

export interface InventoryMovement {
  product_id: string;
  quantity: number;
  type: 'in' | 'out';
}

interface InventoryManagementProps {
  inventory: Product[];
  lowStockAlerts: Product[];
  onUpdateInventory: (productId: string, updates: any) => Promise<void>;
  onRecordMovement: (movement: InventoryMovement) => Promise<void>;
  loading?: boolean;
}

export default function InventoryManagement({ 
  inventory, 
  lowStockAlerts, 
  onUpdateInventory, 
  onRecordMovement,
  loading 
}: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'alerts' | 'update' | 'movement'>('inventory');
  const [inventoryUpdate, setInventoryUpdate] = useState({ productId: '', updates: {} });
  const [inventoryMovement, setInventoryMovement] = useState<InventoryMovement>({ 
    product_id: '', 
    quantity: 0, 
    type: 'in' 
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryUpdate.productId) return;
    
    try {
      await onUpdateInventory(inventoryUpdate.productId, inventoryUpdate.updates);
      setInventoryUpdate({ productId: '', updates: {} });
      setSelectedProduct(null);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryMovement.product_id) return;
    
    try {
      await onRecordMovement(inventoryMovement);
      setInventoryMovement({ product_id: '', quantity: 0, type: 'in' });
    } catch (error) {
      // Error handling is done by parent component
    }
  };

//   const handleQuickUpdate = (product: Product, field: 'stock' | 'price', value: number) => {
//     setSelectedProduct(product);
//     setInventoryUpdate({
//       productId: product.product_id,
//       updates: { [field]: value }
//     });
//   };

  const tabs = [
    { id: 'inventory', label: 'Current Inventory', icon: Package },
    { id: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle },
    { id: 'update', label: 'Update Inventory', icon: Edit3 },
    { id: 'movement', label: 'Record Movement', icon: TrendingUp },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Inventory Management</h3>
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.id === 'alerts' && lowStockAlerts.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {lowStockAlerts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Current Inventory ({inventory.length} items)
            </h4>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Value: ${inventory.reduce((sum, item) => sum + (item.stock * item.price), 0).toFixed(2)}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inventory.map((item) => (
                  <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.product_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        item.stock < 10 
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' 
                          : item.stock < 50
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">${(item.stock * item.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedProduct(item);
                          setActiveTab('update');
                          setInventoryUpdate({ productId: item.product_id, updates: {} });
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Low Stock Alerts ({lowStockAlerts.length} items)
          </h4>
          
          {lowStockAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No low stock alerts at the moment!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.map((product) => (
                <div key={product.product_id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">{product.name}</p>
                      <p className="text-sm text-red-700 dark:text-red-300">Only {product.stock} units left</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveTab('movement');
                      setInventoryMovement({ product_id: product.product_id, quantity: 0, type: 'in' });
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'update' && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Update Inventory</h4>
          
          <form onSubmit={handleUpdateInventory} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product ID
              </label>
              <input
                type="text"
                value={inventoryUpdate.productId}
                onChange={(e) => setInventoryUpdate({ ...inventoryUpdate, productId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter product ID"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Updates (JSON format)
              </label>
              <textarea
                value={JSON.stringify(inventoryUpdate.updates, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '{}');
                    setInventoryUpdate({ ...inventoryUpdate, updates: parsed });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder='{"stock": 100, "price": 25.99}'
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Example: {"{"}"stock": 100, "price": 25.99{"}"}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Inventory'
              )}
            </button>
          </form>

          {selectedProduct && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Selected Product</h5>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {selectedProduct.name} (ID: {selectedProduct.product_id})
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Current Stock: {selectedProduct.stock} | Price: ${selectedProduct.price}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'movement' && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Record Inventory Movement</h4>
          
          <form onSubmit={handleRecordMovement} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product ID
              </label>
              <input
                type="text"
                value={inventoryMovement.product_id}
                onChange={(e) => setInventoryMovement({ ...inventoryMovement, product_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter product ID"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={inventoryMovement.quantity}
                onChange={(e) => setInventoryMovement({ ...inventoryMovement, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quantity"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Movement Type
              </label>
              <select
                value={inventoryMovement.type}
                onChange={(e) => setInventoryMovement({ ...inventoryMovement, type: e.target.value as 'in' | 'out' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="in">Stock In (Restock)</option>
                <option value="out">Stock Out (Sale/Loss)</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  {inventoryMovement.type === 'in' ? <Plus className="w-4 h-4 mr-2" /> : <Minus className="w-4 h-4 mr-2" />}
                  Record Movement
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}