import React, { useEffect, useMemo, useState } from "react";
import type { UpdateUserData, User } from "../../types";

import UserModal from "./components/UserModal";
import UserDetailsModal from "./components/UserDetailsModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
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
  const [selectedUser, setSelectedUser] = useState<User | undefined>();

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // =========================
  // FETCH USERS
  // =========================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await listUsers();

      setUsers(response.data || []);
      setFilteredUsers(response.data || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || "Failed to load users";

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
  // FILTER USERS
  // =========================
  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.fullName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (u.email || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (u.phone_number || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(
        (u) => u.status?.toLowerCase() === statusFilter
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  // =========================
  // STATS
  // =========================
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status === "inactive").length,
      admins: users.filter((u) => u.role === "admin").length,
    };
  }, [users]);

  // =========================
  // SAVE USER
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
              roleLower as
                | "admin"
                | "vendor"
                | "rider"
                | "customer";
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
            "Missing required fields"
          );
        }

        const roleLower = role.toLowerCase();
        const statusLower = (status || "active").toLowerCase();

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
        "Failed to save user";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETE USER
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
  // TOGGLE STATUS
  // =========================
  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus =
        user.status === "active" ? "inactive" : "active";

      await toggleUserStatus(
        user.id,
        newStatus as "active" | "inactive"
      );

      await fetchUsers();

      toast.success("Status updated");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        "Failed to update status";

      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            User Management
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage customers, vendors, riders and administrators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton users={filteredUsers} />

          <button
            onClick={() => {
              setSelectedUser(undefined);
              setShowUserModal(true);
            }}
            className="
              h-12 px-5 rounded-2xl
              bg-gradient-to-r from-green-500 to-emerald-600
              text-white font-semibold
              shadow-lg shadow-green-500/20
              hover:scale-[1.02]
              transition-all
            "
          >
            + Add User
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Total Users</p>
          <h2 className="text-3xl font-black mt-2 text-gray-900 dark:text-white">
            {stats.total}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Active Users</p>
          <h2 className="text-3xl font-black mt-2 text-green-500">
            {stats.active}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Inactive Users</p>
          <h2 className="text-3xl font-black mt-2 text-red-500">
            {stats.inactive}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Admins</p>
          <h2 className="text-3xl font-black mt-2 text-blue-500">
            {stats.admins}
          </h2>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* SEARCH */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              placeholder="Search customer, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full h-14 rounded-2xl
                border border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-gray-800
                pl-12 pr-4
                text-gray-800 dark:text-white
                placeholder-gray-400
                focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/20
                focus:border-green-500
                outline-none transition-all
              "
            />
          </div>

          {/* FILTER */}
          <div className="relative min-w-[220px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="
                w-full h-14 rounded-2xl
                border border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-gray-800
                px-4
                text-gray-700 dark:text-white
                appearance-none
                focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20
                focus:border-blue-500
                outline-none transition-all
              "
            >
              <option value="">Filter By Status</option>
              <option value="active">🟢 Active Users</option>
              <option value="inactive">🔴 Inactive Users</option>
            </select>

            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-2xl bg-red-100 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* TABLE HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Customers Directory
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredUsers.length} users
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="
              px-4 py-2 rounded-xl
              border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800
              text-sm font-medium
              text-gray-700 dark:text-gray-200
              hover:shadow-md
              transition-all
            "
          >
            Refresh
          </button>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="h-80 flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-green-200 border-t-green-500 animate-spin"></div>

            <p className="mt-4 text-gray-500">
              Loading users...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                    Contact
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                    Role
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="
                      hover:bg-green-50/50
                      dark:hover:bg-gray-800/40
                      transition-all
                    "
                  >
                    {/* CUSTOMER */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        
                        <div className="
                          h-12 w-12 rounded-2xl
                          bg-gradient-to-br from-green-500 to-emerald-600
                          text-white font-bold
                          flex items-center justify-center
                        ">
                          {user.fullName?.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.fullName}
                          </h3>

                          <p className="text-sm text-gray-500">
                            User ID #{user.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {user.email || "No email"}
                        </p>

                        <p className="text-sm text-gray-500">
                          {user.phone_number || "No phone"}
                        </p>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="px-6 py-5">
                      <span className="
                        inline-flex items-center
                        px-3 py-1 rounded-full
                        text-xs font-bold
                        bg-blue-100 text-blue-700
                        dark:bg-blue-900/20 dark:text-blue-300
                      ">
                        {user.role}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-5">
                      <span
                        className={`
                          inline-flex items-center gap-2
                          px-3 py-1 rounded-full
                          text-xs font-bold
                          ${
                            user.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                          }
                        `}
                      >
                        <span className="h-2 w-2 rounded-full bg-current"></span>

                        {user.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="
                            px-3 py-2 rounded-xl
                            bg-gray-100 dark:bg-gray-800
                            text-sm font-medium
                            hover:bg-gray-200 dark:hover:bg-gray-700
                            transition-all
                          "
                        >
                          View
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="
                            px-3 py-2 rounded-xl
                            bg-green-100 text-green-700
                            dark:bg-green-900/20 dark:text-green-300
                            text-sm font-medium
                            hover:scale-105
                            transition-all
                          "
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="
                            px-3 py-2 rounded-xl
                            bg-yellow-100 text-yellow-700
                            dark:bg-yellow-900/20 dark:text-yellow-300
                            text-sm font-medium
                            hover:scale-105
                            transition-all
                          "
                        >
                          Toggle
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="
                            px-3 py-2 rounded-xl
                            bg-red-100 text-red-700
                            dark:bg-red-900/20 dark:text-red-300
                            text-sm font-medium
                            hover:scale-105
                            transition-all
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredUsers.length && (
              <div className="h-60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">👥</div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  No users found
                </h3>

                <p className="text-gray-500 mt-2">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        )}
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