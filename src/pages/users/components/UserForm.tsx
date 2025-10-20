import React, { useState } from "react";
import { type User } from "../types";
import toast from "react-hot-toast";

interface UserFormProps {
  initialValues?: Partial<User>;
  onSubmit: (values: Partial<User>) => void;
  loading?: boolean;
  isEditing?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ initialValues = {}, onSubmit, loading, isEditing = false }) => {
  const [form, setForm] = useState<Partial<User>>({
    first_name: initialValues.first_name || "",
    last_name: initialValues.last_name || "",
    email: initialValues.email || "",
    phone_number: initialValues.phone_number || "",
    password: initialValues.password || "",
    role: "user", // Fixed to 'user' for customer registration
    status: initialValues.status || "active", // Default to active (lowercase to match ENUM)
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!form.first_name) newErrors.first_name = "First name is required";
    if (!form.last_name) newErrors.last_name = "Last name is required";
    if (!form.email && !form.phone_number) {
      newErrors.email = "Either email or phone number is required";
      newErrors.phone_number = "Either email or phone number is required";
    }
    if (!isEditing && !form.password) newErrors.password = "Password is required for new users";
    if (!form.role) newErrors.role = "Role is required";
    if (!form.status) newErrors.status = "Status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...form,
        role: form.role?.toLowerCase(), // Ensure role is lowercase to match ENUM
        status: form.status?.toLowerCase(), // Ensure status is lowercase to match ENUM
      });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <div>
        <input
          name="first_name"
          placeholder="First Name"
          value={form.first_name}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.first_name ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
      </div>

      <div>
        <input
          name="last_name"
          placeholder="Last Name"
          value={form.last_name}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.last_name ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
      </div>

      <div>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.email ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <input
          name="phone_number"
          placeholder="Phone Number (E.164 format, e.g., +254712345678)"
          value={form.phone_number}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.phone_number ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.phone_number && <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>}
      </div>

      <div>
        <input
          type="password"
          name="password"
          placeholder={isEditing ? "New Password (optional)" : "Password"}
          value={form.password}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.password ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      <div>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.role ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="rider">Rider</option>
          <option value="vendor">Vendor</option>
        </select>
        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
      </div>

      <div>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${errors.status ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`bg-blue-500 text-white p-2 rounded ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}
      >
        {loading ? "Saving..." : isEditing ? "Update" : "Create"}
      </button>
    </form>
  );
};

export default UserForm;