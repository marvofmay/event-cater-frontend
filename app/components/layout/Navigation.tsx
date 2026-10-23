"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Link, Badge } from "@mui/material";
import { usePathname } from "next/navigation";
import Image from "next/image";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import LoginIcon from "@mui/icons-material/Login";
import CircleNotificationsIcon from "@mui/icons-material/CircleNotifications";
import EmailIcon from "@mui/icons-material/Email";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import ManageListNavigation from "../manage/navigation/List";
import SettingsListNavigation from "../settings/navigation/List";
import UserProfileNavigation from "../user/UserProfileNavigation";
import { SERVICE_COMPANY_URL, SERVICE_MERCURE_URL } from "@/app/utils/constans";

const navLinks = [
  { href: "/", label: "home", activePath: "/", icon: <HomeIcon /> },
  {
    href: "/info",
    label: "Info",
    activePath: "/info",
    icon: <InfoIcon />,
    name: "info",
  },
];

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated, hasModule, hasAccess, user } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${SERVICE_COMPANY_URL}/api/notification-messages/unread-count`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        return;
      }

      const body = await response.json();
      setNotificationCount(body?.data?.unreadCount ?? 0);
    } catch {
      // badge stays at last known value
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.uuid || !hydrated) return;

    loadUnreadCount();
  }, [isAuthenticated, user, hydrated, pathname, loadUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uuid || !hydrated) return;

    if (typeof window === "undefined") return;

    const url = new URL(SERVICE_MERCURE_URL);
    url.searchParams.append("topic", `user.${user.uuid}`);

    const es = new EventSource(url.toString());

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.payload?.subscriberType === "internal") {
        loadUnreadCount();
      }
    };

    es.onerror = (event) => {
      console.error("Mercure error:", event);
      console.error("readyState:", es.readyState);
    };

    return () => es.close();
  }, [isAuthenticated, user, hydrated, loadUnreadCount]);

  if (!hydrated) {
    return null;
  }

  return (
    <AppBar position="static" sx={{ backgroundColor: "#34495e" }}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" color="inherit" underline="none">
          <Image
            src="/icons/event-cater-logo.png"
            alt="Logo"
            width={100}
            height={100}
          />
        </Link>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {navLinks.map((link) =>
            isAuthenticated ? (
              <Link
                key={link.href}
                href={link.href}
                color="inherit"
                underline="none"
                sx={{
                  backgroundColor:
                    pathname === link.activePath
                      ? "rgba(255, 255, 255, 0.3)"
                      : "transparent",
                  borderRadius: "4px",
                }}
              >
                <Button color="inherit">
                  {link.icon} {t(`navigation.${link.label.toLowerCase()}`)}
                </Button>
              </Link>
            ) : null,
          )}

          {isAuthenticated && (
            <>
              {(hasModule("events") || hasModule("kitchen")) && (
                <Link href={hasModule("events") ? "/catering/events" : "/catering/kitchen"} color="inherit" underline="none">
                  <Button color="inherit">Catering</Button>
                </Link>
              )}
              {hasAccess("manage") && <ManageListNavigation />}
              {hasAccess("settings") && <SettingsListNavigation />}
            </>
          )}

          {isAuthenticated && hasAccess("notifications") && (
            <Link
              href="/notifications"
              color="inherit"
              underline="none"
              sx={{
                backgroundColor:
                  pathname === "/notifications"
                    ? "rgba(255,255,255,0.3)"
                    : "transparent",
                borderRadius: "4px",
              }}
            >
              <Button color="inherit">
                <Badge badgeContent={notificationCount} color="error">
                  <CircleNotificationsIcon />
                </Badge>
              </Button>
            </Link>
          )}

          {isAuthenticated && hasModule("company") && hasAccess("messages") && (
            <Link
              href="/messages"
              color="inherit"
              underline="none"
              sx={{
                backgroundColor:
                  pathname === "/messages"
                    ? "rgba(255,255,255,0.3)"
                    : "transparent",
                borderRadius: "4px",
              }}
            >
              <Button color="inherit">
                <EmailIcon />
              </Button>
            </Link>
          )}

          {isAuthenticated ? (
            <UserProfileNavigation />
          ) : (
            <Link
              href="/login"
              color="inherit"
              underline="none"
              sx={{
                backgroundColor:
                  pathname === "/login"
                    ? "rgba(255,255,255,0.3)"
                    : "transparent",
                borderRadius: "4px",
              }}
            >
              <Button color="inherit">
                <LoginIcon /> {t("login")}
              </Button>
            </Link>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
