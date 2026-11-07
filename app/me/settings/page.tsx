"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  Apartment,
  Badge,
  Business,
  Category,
  DashboardCustomize,
  Handshake,
  Notifications,
  People,
  Work,
} from "@mui/icons-material";
import SettingsPanel from "@/app/components/settings/SettingsPanel";
import DashboardLayoutSettings from "@/app/components/settings/DashboardLayoutSettings";
import type { PreferenceResource } from "@/app/context/preferencesContext";
import { useUser } from "@/app/context/userContext";
import { canConfigureListPreference } from "@/app/utils/preferenceAccess";

type SectionId = PreferenceResource | "dashboard";

const sections: {
  resource: SectionId;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  { resource: "dashboard", label: "Pulpit", description: "Kolejność kafelków", icon: <DashboardCustomize fontSize="small" /> },
  { resource: "companies", label: "Firmy", description: "Lista firm", icon: <Business fontSize="small" /> },
  { resource: "departments", label: "Oddziały", description: "Lista oddziałów", icon: <Apartment fontSize="small" /> },
  { resource: "employees", label: "Pracownicy", description: "Lista pracowników", icon: <People fontSize="small" /> },
  { resource: "positions", label: "Stanowiska", description: "Lista stanowisk", icon: <Work fontSize="small" /> },
  { resource: "roles", label: "Role", description: "Lista ról", icon: <Badge fontSize="small" /> },
  { resource: "contractTypes", label: "Formy zatrudnienia", description: "Umowy i formy", icon: <Handshake fontSize="small" /> },
  { resource: "industries", label: "Branże", description: "Lista branż", icon: <Category fontSize="small" /> },
  { resource: "notifications", label: "Powiadomienia", description: "Kanały i lista", icon: <Notifications fontSize="small" /> },
];

export default function Page() {
  const { hasAccess, hasPermission, token } = useUser();
  const isCompact = useMediaQuery("(max-width:899px)");
  const availableSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.resource === "dashboard" ||
          section.resource === "notifications" ||
          canConfigureListPreference(section.resource, hasAccess, hasPermission),
      ),
    [hasAccess, hasPermission],
  );
  const [resource, setResource] = useState<SectionId>("dashboard");
  const activeResource = availableSections.some((section) => section.resource === resource)
    ? resource
    : "dashboard";
  const activeSection = availableSections.find((section) => section.resource === activeResource) ?? availableSections[0];

  const selectSection = useCallback((next: SectionId) => {
    setResource(next);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("section");
    if (sections.some((section) => section.resource === selected)) {
      setResource(selected as SectionId);
    }
  }, []);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.3, mb: 0.5 }}>
        Moje ustawienia
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Dostosuj wygląd list i powiadomień tylko dla siebie.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "260px minmax(0, 1fr)" },
          alignItems: "start",
        }}
      >
        {isCompact ? (
          <TextField
            select
            fullWidth
            label="Obszar ustawień"
            value={activeResource}
            onChange={(event) => selectSection(event.target.value as SectionId)}
            size="small"
          >
            {availableSections.map((section) => (
              <MenuItem key={section.resource} value={section.resource}>
                {section.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: "hidden",
              position: "sticky",
              top: 88,
              alignSelf: "start",
            }}
          >
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.8 }}>
                Sekcje
              </Typography>
            </Box>
            <List disablePadding dense sx={{ pb: 1 }}>
              {availableSections.map((section) => {
                const selected = section.resource === activeResource;
                return (
                  <ListItemButton
                    key={section.resource}
                    selected={selected}
                    onClick={() => selectSection(section.resource)}
                    sx={{
                      mx: 1,
                      mb: 0.5,
                      borderRadius: 2,
                      py: 1.1,
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                        "&:hover": { bgcolor: "action.selected" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: selected ? "primary.main" : "text.secondary" }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={section.label}
                      secondary={section.description}
                      primaryTypographyProps={{ fontWeight: selected ? 700 : 600, fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        )}

        <Box sx={{ minWidth: 0 }}>
          {isCompact && activeSection ? (
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              {activeSection.label}
            </Typography>
          ) : null}
          {activeResource === "dashboard" ? (
            <DashboardLayoutSettings />
          ) : (
            <SettingsPanel key={`${token}:${activeResource}`} resource={activeResource} personalOnly />
          )}
        </Box>
      </Box>
    </Box>
  );
}
