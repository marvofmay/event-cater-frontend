"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SERVICE_COMPANY_URL } from "../utils/constans";
import Employee from "../types/Employee";
import User from "../types/User";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { jwtDecode } from "jwt-decode";

interface UserContextType {
  user: User | null;
  employee: Employee | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const { t } = useTranslation();

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");

    if (storedToken) {
      const payload = decodeJwt(storedToken);
      if (payload && payload.exp * 1000 > Date.now()) {
        document.cookie = `tenant_slug=${encodeURIComponent(payload.tenantSlug || "default")}; Path=/; SameSite=Lax`;
        setToken(storedToken);
        setUser(payload.user ?? null);
        setEmployee(payload.employee ?? null);
        setModules(payload.modules ?? []);
        setAccesses(payload.accesses ?? []);
        setPermissions(payload.permissions ?? []);
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, tenantSlug = "default") => {
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
    document.cookie = `tenant_slug=${encodeURIComponent(tenantSlug)}; Path=/; SameSite=Lax`;

    setToken(data.token);
    const payload = decodeJwt(data.token);

    setUser(payload.user ?? null);
    setEmployee(payload.employee ?? null);
    setModules(payload.modules ?? []);
    setAccesses(payload.accesses ?? []);
    setPermissions(payload.permissions ?? []);

    setIsAuthenticated(true);
    setLoading(false);

    router.push("/");
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${SERVICE_COMPANY_URL}/api/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (_) {}

    localStorage.removeItem("auth_token");

    setUser(null);
    setEmployee(null);
    setToken(null);
    setIsAuthenticated(false);
  };

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
