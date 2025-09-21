import React, { useState } from 'react';

export interface AddVendorFormData {
  business_name: string;
  contact_person: string;
  business_phone: string;
  business_email: string;
  password: string;
}

interface AddVendorFormProps {
  onSubmit: (data: AddVendorFormData) => Promise<void>;
  loading?: boolean;
}

export default function AddVendorForm({ onSubmit, loading }: AddVendorFormProps) {
  const [formData, setFormData] = useState<AddVendorFormData>({
    business_name: '',
    contact_person: '',
    business_phone: '',
    business_email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<AddVendorFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<AddVendorFormData> = {};
    
    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    }
    
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }
    
    if (!formData.business_email.trim()) {
      newErrors.business_email = 'Business email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.business_email)) {
      newErrors.business_email = 'Please enter a valid email address';
    }
    
    if (!formData.business_phone.trim()) {
      newErrors.business_phone = 'Business phone is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        business_name: '',
        contact_person: '',
        business_phone: '',
        business_email: '',
        password: '',
      });
      setErrors({});
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleInputChange = (field: keyof AddVendorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add New Vendor</h2>
      
      <form className="space-y-4 max-w-md" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => handleInputChange('business_name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.business_name 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter business name"
            disabled={loading}
          />
          {errors.business_name && (
            <p className="text-red-500 text-xs mt-1">{errors.business_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact Person *
          </label>
          <input
            type="text"
            value={formData.contact_person}
            onChange={(e) => handleInputChange('contact_person', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.contact_person 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter contact person name"
            disabled={loading}
          />
          {errors.contact_person && (
            <p className="text-red-500 text-xs mt-1">{errors.contact_person}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Email *
          </label>
          <input
            type="email"
            value={formData.business_email}
            onChange={(e) => handleInputChange('business_email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.business_email 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter business email"
            disabled={loading}
          />
          {errors.business_email && (
            <p className="text-red-500 text-xs mt-1">{errors.business_email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Phone *
          </label>
          <input
            type="tel"
            value={formData.business_phone}
            onChange={(e) => handleInputChange('business_phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.business_phone 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter business phone number"
            disabled={loading}
          />
          {errors.business_phone && (
            <p className="text-red-500 text-xs mt-1">{errors.business_phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.password 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter password (min. 6 characters)"
            disabled={loading}
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding Vendor...
            </>
          ) : (
            'Add Vendor'
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Additional Features Available
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          After adding a vendor, you can manage delivery zones, assign riders, configure commission rates, and more through the vendor details section.
        </p>
      </div>
    </div>
  );
}