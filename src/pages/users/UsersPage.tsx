import React, { useEffect, useMemo, useState } from "react";
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

  // =========================
  // Fetch Users
  // =========================
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

  // =========================
  // Filter Users
  // =========================
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

  // =========================
  // Statistics
  // =========================
  const stats = useMemo(() => {
    const total = users.length;

    const active = users.filter(
      (u) => u.status?.toLowerCase() === "active"
    ).length;

    const inactive = users.filter(
      (u) => u.status?.toLowerCase() === "inactive"
    ).length;

    const admins = users.filter(
      (u) => u.role?.toLowerCase() === "admin"
    ).length;

    return { total, active, inactive, admins };
  }, [users]);

  // =========================
  // Save User
  // =========================
  const handleSaveUser = async (
    data: Partial<User> & { password?: string }
  ) => {
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

          if (
            ["admin", "vendor", "rider", "customer"].includes(roleLower)
          ) {
            updateData.role =
              roleLower as "admin" | "vendor" | "rider" | "customer";
          }
        }

        if (data.status) {
          const statusLower = data.status.toLowerCase();

          if (["active", "inactive"].includes(statusLower)) {
            updateData.status =
              statusLower as "active" | "inactive";
          }
        }

        if (data.password) {
          updateData.password = data.password;
        }

        await updateUser(selectedUser.id, updateData);

        toast.success("User updated successfully");
      } else {
        const {
          fullName,
          email,
          phone_number,
          password,
          role,
          status,
        } = data;

        if (
          !fullName ||
          (!email && !phone_number) ||
          !password ||
          !role
        ) {
          throw new Error(
            "Missing required fields: fullName, email or phone_number, password, and role are required"
          );
        }

        const roleLower = role.toLowerCase();
        const statusLower = (status || "active").toLowerCase();

        if (
          !["admin", "vendor", "rider", "customer"].includes(roleLower)
        ) {
          throw new Error("Invalid role");
        }

        if (!["active", "inactive"].includes(statusLower)) {
          throw new Error("Invalid status");
        }

        await createUser({
          fullName,
          email,
          phone_number,
          password,
          role:
            roleLower as
              | "admin"
              | "vendor"
              | "rider"
              | "customer",
          status: statusLower as "active" | "inactive",
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

  // =========================
  // Delete User
  // =========================
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
      const message =
        err?.response?.data?.error || "Failed to delete user";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Toggle Status
  // =========================
  const handleToggleStatus = async (user: User) => {
    try {
      setError(null);

      const newStatus =
        user.status.toLowerCase() === "active"
          ? "inactive"
          : "active";

      await toggleUserStatus(
        user.id,
        newStatus as "active" | "inactive"
      );

      await fetchUsers();

      toast.success("User status updated");
    } catch (err: any) {
      const message =
        err?.response?.data?.error || "Failed to update status";

      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-6 transition-all">
      {/* HEADER */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            User Management
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Manage administrators, vendors, riders, and customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton users={filteredUsers} />

          <button
            onClick={() => {
              setSelectedUser(undefined);
              setShowUserModal(true);
            }}
            className="group inline-flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-green-500/30 active:scale-95"
          >
            <span className="text-lg transition-transform group-hover:rotate-90">
              +
            </span>
            Add User
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="rounded-3xl border border-white/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Users
              </p>

              <h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
                {stats.total}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              👥
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Users
              </p>

              <h2 className="mt-2 text-3xl font-black text-green-500">
                {stats.active}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              ✅
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Inactive Users
              </p>

              <h2 className="mt-2 text-3xl font-black text-red-500">
                {stats.inactive}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              ⛔
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Admins
              </p>

              <h2 className="mt-2 text-3xl font-black text-purple-500">
                {stats.admins}
              </h2>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              🛡️
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6 rounded-3xl border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-4 shadow-sm">
        <FilterBar
          onSearch={setSearchTerm}
          onFilter={setStatusFilter}
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <div className="mt-0.5 text-lg">⚠️</div>

          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* TABLE CARD */}
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl">
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Users Directory
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing {filteredUsers.length} users
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:scale-[1.02] hover:shadow-md"
          >
            Refresh
          </button>
        </div>

        {/* TABLE */}
        <div className="relative">
          {loading ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-green-200 border-t-green-500"></div>

              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Loading users...
              </p>
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
        </div>
      </div>

      {/* USER MODAL */}
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

      {/* DETAILS MODAL */}
      <UserDetailsModal
        isOpen={showDetailsModal}
        user={selectedUser}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(undefined);
        }}
      />

      {/* DELETE MODAL */}
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