import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (reqConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('minesafe_access_token');
    if (token && reqConfig.headers) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized & auto-logout session
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Auth Error] 401 Unauthorized encountered. Session cleared.');
      localStorage.removeItem('minesafe_access_token');
      localStorage.removeItem(config.auth.sessionKey);
      // Optional window redirect if needed: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
