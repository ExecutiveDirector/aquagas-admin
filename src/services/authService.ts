// ============================================================
// FILE: src/lib/services/authService.ts
// Authentication Service - Enhanced wrapper with token management
// ============================================================

import { authService as authApi } from '../api';
import { LoginCredentials, RegisterData, User, ApiResponse, AuthResponse } from '../types';

class AuthService {
  private readonly TOKEN_KEY = 'authToken';

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await authApi.login(credentials);
      
      // Automatically store token
      if (response?.data?.token) {
        this.setToken(response.data.token);
      }
      
      return response;
    } catch (error: any) {
      // Clear any stale tokens on login failure
      this.removeToken();
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await authApi.register(userData);
      
      // Automatically store token
      if (response?.data?.token) {
        this.setToken(response.data.token);
      }
      
      return response;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Call API logout endpoint
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API fails
    } finally {
      // Always clear local token
      this.removeToken();
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    return await authApi.getProfile();
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    return await authApi.updateProfile(profileData);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    return await authApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    return await authApi.forgotPassword(email);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
    return await authApi.resetPassword(token, newPassword);
  }

  /**
   * Verify email using the token from the emailed verification link
   */
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    return await authApi.verifyEmail(token);
  }

  /**
   * Resend the email verification link
   */
  async resendVerification(email: string): Promise<ApiResponse<null>> {
    return await authApi.resendVerification(email);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.getToken();
    
    // Optional: Add token expiry check here
    if (!token) return false;
    
    try {
      // Decode JWT and check expiry (optional)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp && payload.exp * 1000 < Date.now();
      
      if (isExpired) {
        this.removeToken();
        return false;
      }
      
      return true;
    } catch {
      // If token is malformed, consider it invalid
      return !!token;
    }
  }

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set auth token
   */
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Remove auth token
   */
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /**
   * Get decoded token payload (without verification)
   */
  getTokenPayload(): any | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}

export default new AuthService();
