"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Link, Badge, Box, Drawer, IconButton, ListItemButton, Tooltip } from "@mui/material";
import { usePathname } from "next/navigation";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
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
import { notifySaasSession, readSaasToken, SAAS_SESSION_EVENT } from "@/app/saas/session";

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
  const [saasToken, setSaasToken] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setHydrated(true);
    const syncSaas = () => setSaasToken(readSaasToken());
    syncSaas();
    window.addEventListener(SAAS_SESSION_EVENT, syncSaas);
    return () => window.removeEventListener(SAAS_SESSION_EVENT, syncSaas);
  }, []);

  const logoutSaas = useCallback(async () => {
    const token = readSaasToken();
    try {
      if (token) {
        await fetch("/api/saas/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } catch {
      // Local session still ends, same as the panel logout.
    }
    sessionStorage.removeItem("saas_token");
    notifySaasSession();
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

  const closeMenu = () => setMenuOpen(false);
  const drawerItemSx = (active: boolean) => ({
    color: "#f7faf8",
    textDecoration: "none",
    mx: 1,
    my: 0.25,
    borderRadius: "0.45rem",
    minHeight: 48,
    px: 1.5,
    gap: 1.25,
    backgroundColor: active ? "rgba(255,255,255,0.14)" : "transparent",
    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
  });
  const menuLabel = (key: string) => {
    const text = t(`navigation.${key}`);
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

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
          sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
        >
          <Box
            component="span"
            sx={{
              fontWeight: 620,
              letterSpacing: "-0.02em",
              fontSize: "1.05rem",
            }}
          >
            EventCater
          </Box>
        </Link>

        <IconButton
          color="inherit"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" }, ml: "auto" }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            gap: 0.5,
            alignItems: "center",
            flexWrap: "nowrap",
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
          {pathname === "/saas" && saasToken ? (
            <Tooltip title="Wyloguj z SaaS">
              <IconButton
                color="inherit"
                aria-label="Wyloguj z SaaS"
                onClick={() => void logoutSaas()}
                sx={{ borderRadius: "0.4rem", "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" } }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Toolbar>

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              width: "min(320px, 100vw)",
              bgcolor: "#10261f",
              color: "#f7faf8",
              backgroundImage: "none",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 64, px: 2 }}>
          <Box component="span" sx={{ fontWeight: 620, letterSpacing: "-0.02em" }}>EventCater</Box>
          <IconButton color="inherit" aria-label="Zamknij menu" onClick={closeMenu}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ overflow: "auto", pb: 3 }}>
          {isAuthenticated && navLinks.map((link) => (
            <ListItemButton
              key={link.href}
              component={Link}
              href={link.href}
              underline="none"
              onClick={closeMenu}
              sx={drawerItemSx(pathname === link.activePath)}
            >
              {link.icon}
              {menuLabel(link.label.toLowerCase())}
            </ListItemButton>
          ))}
          {isAuthenticated && (
            <>
              <ManageListNavigation variant="drawer" onNavigate={closeMenu} />
              <SettingsListNavigation variant="drawer" onNavigate={closeMenu} />
            </>
          )}
          {isAuthenticated && hasAccess("notifications") && (
            <ListItemButton
              component={Link}
              href="/notifications"
              underline="none"
              onClick={closeMenu}
              sx={drawerItemSx(pathname === "/notifications")}
            >
              <Badge badgeContent={notificationCount} color="error">
                <CircleNotificationsIcon fontSize="small" />
              </Badge>
              {menuLabel("notifications")}
            </ListItemButton>
          )}
          {isAuthenticated && hasAccess("messages") && (hasPermission("messages.list") || hasPermission("messages.create")) && (
            <ListItemButton
              component={Link}
              href="/messages"
              underline="none"
              onClick={closeMenu}
              sx={drawerItemSx(pathname === "/messages")}
            >
              <Badge badgeContent={messageCount} color="error" max={99}>
                <EmailIcon fontSize="small" />
              </Badge>
              {menuLabel("messages")}
            </ListItemButton>
          )}
          {isAuthenticated ? <UserProfileNavigation variant="drawer" onNavigate={closeMenu} /> : null}
          {pathname === "/saas" && saasToken ? (
            <ListItemButton onClick={() => { closeMenu(); void logoutSaas(); }} sx={drawerItemSx(false)}>
              <LogoutIcon fontSize="small" />
              Wyloguj z SaaS
            </ListItemButton>
          ) : null}
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Navigation;
