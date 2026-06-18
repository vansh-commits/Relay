const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "cs_token";

export interface AuthUser {
  token: string;
  email: string | null;
  is_guest: boolean;
  question_count: number;
  question_limit: number;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authRequest(path: string, body?: object): Promise<AuthUser> {
  const res = await fetch(`${BASE}/api/v1/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong. Please try again.");
  return data as AuthUser;
}

export const authApi = {
  signup: (email: string, password: string) => authRequest("/signup", { email, password }),
  login: (email: string, password: string) => authRequest("/login", { email, password }),
  guest: () => authRequest("/guest"),
  me: async (token: string): Promise<AuthUser> => {
    const res = await fetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Session expired.");
    return data as AuthUser;
  },
};
