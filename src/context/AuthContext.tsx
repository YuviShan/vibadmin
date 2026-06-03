import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, login as loginApi } from '../api/endpoints';
import { loadStoredTokens, setOnSessionInvalid, setTokens } from '../api/client';
import type { AuthOrg, AuthUser } from '../types/api';

const USER_KEY = 'viberp_user';
const ORG_KEY = 'viberp_org';
const ROLE_KEY = 'viberp_role';

function readStoredSession(): {
  user: AuthUser | null;
  org: AuthOrg | null;
  role: string | null;
} {
  try {
    const user = localStorage.getItem(USER_KEY);
    const org = localStorage.getItem(ORG_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    return {
      user: user ? (JSON.parse(user) as AuthUser) : null,
      org: org ? (JSON.parse(org) as AuthOrg) : null,
      role,
    };
  } catch {
    return { user: null, org: null, role: null };
  }
}

function persistSession(user: AuthUser | null, org: AuthOrg | null, role: string | null): void {
  if (user && org) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ORG_KEY, JSON.stringify(org));
    localStorage.setItem(ROLE_KEY, role ?? '');
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

interface AuthState {
  user: AuthUser | null;
  org: AuthOrg | null;
  role: string | null;
  isAuthenticated: boolean;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredTokens();
  const session = readStoredSession();
  const [user, setUser] = useState<AuthUser | null>(session.user);
  const [org, setOrg] = useState<AuthOrg | null>(session.org);
  const [role, setRole] = useState<string | null>(session.role);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(stored.access));
  const [sessionReady, setSessionReady] = useState(!stored.access);

  const logout = useCallback(() => {
    setTokens(null, null);
    persistSession(null, null, null);
    setUser(null);
    setOrg(null);
    setRole(null);
    setIsAuthenticated(false);
    setSessionReady(true);
  }, []);

  useEffect(() => {
    loadStoredTokens();
    setOnSessionInvalid(() => logout());
    return () => setOnSessionInvalid(null);
  }, [logout]);

  useEffect(() => {
    const { access } = loadStoredTokens();
    if (!access) {
      setSessionReady(true);
      return;
    }
    fetchSession()
      .then((data) => {
        setUser(data.user);
        setOrg(data.org);
        setRole(data.role);
        persistSession(data.user, data.org, data.role);
        setIsAuthenticated(true);
      })
      .catch(() => logout())
      .finally(() => setSessionReady(true));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginApi(email, password);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
    setOrg(result.org);
    setRole(result.role);
    persistSession(result.user, result.org, result.role);
    setIsAuthenticated(true);
    setSessionReady(true);
  }, []);

  const value = useMemo(
    () => ({ user, org, role, isAuthenticated, login, logout, sessionReady }),
    [user, org, role, isAuthenticated, login, logout, sessionReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
