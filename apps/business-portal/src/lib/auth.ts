export const TOKEN_KEY = "kc_business_token";
export const USER_KEY = "kc_business_user";
export const CLIENT_KEY = "kc_business_client";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}

export interface ClientProfile {
  id: string;
  business_name: string;
  address: string;
  area: string;
  city: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredClient(): ClientProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CLIENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClientProfile;
  } catch {
    return null;
  }
}

export function setAuth(
  token: string,
  user: AuthUser,
  client?: ClientProfile | null,
): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (client) {
    localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
  } else {
    localStorage.removeItem(CLIENT_KEY);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
