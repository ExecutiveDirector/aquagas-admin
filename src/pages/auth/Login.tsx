import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth";
import { AxiosError } from "axios";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface LoginResponse {
  message: string;
  token: string;
  role: string;
  admin_role: string | null;
  full_access?: boolean;
  redirect?: string;
  account?: any;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Validation logic
  const validateField = useCallback(
    (field: "email" | "password", value: string) => {
      if (field === "email") {
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Enter a valid email";
      }
      if (field === "password") {
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
      }
      return undefined;
    },
    []
  );

  // Form submit - FIXED
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    // Run validation
    const emailError = validateField("email", email);
    const passwordError = validateField("password", password);
    setValidationErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });
    
    if (emailError || passwordError) {
      toast.error("Please fix the validation errors");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("Attempting login with:", { email, password: "***" });
      const res: LoginResponse = await login(email, password);
      
      console.log("Login response:", res);

      // Check if user has admin role
      if (res.role !== "admin") {
        setError("Only admin accounts are allowed");
        toast.error("Only admin accounts are allowed");
        setLoading(false);
        return;
      }

      // Handle remember me - FIXED storage logic
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        // Token is already stored by the login function
      } else {
        // Move token to sessionStorage if not remembering
        const token = localStorage.getItem('token');
        if (token) {
          sessionStorage.setItem('token', token);
          localStorage.removeItem('token');
        }
        
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          sessionStorage.setItem('userInfo', userInfo);
          localStorage.removeItem('userInfo');
        }
        
        localStorage.setItem("rememberMe", "false");
      }

      // Success message and navigation
      if (res.admin_role === "super_admin" || res.full_access) {
        toast.success("Welcome back, Super Admin!");
      } else {
        toast.success(`Welcome back, ${res.admin_role || 'Admin'}!`);
      }

      // Navigate to dashboard
      navigate("/");

    } catch (err) {
      console.error("Login error:", err);
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      const message =
        axiosError.response?.data?.error || 
        axiosError.response?.data?.message || 
        "Login failed. Please check your credentials.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = useMemo(() => {
    return email.trim() !== "" && password.trim() !== "";
  }, [email, password]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Admin Login
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your admin dashboard
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
          <form onSubmit={submit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        email: validateField("email", e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, email: true }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      email: validateField("email", email),
                    }));
                  }}
                  disabled={loading}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                    validationErrors.email && touched.email
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : !validationErrors.email && touched.email && email
                      ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="admin@example.com"
                />
                {touched.email && (
                  <div className="absolute right-3 top-3">
                    {validationErrors.email ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : email ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {validationErrors.email && touched.email && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        password: validateField("password", e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, password: true }));
                    setValidationErrors((prev) => ({
                      ...prev,
                      password: validateField("password", password),
                    }));
                  }}
                  disabled={loading}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                    validationErrors.password && touched.password
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : !validationErrors.password && touched.password && password
                      ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {validationErrors.password && touched.password && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> 
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 ${
                loading || !isFormValid
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" /> 
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
            <Shield className="w-3 h-3 mr-1" />
            Your session is secured with industry-standard encryption
          </p>
        </div>
      </div>
    </div>
  );
}