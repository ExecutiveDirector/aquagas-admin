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
    fullName: initialValues.fullName || "",
    email: initialValues.email || "",
    phone_number: initialValues.phone_number || "",
    password: initialValues.password || "",
    role: initialValues.role || "", // Initialize to empty to force selection
    status: initialValues.status || "Active", // Default to Active
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!form.fullName) newErrors.fullName = "Full name is required";
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
        role: form.role?.toLowerCase(), // Ensure role is lowercase
      });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <div>
        <input
          name="fullName"
          placeholder="Full Name"
          value={form.fullName}
          onChange={handleChange}
          className={`border p-2 w-full ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
      </div>

      <div>
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className={`border p-2 w-full ${errors.email ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <input
          name="phone_number"
          placeholder="Phone"
          value={form.phone_number}
          onChange={handleChange}
          className={`border p-2 w-full ${errors.phone_number ? "border-red-500" : "border-gray-300"}`}
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
          className={`border p-2 w-full ${errors.password ? "border-red-500" : "border-gray-300"}`}
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      <div>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className={`border p-2 w-full ${errors.role ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select role</option>
          <option value="admin">Admin</option>
          <option value="rider">Rider</option>
          <option value="vendor">Vendor</option>
          <option value="customer">Customer</option>
        </select>
        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
      </div>

      <div>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className={`border p-2 w-full ${errors.status ? "border-red-500" : "border-gray-300"}`}
        >
          <option value="">Select status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
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