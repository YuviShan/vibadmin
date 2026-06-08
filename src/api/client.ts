import axios, { type AxiosError } from 'axios';
import type { ApiError, LoginResponse } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionInvalid: (() => void) | null = null;

export function setOnSessionInvalid(handler: (() => void) | null): void {
  onSessionInvalid = handler;
}

function isStaleMembershipError(error: AxiosError<ApiError>): boolean {
  return (
    error.response?.status === 403 &&
    error.response.data?.code === 'FORBIDDEN' &&
    (error.response.data?.error?.includes('Membership') ?? false)
  );
}

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
  if (access) {
    localStorage.setItem('viberp_access', access);
    localStorage.setItem('viberp_refresh', refresh ?? '');
  } else {
    localStorage.removeItem('viberp_access');
    localStorage.removeItem('viberp_refresh');
  }
}

export function loadStoredTokens(): { access: string | null; refresh: string | null } {
  accessToken = localStorage.getItem('viberp_access');
  refreshToken = localStorage.getItem('viberp_refresh') || null;
  return { access: accessToken, refresh: refreshToken };
}

export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    const original = error.config;

    if (isStaleMembershipError(error)) {
      setTokens(null, null);
      onSessionInvalid?.();
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      refreshToken &&
      original &&
      !(original as { _retry?: boolean })._retry
    ) {
      (original as { _retry?: boolean })._retry = true;
      try {
        const { data } = await axios.post<LoginResponse>(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setTokens(null, null);
        onSessionInvalid?.();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    const base = data?.error ?? error.message;

    if (data?.details && typeof data.details === 'object') {
      const flattened = data.details as {
        formErrors?: string[];
        fieldErrors?: Record<string, string[]>;
      };
      const fieldMsgs = flattened.fieldErrors
        ? Object.entries(flattened.fieldErrors).flatMap(([field, msgs]) =>
            msgs.map((m) => `${field}: ${m}`),
          )
        : [];
      const formMsgs = flattened.formErrors ?? [];
      const detailText = [...formMsgs, ...fieldMsgs].join('; ');
      if (detailText) return `${base} — ${detailText}`;
    }

    if (typeof data?.details === 'string') {
      return `${base} — ${data.details}`;
    }

    return base;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
