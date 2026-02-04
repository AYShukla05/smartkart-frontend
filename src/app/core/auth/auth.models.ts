export interface User {
  id: number;
  email: string;
  role: "BUYER" | "SELLER";
  is_active: boolean;
  is_staff: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: "BUYER" | "SELLER";
}

export interface RegisterResponse {
  user: {
    email: string;
    role: "BUYER" | "SELLER";
  };
  tokens: {
    access: string;
    refresh: string;
  };
}
