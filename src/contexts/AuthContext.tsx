import { createContext, useContext, useState, ReactNode } from "react";

const AUTH_KEY = "cf_token";

export const ALL_TOOL_IDS = [
  "serp", "brief", "content", "seo",
  "lsi", "pagespeed", "cluster", "linking", "campaign", "keywords",
] as const;

export type ToolId = (typeof ALL_TOOL_IDS)[number];

// ── Token storage ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(AUTH_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(AUTH_KEY);
}

// ── Session type ──────────────────────────────────────────────────────────────

export interface CurrentUser {
  id: number;
  username: string;
  role: "admin" | "user";
  priority: number;
  permissions: ToolId[];
}

export interface LoginResult {
  ok: boolean;
  requires2fa?: boolean;
  tempToken?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  isAdmin: boolean;
  hasToolAccess: (tool: ToolId) => boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyTotp: (tempToken: string, code: string) => Promise<boolean>;
  logout: () => void;
}

function decodeTokenPayload(token: string): CurrentUser | null {
  try {
    const b64 = token.split(".")[1];
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    // Check expiry
    if (p.exp && Date.now() / 1000 > p.exp) return null;
    return { id: p.id, username: p.username, role: p.role, priority: p.priority ?? 5, permissions: p.permissions ?? [] };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const token = getToken();
    return token ? decodeTokenPayload(token) : null;
  });

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      if (data.requires2fa) return { ok: false, requires2fa: true, tempToken: data.tempToken };
      setToken(data.token);
      const user = decodeTokenPayload(data.token);
      setCurrentUser(user);
      return { ok: !!user };
    } catch {
      return { ok: false };
    }
  };

  const verifyTotp = async (tempToken: string, code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.token);
      const user = decodeTokenPayload(data.token);
      setCurrentUser(user);
      return !!user;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  const hasToolAccess = (tool: ToolId): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return currentUser.permissions.includes(tool);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!currentUser,
        currentUser,
        isAdmin: currentUser?.role === "admin",
        hasToolAccess,
        login,
        verifyTotp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ── API helper — attach token to every request ────────────────────────────────

export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
