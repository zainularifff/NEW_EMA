import api from "./apiClient";

export type AnyUser = Record<string, any>;

export type LoginPayload = {
  username: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
};

export type LoginResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  accessToken?: string;
  token?: string;
  twoFactorRequired?: boolean;
  twoFactorSetupRequired?: boolean;
  user?: AnyUser;
  data?: {
    accessToken?: string;
    token?: string;
    user?: AnyUser;
    twoFactorRequired?: boolean;
    twoFactorSetupRequired?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
};

export type TwoFactorSetupPayload = {
  userID?: number | string;
  userId?: number | string;
  emaUserID?: number | string;
  id?: number | string;
  authSource?: string;
};

export type TwoFactorVerifyPayload = TwoFactorSetupPayload & {
  code?: string;
  token?: string;
  otp?: string;
  secret?: string;
  setup?: boolean;
  isSetup?: boolean;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/login", payload);
}

export async function setupTwoFactor(payload: TwoFactorSetupPayload): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/2fa/setup", payload);
}

export async function verifyTwoFactor(payload: TwoFactorVerifyPayload): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/2fa/verify", payload);
}

export async function getCurrentUser(accessToken?: string): Promise<LoginResponse> {
  const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
  return api.get<LoginResponse>("/api/auth/me", config);
}

export async function refreshToken(): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/refresh-token");
}

export async function logout(): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/logout");
}

const authService = {
  login,
  setupTwoFactor,
  verifyTwoFactor,
  getCurrentUser,
  refreshToken,
  logout,
};

export default authService;
