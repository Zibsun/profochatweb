import { apiClient } from './client';
import { User } from '../types/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface AccountInfo {
  account_id: number;
  name: string;
  role: string;
}

export interface TelegramAuthResponse {
  access_token: string;
  token_type: string;
  user: {
    user_id: number;
    telegram_user_id: number;
    telegram_username?: string;
    first_name?: string;
    last_name?: string;
    is_super_admin: boolean;
  };
  account_id: number;
  role: string;
  available_accounts: AccountInfo[];
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  telegramLogin: async (telegramData: TelegramAuthData): Promise<TelegramAuthResponse> => {
    const response = await apiClient.post<TelegramAuthResponse>('/auth/telegram/login', telegramData);
    return response.data;
  },

  switchAccount: async (accountId: number): Promise<TelegramAuthResponse> => {
    const response = await apiClient.post<TelegramAuthResponse>('/auth/telegram/switch-account', { account_id: accountId });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};

