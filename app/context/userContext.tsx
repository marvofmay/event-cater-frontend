"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SERVICE_COMPANY_URL } from "../utils/constans";
import Employee from "../types/Employee";
import User from "../types/User";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { jwtDecode } from "jwt-decode";
import { toast } from 'react-toastify';
import { IDLE_ACTIVITY_KEY, IDLE_LOGOUT_MS, readLastActivity, writeLastActivity } from '@/app/utils/idleSession';

interface UserContextType {
  user: User | null;
  employee: Employee | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  tenant: { slug: string; name: string } | null;
  mustChangePassword: boolean;
  roles: string[];
  changePassword: (currentPassword: string, newPassword: string, confirmation: string) => Promise<void>;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: (reason?: 'inactivity') => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  hasAccess: (accessName: string) => boolean;
  hasModule: (moduleName: string) => boolean;
  modules: string[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function decodeJwt(token: string): any {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [accesses, setAccesses] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tenant, setTenant] = useState<{ slug: string; name: string } | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  const { t } = useTranslation();

  useEffect(() => {
    if (!token) return;
    let current = true;
    const refreshAuthorization = () => {
      if (document.visibilityState === 'hidden') return;
      fetch('/api/auth/authorization', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (!current || !Array.isArray(data?.modules) || !Array.isArray(data?.accesses) || !Array.isArray(data?.permissions)) return;
          setModules(data.modules);
          setAccesses(data.accesses);
          setPermissions(data.permissions);
        })
        .catch(() => {});
    };
    refreshAuthorization();
    window.addEventListener('focus', refreshAuthorization);
    window.addEventListener('authorization-changed', refreshAuthorization);
    document.addEventListener('visibilitychange', refreshAuthorization);
    return () => {
      current = false;
      window.removeEventListener('focus', refreshAuthorization);
      window.removeEventListener('authorization-changed', refreshAuthorization);
      document.removeEventListener('visibilitychange', refreshAuthorization);
    };
  }, [token]);

  useEffect(() => {
    let current = true;
    const payload = token ? decodeJwt(token) : null;
    const slug = payload?.tenantSlug;
    setTenant(slug ? { slug, name: payload.tenantName || slug } : null);
    if (slug && !payload.tenantName) {
      fetch('/api/saas/tenant-options')
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          const selected = data?.items?.find((item: { slug: string; name: string }) => item.slug === slug);
          if (current && selected) setTenant({ slug: selected.slug, name: selected.name });
        })
        .catch(() => {});
    }
    return () => { current = false; };
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");

    if (storedToken) {
      const payload = decodeJwt(storedToken);
      if (payload && payload.exp * 1000 > Date.now()) {
        const lastActivity = readLastActivity(storedToken);
        if (lastActivity !== null && Date.now() - lastActivity >= IDLE_LOGOUT_MS) {
          void logout('inactivity');
          setLoading(false);
          return;
        }
        if (lastActivity === null) writeLastActivity(storedToken);
        document.cookie = `tenant_slug=${encodeURIComponent(payload.tenantSlug || "default")}; Path=/; SameSite=Lax`;
        setToken(storedToken);
        setUser(payload.user ?? null);
        setEmployee(payload.employee ?? null);
        setModules(payload.modules ?? []);
        setAccesses(payload.accesses ?? []);
        setPermissions(payload.permissions ?? []);
        setMustChangePassword(payload.mustChangePassword === true);
        setRoles(payload.roles ?? []);
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, tenantSlug: string) => {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenantSlug)) {
      throw new Error("Wybierz firmę, do której chcesz się zalogować.");
    }
    setLoading(true);

