import React, { useEffect } from "react";
import { type User } from "../../../types";

interface UserDetailsModalProps {
  isOpen: boolean;
  user?: User;
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, user, onClose }) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'KSh 0.00';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Helper to get full name
  const getFullName = () => {
    if (user.fullName) return user.fullName;
    const first = user.first_name || '';
    const last = user.last_name || '';
    return `${first} ${last}`.trim() || 'N/A';
  };

  // Helper to get initials
  const getInitials = () => {
    if (user.fullName) {
      return user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
    }
    const first = user.first_name?.charAt(0)?.toUpperCase() || '';
    const last = user.last_name?.charAt(0)?.toUpperCase() || '';
    return first + last || 'U';
  };

  // Helper to format role for display
  const formatRole = (role?: string) => {
    if (!role) return 'N/A';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Helper to format status for display
  const formatStatus = (status?: string) => {
    if (!role) return 'N/A';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl transform transition-all sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-600">
                  {getInitials()}
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <p className="text-sm text-gray-500">{getFullName()}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-sm text-gray-900">{getFullName()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <p className="text-sm text-gray-900">{user.email || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <p className="text-sm text-gray-900">{user.phone_number || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <p className="text-sm text-gray-900 font-mono">{user.id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Account Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role?.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role?.toLowerCase() === 'vendor' ? 'bg-blue-100 text-blue-800' :
                    user.role?.toLowerCase() === 'rider' ? 'bg-green-100 text-green-800' :
                    user.role?.toLowerCase() === 'user' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formatRole(user.role)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.status?.toLowerCase() === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : user.status?.toLowerCase() === 'inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formatStatus(user.status)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Balance</label>
                  <p className="text-sm text-gray-900 font-semibold">{formatCurrency(user.walletBalance)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                  <p className="text-sm text-gray-900">{formatDate(user.lastLogin)}</p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Timestamps
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                  <p className="text-sm text-gray-900">{formatDate(user.created_at)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatDate(user.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;