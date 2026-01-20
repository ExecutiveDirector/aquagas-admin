import React, { useEffect, useState } from "react";
import type { UpdateUserData, User } from "../../types";
import UserTable from "./components/UserTable";
import UserModal from "./components/UserModal";
import UserDetailsModal from "./components/UserDetailsModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import FilterBar from "./components/FilterBar";
import ExportButton from "./components/ExportButton";
import toast from "react-hot-toast";

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
        const updateData: Partial<UpdateUserData> = {
          fullName: data.fullName,
          email: data.email,
          phone_number: data.phone_number,
        };
        if (data.role) {
          const roleLower = data.role.toLowerCase();
          if (["admin", "vendor", "rider", "customer"].includes(roleLower)) {
            updateData.role = roleLower as 'admin' | 'vendor' | 'rider' | 'customer';
          }
        }
        if (data.status) {
          const statusLower = data.status.toLowerCase();
          if (["active", "inactive"].includes(statusLower)) {
            updateData.status = statusLower as 'active' | 'inactive';
          }
        }
        if (data.password) updateData.password = data.password;
        await updateUser(selectedUser.id, updateData);
        toast.success("User updated successfully");
      } else {
        const { fullName, email, phone_number, password, role, status } = data;
        if (!fullName || (!email && !phone_number) || !password || !role) {
          throw new Error(
            "Missing required fields: fullName, email or phone_number, password, and role are required"
          );
        }
        const roleLower = role.toLowerCase();
        const statusLower = (status || "active").toLowerCase();
        if (!["admin","vendor","rider","customer"].includes(roleLower)) throw new Error("Invalid role");
        if (!["active","inactive"].includes(statusLower)) throw new Error("Invalid status");
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
      const newStatus = user.status.toLowerCase() === "active" ? "inactive" : "active";
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
    <div className="container mx-auto p-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
        User Management
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <FilterBar onSearch={setSearchTerm} onFilter={setStatusFilter} />
        <ExportButton users={filteredUsers} />
      </div>

      <button
        onClick={() => setShowUserModal(true)}
        className="mb-6 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-300 text-white font-medium py-2 px-4 rounded-xl shadow transition-all duration-200"
      >
        Add User
      </button>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
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
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-gray-600 dark:text-gray-400 text-lg animate-pulse">
            Loading users...
          </span>
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