    const res = await fetch(`${SERVICE_COMPANY_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant": tenantSlug },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);

      throw new Error(data?.message || t("loginForm.invalidCredentials"));
    }

    if (!data?.token) {
      setLoading(false);
      throw new Error(t("loginForm.token.missing"));
    }

    localStorage.setItem("auth_token", data.token);
    writeLastActivity(data.token);
    localStorage.setItem("selected_tenant", tenantSlug);
    document.cookie = `tenant_slug=${encodeURIComponent(tenantSlug)}; Path=/; SameSite=Lax`;

    setToken(data.token);
    const payload = decodeJwt(data.token);

    setUser(payload.user ?? null);
    setEmployee(payload.employee ?? null);
    setModules(payload.modules ?? []);
    setAccesses(payload.accesses ?? []);
    setPermissions(payload.permissions ?? []);
    setMustChangePassword(payload.mustChangePassword === true);
    setRoles(payload.roles ?? []);

    setIsAuthenticated(true);
    setLoading(false);

    router.push("/");
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmation: string) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword, confirmation }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? 'Nie udało się zmienić hasła.');
    const payload = decodeJwt(result.token);
    if (!payload || payload.mustChangePassword || !result.token) throw new Error('Zaloguj się ponownie, aby kontynuować.');
    localStorage.setItem('auth_token', result.token);
    writeLastActivity(result.token);
    setToken(result.token);
    setUser(payload.user ?? null);
    setEmployee(payload.employee ?? null);
    setModules(payload.modules ?? []);
    setAccesses(payload.accesses ?? []);
    setPermissions(payload.permissions ?? []);
    setRoles(payload.roles ?? []);
    setMustChangePassword(false);
  };

  const clearSession = useCallback(() => {
    setUser(null);
    setEmployee(null);
    setToken(null);
    setIsAuthenticated(false);
    setModules([]);
    setAccesses([]);
    setPermissions([]);
    setTenant(null);
    setMustChangePassword(false);
    setRoles([]);
  }, []);

  const logout = useCallback(async (reason?: 'inactivity') => {
    const sessionToken = localStorage.getItem('auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem(IDLE_ACTIVITY_KEY);
    clearSession();
    if (sessionToken) {
      toast.info(reason === 'inactivity' ? 'Sesja została zakończona z powodu bezczynności.' : 'Wylogowano pomyślnie.', { toastId: 'session-logout' });
    }
    router.replace('/login');
    try {
      if (sessionToken) {
        await fetch(`${SERVICE_COMPANY_URL}/api/logout`, {
          method: "POST",
          keepalive: true,
          signal: AbortSignal.timeout(5000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
            'X-Tenant': decodeJwt(sessionToken)?.tenantSlug || 'default',
          },
        });
      }
    } catch (_) {}

  }, [clearSession, router]);

  useEffect(() => {
    const synchronizeSession = (event: StorageEvent) => {
      if ((event.key === 'auth_token' && event.newValue !== token) || event.key === null) {
        if (!event.newValue) {
          clearSession();
          if (token) {
            toast.info('Wylogowano pomyślnie.', { toastId: 'session-logout' });
            router.replace('/login');
          }
        } else if (token) {
          window.location.reload();
        }
      }
    };
    window.addEventListener('storage', synchronizeSession);
    return () => window.removeEventListener('storage', synchronizeSession);
  }, [token, clearSession, router]);

  const hasPermission = (accessPermission: string): boolean => {
    if (permissions.length === 0) return false;

    return permissions.some((p) => {
      if (p === accessPermission) return true;

      if (p?.endsWith(".*")) {
        const prefix = p.replace(".*", "");
        return accessPermission.startsWith(prefix + ".");
      }

      return false;
    });
  };

  const hasAccess = (accessName: string) =>
    accesses?.some((a) => a === accessName) ?? false;

  const hasModule = (moduleName: string) =>
    modules?.some((m) => m === moduleName) ?? false;

  return (
    <UserContext.Provider
      value={{
        user,
        employee,
        isAuthenticated,
        loading,
        token,
        tenant,
        mustChangePassword,
        roles,
        changePassword,
        login,
        logout,
        hasPermission,
        hasAccess,
        hasModule,
        modules,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");

  return ctx;
};
