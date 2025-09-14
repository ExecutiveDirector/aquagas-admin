export interface User {
    id: string;
    fullName: string;
    email: string;
    phone_number: string;
    password?: string;
    role: string; // Make non-optional
    status?: string;
    walletBalance?: number;
    lastLogin?: string;
    first_name?: string; // Optional for mapping from users table
    last_name?: string;
  }
  
  export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: string; // Add error field for consistency
  }