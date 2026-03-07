const ACCESS_TOKEN_KEY = "eddnbot_access_token";
const REFRESH_TOKEN_KEY = "eddnbot_refresh_token";
const ACCOUNT_KEY = "eddnbot_account";
const TENANT_KEY = "eddnbot_active_tenant";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// --- Token management ---

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export interface StoredAccount {
  id: string;
  email: string;
  name: string;
}

export interface StoredTenant {
  tenantId: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
}

export function getAccount(): StoredAccount | null {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getActiveTenant(): StoredTenant | null {
  const raw = localStorage.getItem(TENANT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setActiveTenant(tenant: StoredTenant) {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function hasTenantSelected(): boolean {
  return !!localStorage.getItem(TENANT_KEY);
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  account: StoredAccount;
  tenants: StoredTenant[];
}

export function saveLoginSession(data: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data.account));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(TENANT_KEY);
}

// --- Legacy API key support (for backward compat during migration) ---
const LEGACY_KEY = "eddnbot_api_key";
export function hasApiKey(): boolean {
  return !!localStorage.getItem(LEGACY_KEY);
}
export function getApiKey(): string | null {
  return localStorage.getItem(LEGACY_KEY);
}
export function setApiKey(key: string) {
  localStorage.setItem(LEGACY_KEY, key);
}
export function clearApiKey() {
  localStorage.removeItem(LEGACY_KEY);
}

// --- Token refresh ---

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearSession();
      return false;
    }

    const data = await res.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

// --- HTTP client ---

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getAccessToken();
  const apiKey = getApiKey();

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  else if (apiKey) headers["X-API-Key"] = apiKey;
  if (body) headers["Content-Type"] = "application/json";

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If 401 with Bearer token, try refresh
  if (res.status === 401 && token) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()!}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (res.status === 401) {
    clearSession();
    clearApiKey();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.error ?? err.message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
