import React, { useEffect, useState } from "react";
import type { UpdateUserData, User } from "../../types";
import UserTable from "./components/UserTable";
import UserModal from "./components/UserModal";
import UserDetailsModal from "./components/UserDetailsModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import FilterBar from "./components/FilterBar";
import ExportButton from "./components/ExportButton";
import toast from "react-hot-toast";

// ✅ Import services directly (no props needed)
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../../services/userService";

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listUsers();
      setUsers(response.data || []);
      setFilteredUsers(response.data || []);
      toast.success("Users loaded successfully");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to load users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (u.phone_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }
    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
    try {
      setLoading(true);
      setError(null);

      if (selectedUser) {
        // Update existing user
        const updateData: Partial<UpdateUserData> = {
          fullName: data.fullName,
          email: data.email,
          phone_number: data.phone_number,
        };
        
        // Handle role with proper type casting
        if (data.role) {
          const roleLower = data.role.toLowerCase();
          if (roleLower === 'admin' || roleLower === 'vendor' || roleLower === 'rider' || roleLower === 'customer') {
            updateData.role = roleLower as 'admin' | 'vendor' | 'rider' | 'customer';
          }
        }
        
        // Handle status with proper type casting
        if (data.status) {
          const statusLower = data.status.toLowerCase();
          if (statusLower === 'active' || statusLower === 'inactive') {
            updateData.status = statusLower as 'active' | 'inactive';
          }
        }
        
        if (data.password) {
          updateData.password = data.password;
        }
        
        await updateUser(selectedUser.id, updateData);
        toast.success("User updated successfully");
      } else {
        // Create new user
        const { fullName, email, phone_number, password, role, status } = data;
        if (!fullName || (!email && !phone_number) || !password || !role) {
          throw new Error(
            "Missing required fields: fullName, email or phone_number, password, and role are required"
          );
        }
        
        const roleLower = role.toLowerCase();
        const statusLower = (status || "active").toLowerCase();
        
        if (roleLower !== 'admin' && roleLower !== 'vendor' && roleLower !== 'rider' && roleLower !== 'customer') {
          throw new Error("Invalid role specified");
        }
        
        if (statusLower !== 'active' && statusLower !== 'inactive') {
          throw new Error("Invalid status specified");
        }
        
        await createUser({
          fullName,
          email,
          phone_number,
          password,
          role: roleLower as 'admin' | 'vendor' | 'rider' | 'customer',
          status: statusLower as 'active' | 'inactive',
        });
        toast.success("User created successfully");
      }

      await fetchUsers();
      setShowUserModal(false);
      setSelectedUser(undefined);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err.message ||
        "Failed to save user. Please check the form and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      setError(null);
      await deleteUser(selectedUser.id);
      await fetchUsers();
      setShowDeleteModal(false);
      setSelectedUser(undefined);
      toast.success("User deleted successfully");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to delete user";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setError(null);
      const newStatus = user.status === "active" || user.status === "Active" ? "inactive" : "active";
      await toggleUserStatus(user.id, newStatus as 'active' | 'inactive');
      await fetchUsers();
      toast.success("User status updated");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to update status";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gray-100 dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        User Management
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <FilterBar onSearch={setSearchTerm} onFilter={setStatusFilter} />
        <ExportButton users={filteredUsers} />
      </div>

      <button
        onClick={() => setShowUserModal(true)}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-xl shadow-md transition-colors"
      >
        Add User
      </button>

      {error && (
        <p className="text-red-500 mb-4 flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">
            Loading users...
          </div>
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          isLoading={loading}
          onEdit={(user) => {
            setSelectedUser(user);
            setShowUserModal(true);
          }}
          onDelete={(user) => {
            setSelectedUser(user);
            setShowDeleteModal(true);
          }}
          onToggleStatus={handleToggleStatus}
          onViewDetails={(user) => {
            setSelectedUser(user);
            setShowDetailsModal(true);
          }}
        />
      )}

      <UserModal
        isOpen={showUserModal}
        user={selectedUser}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(undefined);
        }}
        onSave={handleSaveUser}
        loading={loading}
      />

      <UserDetailsModal
        isOpen={showDetailsModal}
        user={selectedUser}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(undefined);
        }}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        user={selectedUser}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(undefined);
        }}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
};

export default UsersPage;