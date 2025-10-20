import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { MoreVertical, Eye, Edit, Trash2, ToggleLeft, ToggleRight, User as UserIcon } from 'lucide-react';

const useClickOutside = (ref: React.RefObject<any>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onViewDetails: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => {
    setOpenDropdown(null);
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'vendor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'rider': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'user': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'customer': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getFullName = (user: User) => {
    // Support both old and new format
    if (user.fullName) return user.fullName;
    const first = user.first_name || '';
    const last = user.last_name || '';
    return `${first} ${last}`.trim() || 'N/A';
  };

  const getInitials = (user: User) => {
    // Support both old and new format
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
    return (first + last) || 'U';
  };

  const getStatusDisplay = (status?: string) => {
    if (!status) return 'N/A';
    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const isActive = (user: User) => {
    // Support both 'Active' and 'active', also check is_active field
    return user.status?.toLowerCase() === 'active' || user.is_active === true;
  };

  const SkeletonRow = ({ index }: { index: number }) => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </td>
    </tr>
  );

  const EmptyState = () => (
    <tr>
      <td colSpan={5} className="px-6 py-16">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Get started by creating your first user or adjust your search filters.
          </p>
        </div>
      </td>
    </tr>
  );

  const renderTableContent = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <SkeletonRow key={index} index={index} />
      ));
    }

    if (users.length === 0) {
      return <EmptyState />;
    }

    return users.map((user) => {
      const userIsActive = isActive(user);
      const fullName = getFullName(user);
      const initials = getInitials(user);
      
      return (
        <tr
          key={user.id}
          className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200 border-b border-gray-200 dark:border-gray-700"
          onMouseEnter={() => setHoveredRow(user.id)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          <td className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 h-10 w-10 relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {initials}
                </div>
                {userIsActive && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {fullName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email || 'No email'}
                </div>
              </div>
            </div>
          </td>
          
          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center">
              <span className="truncate">{user.phone_number || 'N/A'}</span>
            </div>
          </td>
          
          <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role || '')}`}>
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
            </span>
          </td>
          
          <td className="px-6 py-4">
            <button
              onClick={() => onToggleStatus(user)}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                userIsActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 focus:ring-green-500 hover:bg-green-200 dark:hover:bg-green-900/60'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 focus:ring-red-500 hover:bg-red-200 dark:hover:bg-red-900/60'
              }`}
              title={`Click to ${userIsActive ? 'deactivate' : 'activate'} user`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${userIsActive ? 'bg-green-600' : 'bg-red-600'}`}></div>
              {getStatusDisplay(user.status)}
            </button>
          </td>
          
          <td className="px-6 py-4 text-right">
            <div className="relative inline-block text-left" ref={openDropdown === user.id ? dropdownRef : null}>
              <button
                onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                  hoveredRow === user.id || openDropdown === user.id
                    ? 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <MoreVertical size={18} />
              </button>
              
              {openDropdown === user.id && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-20 animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="py-1">
                    <button
                      onClick={() => { onViewDetails(user); setOpenDropdown(null); }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
                    >
                      <Eye size={16} className="mr-3 text-gray-400 group-hover:text-indigo-500" />
                      View Details
                    </button>
                    
                    <button
                      onClick={() => { onEdit(user); setOpenDropdown(null); }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
                    >
                      <Edit size={16} className="mr-3 text-gray-400 group-hover:text-blue-500" />
                      Edit User
                    </button>
                    
                    <button
                      onClick={() => { onToggleStatus(user); setOpenDropdown(null); }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
                    >
                      {userIsActive ? (
                        <ToggleLeft size={16} className="mr-3 text-gray-400 group-hover:text-orange-500" />
                      ) : (
                        <ToggleRight size={16} className="mr-3 text-gray-400 group-hover:text-green-500" />
                      )}
                      {userIsActive ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    
                    <button
                      onClick={() => { onDelete(user); setOpenDropdown(null); }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150"
                    >
                      <Trash2 size={16} className="mr-3 group-hover:text-red-600" />
                      Delete User
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {renderTableContent()}
          </tbody>
        </table>
      </div>
      
      {!isLoading && users.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium text-gray-900 dark:text-gray-100">{users.length}</span> user{users.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;