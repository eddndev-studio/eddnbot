const ACCOUNT_KEY = "eddnbot_account";
const TENANT_KEY = "eddnbot_active_tenant";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// --- Account & tenant info (non-secret, OK in localStorage) ---

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

// Auth state is tracked via a non-secret flag (actual tokens are in httpOnly cookies)
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(ACCOUNT_KEY);
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
  // Tokens are now in httpOnly cookies set by the server.
  // We only store non-secret account info for UI state.
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data.account));
}

export function clearSession() {
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
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      clearSession();
      return false;
    }

    return true;
  } catch {
    clearSession();
    return false;
  }
}

// --- HTTP client ---

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const apiKey = getApiKey();

  const headers: Record<string, string> = {};

  // For legacy API key users, send the key in headers
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  } else {
    // Cookie-based auth: browser sends httpOnly cookies automatically
    const tenant = getActiveTenant();
    if (tenant) headers["X-Tenant-Id"] = tenant.tenantId;
  }

  if (body) headers["Content-Type"] = "application/json";

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  // If 401, try refresh (only for cookie-based auth)
  if (res.status === 401 && !apiKey) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        credentials: "include",
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
