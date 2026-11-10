"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Link, Badge, Box } from "@mui/material";
import { usePathname } from "next/navigation";
import Image from "next/image";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import CircleNotificationsIcon from "@mui/icons-material/CircleNotifications";
import EmailIcon from "@mui/icons-material/Email";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import ManageListNavigation from "../manage/navigation/List";
import SettingsListNavigation from "../settings/navigation/List";
import UserProfileNavigation from "../user/UserProfileNavigation";
import { SERVICE_COMPANY_URL, SERVICE_MERCURE_URL } from "@/app/utils/constans";
import { useUnreadMessagesCount } from "@/app/hooks/messages/useUnreadMessagesCount";
import { isPublicMarketingPath } from "@/app/lib/publicMarketing";
import { isBareAuthPath } from "@/app/lib/shellPaths";

const navLinks = [
  { href: "/", label: "home", activePath: "/", icon: <HomeIcon fontSize="small" /> },
  {
    href: "/info",
    label: "info",
    activePath: "/info",
    icon: <InfoIcon fontSize="small" />,
    name: "info",
  },
];

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated, hasAccess, hasPermission, user } = useUser();
  const messageCount = useUnreadMessagesCount();
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
      if (!response.ok) return;
      const body = await response.json();
      setNotificationCount(body?.data?.unreadCount ?? 0);
    } catch {
      // keep last known value
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
    es.onopen = () => loadUnreadCount();
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.payload?.subscriberType === "internal") loadUnreadCount();
    };
    return () => es.close();
  }, [isAuthenticated, user, hydrated, loadUnreadCount]);

  if (!hydrated) return null;

  // Marketing + bare auth pages have their own composition.
  if (!isAuthenticated && (isPublicMarketingPath(pathname) || isBareAuthPath(pathname))) {
    return null;
  }

  const itemSx = (active: boolean) => ({
    color: "inherit",
    textDecoration: "none",
    borderRadius: "0.4rem",
    backgroundColor: active ? "rgba(255,255,255,0.14)" : "transparent",
    transition: "background-color 0.15s ease",
    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
  });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#10261f",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          minHeight: { xs: 64, sm: 68 },
          px: { xs: 1.5, sm: 2.5 },
        }}
      >
        <Link
          href="/"
          color="inherit"
          underline="none"
          sx={{ display: "inline-flex", alignItems: "center", gap: 1.25 }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              borderRadius: "0.55rem",
              bgcolor: "#e7efea",
              border: "1px solid rgba(231, 239, 234, 0.9)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Image
              src="/icons/event-cater-logo.png"
              alt="EventCater"
              width={56}
              height={56}
              className="logo"
              style={{ width: "86%", height: "86%", marginRight: 0, objectFit: "contain" }}
            />
          </Box>
          <Box
            component="span"
            sx={{
              display: { xs: "none", sm: "inline" },
              fontWeight: 640,
              letterSpacing: "-0.025em",
              fontSize: "1.2rem",
            }}
          >
            EventCater
          </Box>
        </Link>

        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {isAuthenticated &&
            navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                underline="none"
                sx={itemSx(pathname === link.activePath)}
              >
                <Button
                  color="inherit"
                  sx={{
                    textTransform: "none",
                    fontWeight: 520,
                    minWidth: 0,
                    px: { xs: 1, sm: 1.5 },
                  }}
                >
                  {link.icon}
                  <Box component="span" sx={{ ml: 0.75, display: { xs: "none", md: "inline" } }}>
                    {t(`navigation.${link.label.toLowerCase()}`)}
                  </Box>
                </Button>
              </Link>
            ))}

          {isAuthenticated && (
            <>
              <ManageListNavigation />
              <SettingsListNavigation />
            </>
          )}

          {isAuthenticated && hasAccess("notifications") && (
            <Link
              href="/notifications"
              underline="none"
              sx={itemSx(pathname === "/notifications")}
            >
              <Button color="inherit" sx={{ minWidth: 44 }}>
                <Badge badgeContent={notificationCount} color="error">
                  <CircleNotificationsIcon />
                </Badge>
              </Button>
            </Link>
          )}

          {isAuthenticated &&
            hasAccess("messages") &&
            (hasPermission("messages.list") || hasPermission("messages.create")) && (
              <Link
                href="/messages"
                underline="none"
                sx={itemSx(pathname === "/messages")}
              >
                <Button
                  color="inherit"
                  aria-label={
                    messageCount
                      ? `Wiadomości: ${messageCount} nieprzeczytanych`
                      : "Wiadomości"
                  }
                  sx={{ minWidth: 44 }}
                >
                  <Badge badgeContent={messageCount} color="error" max={99}>
                    <EmailIcon />
                  </Badge>
                </Button>
              </Link>
            )}

          {isAuthenticated ? <UserProfileNavigation /> : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
