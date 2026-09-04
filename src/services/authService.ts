import { api } from './api';
import { config } from '../config';
import type { User } from '../types';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Authenticates user credentials with the backend.
 * Stores JWT token and user profile in localStorage.
 */
export async function loginApi(username: string, password: string): Promise<User> {
  const response = await api.post<TokenResponse>('/auth/login', {
    username,
    password,
  });

  const { access_token, user } = response.data;

  // Persist access token and user profile
  localStorage.setItem('minesafe_access_token', access_token);
  localStorage.setItem(config.auth.sessionKey, JSON.stringify(user));

  return user;
}

/**
 * Fetches current authenticated user profile using active JWT Bearer token.
 */
export async function getCurrentUserApi(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  const user = response.data;
  localStorage.setItem(config.auth.sessionKey, JSON.stringify(user));
  return user;
}

/**
 * Logs out current user and clears session tokens.
 */
export async function logoutApi(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.warn('[Logout Warning] Logout endpoint error or offline:', error);
  } finally {
    localStorage.removeItem('minesafe_access_token');
    localStorage.removeItem(config.auth.sessionKey);
  }
}
