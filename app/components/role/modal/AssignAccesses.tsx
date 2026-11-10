import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrandSpinner } from "@/app/components/common/BrandSpinner";
import axios from "axios";
import {
  Box,
  Alert,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ExpandLess, ExpandMore, InfoOutlined as InfoOutlinedIcon, Search as SearchIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import Role from "@/app/types/Role";
import Access, { PermissionRef } from "@/app/types/Access";
import useAccessesQuery from "@/app/hooks/access/useAccessesQuery";
import useRoleQuery from "@/app/hooks/role/useRoleQuery";
import useUpdateRoleAuthorizationMutation from "@/app/hooks/role/useUpdateRoleAuthorizationMutation";
import { useUser } from "@/app/context/userContext";
import { toast } from "react-toastify";

interface AssignRoleAccessesModalProps {
  open: boolean;
  selectedRole: Role | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const ACCENT = "#34495e";
const ACCENT_OK = "#2ecc71";

const MEDIA_PERMISSION_NAMES = new Set([
  "view_event_media",
  "add_event_media",
  "delete_event_media",
  "publish_facebook",
]);

const checkboxLabelSx = {
  m: 0,
  mr: 0,
  display: "inline-flex",
  alignItems: "center",
  columnGap: 0,
  "& .MuiCheckbox-root": {
    paddingTop: "5px",
    paddingBottom: "5px",
  },
  "& .MuiFormControlLabel-label": {
    fontSize: "0.875rem",
    lineHeight: "24px",
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
  },
} as const;

const AssignRoleAccessesModal: React.FC<AssignRoleAccessesModalProps> = ({
  open,
  selectedRole,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedAccessUUIDs, setSelectedAccessUUIDs] = useState<string[]>([]);
  const [permissionsByAccess, setPermissionsByAccess] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const saving = useRef(false);
  const { hasPermission } = useUser();
  const canAssignAccesses = hasPermission("roles.assign_access_to_role");
  const canAssignPermissions = hasPermission("roles.assign_permission_to_access_role");

  const { data: accesses = [], isFetching: isLoadingAccesses, error: accessError, refetch: refetchAccesses } = useAccessesQuery();
  const { data: role, isFetching: isLoadingRole, error: roleError, refetch: refetchRole } = useRoleQuery(selectedRole?.uuid ?? null);
  const { mutateAsync: updateAuthorization } = useUpdateRoleAuthorizationMutation();

  const accessesByUuid = useMemo(
    () => Object.fromEntries(accesses.map((access) => [access.uuid, access])),
    [accesses],
  );

  useEffect(() => {
    if (!open) return;
    setInitialized(false);
    setQuery("");
    setActiveModule(null);
    void refetchAccesses();
    void refetchRole();
    // Refetch catalog whenever the modal opens for a role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedRole?.uuid]);

  useEffect(() => {
    if (!open || !role || initialized || isLoadingAccesses || isLoadingRole || accessError || roleError) return;

    const assignedAccesses = (role.accesses ?? []).filter((access) => accessesByUuid[access.uuid]);
    setSelectedAccessUUIDs(assignedAccesses.map((access) => access.uuid));
    setPermissionsByAccess(
      Object.fromEntries(
        assignedAccesses.map((access) => {
          const allowed = accessesByUuid[access.uuid]?.availablePermissions;
          const assignedUUIDs = access.permissions?.map((permission) => permission.uuid) ?? [];

          return [
            access.uuid,
            allowed
              ? assignedUUIDs.filter((uuid) => allowed.some((permission) => permission.uuid === uuid))
              : assignedUUIDs,
          ];
        }),
      ),
    );
    setOpenGroups(
      Object.fromEntries(assignedAccesses.map((access) => [access.uuid, true])),
    );
    setInitialized(true);
  }, [open, role, accessesByUuid, initialized, isLoadingAccesses, isLoadingRole, accessError, roleError]);

  const moduleLabel = (moduleName: string) =>
    t(`module.${moduleName}`, { defaultValue: moduleName });

  const accessLabel = (access: Access) =>
    t(`access.${access.name}`, { defaultValue: access.name });

  const accessHelp = (access: Access) =>
    t(`access.help.${access.name}`, { defaultValue: "" });

  const permissionLabel = (permission: PermissionRef) =>
    t(`permission.action.${permission.name}`, { defaultValue: permission.name });

  const accessesByModule = useMemo(() => {
    return accesses.reduce<Record<string, Access[]>>((grouped, access) => {
      const moduleName = access.module?.name || "other";
      grouped[moduleName] = [...(grouped[moduleName] ?? []), access];
      return grouped;
    }, {});
  }, [accesses]);

  const moduleNames = useMemo(
    () =>
      Object.keys(accessesByModule).sort((a, b) =>
        t(`module.${a}`, { defaultValue: a }).localeCompare(
          t(`module.${b}`, { defaultValue: b }),
          "pl",
        ),
      ),
    [accessesByModule, t],
  );

  useEffect(() => {
    if (!initialized || activeModule || moduleNames.length === 0) return;
    const withSelection = moduleNames.find((name) =>
      (accessesByModule[name] ?? []).some((access) => selectedAccessUUIDs.includes(access.uuid)),
    );
    setActiveModule(withSelection ?? moduleNames[0]);
  }, [initialized, activeModule, moduleNames, accessesByModule, selectedAccessUUIDs]);

  const normalizedQuery = query.trim().toLowerCase();

  const moduleMatchesQuery = (moduleName: string) => {
    if (!normalizedQuery) return true;
    if (moduleLabel(moduleName).toLowerCase().includes(normalizedQuery)) return true;
    return (accessesByModule[moduleName] ?? []).some((access) => {
      if (accessLabel(access).toLowerCase().includes(normalizedQuery)) return true;
      return (access.availablePermissions ?? []).some((permission) =>
        permissionLabel(permission).toLowerCase().includes(normalizedQuery),
      );
    });
  };

  const visibleModuleNames = moduleNames.filter(moduleMatchesQuery);
  const currentModule = activeModule && visibleModuleNames.includes(activeModule)
    ? activeModule
    : visibleModuleNames[0] ?? null;

  const selectedPermissionCount = useMemo(
    () =>
      selectedAccessUUIDs.reduce(
        (sum, accessUUID) => sum + (permissionsByAccess[accessUUID]?.length ?? 0),
        0,
      ),
    [selectedAccessUUIDs, permissionsByAccess],
  );

  const moduleStats = (moduleName: string) => {
    const moduleAccesses = accessesByModule[moduleName] ?? [];
    const selected = moduleAccesses.filter((access) => selectedAccessUUIDs.includes(access.uuid));
    const permissions = selected.reduce(
      (sum, access) => sum + (permissionsByAccess[access.uuid]?.length ?? 0),
      0,
    );
    return { selected: selected.length, permissions };
  };

  const isLoading = isLoadingAccesses || isLoadingRole;

  const toggleAccess = (accessUUID: string, checked: boolean) => {
    const access = accessesByUuid[accessUUID];
    const manage = accesses.find((candidate) => candidate.name === "manage");
    const isManaged =
      access?.module?.name === "company" &&
      !["manage", "company_structure"].includes(access.name);
    if (access?.name === "manage" && !checked) {
      const children = accesses
        .filter(
          (candidate) =>
            candidate.module?.name === "company" && candidate.name !== "company_structure",
        )
        .map((candidate) => candidate.uuid);
      setSelectedAccessUUIDs((current) => current.filter((uuid) => !children.includes(uuid)));
      setPermissionsByAccess((current) =>
        Object.fromEntries(Object.entries(current).filter(([uuid]) => !children.includes(uuid))),
      );
      return;
    }
    setSelectedAccessUUIDs((current) =>
      checked
        ? Array.from(
            new Set([...current, accessUUID, ...(isManaged && manage ? [manage.uuid] : [])]),
          )
        : current.filter((uuid) => uuid !== accessUUID),
    );

    if (!checked) {
      setPermissionsByAccess((current) => ({ ...current, [accessUUID]: [] }));
    } else {
      setOpenGroups((current) => ({ ...current, [accessUUID]: true }));
    }
  };

  const togglePermission = (accessUUID: string, permissionUUID: string, checked: boolean) => {
    setSelectedAccessUUIDs((current) =>
      current.includes(accessUUID) ? current : [...current, accessUUID],
    );
    setPermissionsByAccess((current) => {
      const assigned = current[accessUUID] ?? [];
      return {
        ...current,
        [accessUUID]: checked
          ? [...assigned, permissionUUID]
          : assigned.filter((uuid) => uuid !== permissionUUID),
      };
    });
  };

  const handleSave = async () => {
    if (!selectedRole || !initialized || saving.current || accessError || roleError) return;

    saving.current = true;
    setIsSaving(true);
    try {
      const message = await updateAuthorization({
        roleUUID: selectedRole.uuid,
        accesses: selectedAccessUUIDs.map((accessUUID) => {
          const allowedUUIDs = new Set(
            (accessesByUuid[accessUUID]?.availablePermissions ?? []).map(
              (permission) => permission.uuid,
            ),
          );

          return {
            accessUUID,
            permissionsUUIDs: (permissionsByAccess[accessUUID] ?? []).filter((uuid) =>
              allowedUUIDs.has(uuid),
            ),
          };
        }),
      });

      onSaved(message);
    } catch (error) {
      toast.error(
        axios.isAxiosError(error)
          ? error.response?.data?.message || t("role.assign.error")
          : t("role.assign.error"),
      );
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const permissionMatches = (permission: PermissionRef) =>
    !normalizedQuery || permissionLabel(permission).toLowerCase().includes(normalizedQuery);

  const accessMatches = (access: Access) => {
    if (!normalizedQuery) return true;
    if (accessLabel(access).toLowerCase().includes(normalizedQuery)) return true;
    return (access.availablePermissions ?? []).some(permissionMatches);
  };

  const renderPermissionCheckboxes = (access: Access) => {
    const availablePermissions = access.availablePermissions ?? [];
    if (availablePermissions.length === 0) return null;

    const visiblePermissions = normalizedQuery
      ? availablePermissions.filter(
          (permission) =>
            accessLabel(access).toLowerCase().includes(normalizedQuery) ||
            permissionMatches(permission),
        )
      : availablePermissions;

    if (visiblePermissions.length === 0) return null;

    const assigned = permissionsByAccess[access.uuid] ?? [];
    const allChecked = availablePermissions.every((permission) =>
      assigned.includes(permission.uuid),
    );
    const someChecked = assigned.length > 0 && !allChecked;

    const generalPermissions = visiblePermissions.filter(
      (permission) => !MEDIA_PERMISSION_NAMES.has(permission.name),
    );
    const mediaPermissions = visiblePermissions.filter((permission) =>
      MEDIA_PERMISSION_NAMES.has(permission.name),
    );
    const permissionGroups: { title: string | null; items: PermissionRef[] }[] = [
      ...(generalPermissions.length > 0 ? [{ title: null, items: generalPermissions }] : []),
      ...(mediaPermissions.length > 0
        ? [{ title: "Zdjęcia i filmy", items: mediaPermissions }]
        : []),
    ];

    const renderPermissionItem = (permission: PermissionRef) => {
      const checked = assigned.includes(permission.uuid);
      return (
        <FormControlLabel
          key={`${access.uuid}-${permission.uuid}`}
          control={
            <Checkbox
              size="small"
              disabled={!canAssignPermissions || isSaving}
              checked={checked}
              onChange={(event) =>
                togglePermission(access.uuid, permission.uuid, event.target.checked)
              }
              sx={{ color: ACCENT, "&.Mui-checked": { color: ACCENT_OK } }}
            />
          }
          label={permissionLabel(permission)}
          sx={{
            ...checkboxLabelSx,
            "& .MuiFormControlLabel-label": {
              ...checkboxLabelSx["& .MuiFormControlLabel-label"],
              color: checked ? "text.primary" : "text.secondary",
              fontWeight: checked ? 600 : 400,
            },
          }}
        />
      );
    };

    return (
      <Box
        sx={{
          mt: 1,
          ml: { xs: 0, sm: 4.5 },
          p: 1.25,
          borderRadius: 1.5,
          bgcolor: "#f7f9fb",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          mb={0.75}
          flexWrap="wrap"
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                disabled={!canAssignPermissions || isSaving}
                checked={allChecked}
                indeterminate={someChecked}
                onChange={(event) =>
                  setPermissionsByAccess((current) => ({
                    ...current,
                    [access.uuid]: event.target.checked
                      ? availablePermissions.map((permission) => permission.uuid)
                      : [],
                  }))
                }
                sx={{ color: ACCENT, "&.Mui-checked": { color: ACCENT_OK } }}
              />
            }
            label="Wszystkie czynności"
            sx={{
              ...checkboxLabelSx,
              "& .MuiFormControlLabel-label": {
                ...checkboxLabelSx["& .MuiFormControlLabel-label"],
                fontWeight: 600,
                color: "text.secondary",
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {assigned.length}/{availablePermissions.length}
          </Typography>
        </Stack>
        {permissionGroups.map((group) => (
          <Box key={group.title ?? "general"} sx={{ mb: group.title ? 0 : 0.5 }}>
            {group.title && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  mb: 0.5,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: ACCENT,
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                }}
              >
                {group.title}
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                columnGap: 1,
                rowGap: 0.25,
                ...(group.title
                  ? {
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "rgba(52, 73, 94, 0.04)",
                      border: "1px dashed",
                      borderColor: "rgba(52, 73, 94, 0.18)",
                    }
                  : {}),
              }}
            >
              {group.items.map(renderPermissionItem)}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const renderAccessRow = (access: Access, { asHeader = false }: { asHeader?: boolean } = {}) => {
    if (!accessMatches(access)) return null;

    const accessChecked = selectedAccessUUIDs.includes(access.uuid);
    const assignedCount = permissionsByAccess[access.uuid]?.length ?? 0;
    const availableCount = access.availablePermissions?.length ?? 0;
    const isOpen = openGroups[access.uuid] ?? true;
    const helpText = accessHelp(access);

    return (
      <Box
        key={access.uuid}
        sx={{
          mb: 1,
          p: 1.25,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: accessChecked ? "rgba(52, 73, 94, 0.28)" : "divider",
          bgcolor: accessChecked ? "#fff" : "transparent",
          boxShadow: accessChecked ? "0 1px 2px rgba(52, 73, 94, 0.06)" : "none",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
          <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
            <FormControlLabel
              sx={{
                ...checkboxLabelSx,
                minWidth: 0,
                "& .MuiFormControlLabel-label": {
                  color: ACCENT,
                  fontWeight: asHeader ? 700 : 600,
                  fontSize: "0.95rem",
                  lineHeight: 1.25,
                },
              }}
              control={
                <Checkbox
                  checked={accessChecked}
                  disabled={!canAssignAccesses || isSaving}
                  onChange={(event) => toggleAccess(access.uuid, event.target.checked)}
                  sx={{ color: ACCENT, "&.Mui-checked": { color: ACCENT_OK } }}
                />
              }
              label={accessLabel(access)}
            />
            {helpText ? (
              <Tooltip
                title={helpText}
                arrow
                describeChild
                enterTouchDelay={0}
                leaveTouchDelay={4000}
              >
                <IconButton
                  size="small"
                  aria-label={`Informacja: ${accessLabel(access)}`}
                  sx={{ p: 0.25, color: "text.secondary", flexShrink: 0 }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
          {accessChecked && availableCount > 0 && (
            <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
              <Chip
                size="small"
                label={`${assignedCount}/${availableCount}`}
                aria-hidden
                sx={{
                  height: 22,
                  fontWeight: 600,
                  bgcolor: assignedCount > 0 ? "rgba(46, 204, 113, 0.12)" : "action.hover",
                  color: assignedCount > 0 ? "#1e8449" : "text.secondary",
                }}
              />
              <IconButton
                size="small"
                aria-label={isOpen ? "Zwiń uprawnienia" : "Rozwiń uprawnienia"}
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenGroups((prev) => ({ ...prev, [access.uuid]: !isOpen }))
                }
              >
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Stack>
          )}
        </Box>
        {accessChecked && <Collapse in={isOpen}>{renderPermissionCheckboxes(access)}</Collapse>}
      </Box>
    );
  };

  const renderModuleAccesses = (moduleName: string) => {
    const moduleAccesses = accessesByModule[moduleName] ?? [];

    if (moduleName === "company") {
      const manage = moduleAccesses.find((access) => access.name === "manage");
      const structure = moduleAccesses.find((access) => access.name === "company_structure");
      const catalogs = moduleAccesses
        .filter((access) => !["manage", "company_structure"].includes(access.name))
        .sort((first, second) =>
          accessLabel(first).localeCompare(accessLabel(second), "pl"),
        );

      return (
        <Box>
          {structure && renderAccessRow(structure, { asHeader: true })}
          {manage && renderAccessRow(manage, { asHeader: true })}
          {manage && selectedAccessUUIDs.includes(manage.uuid) && (
            <Box
              sx={{
                mt: 0.5,
                ml: 1,
                pl: 1.5,
                borderLeft: "3px solid",
                borderColor: "rgba(52, 73, 94, 0.2)",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1, fontWeight: 600, letterSpacing: 0.3 }}
              >
                Katalogi firmy
              </Typography>
              {catalogs.map((access) => renderAccessRow(access))}
            </Box>
          )}
        </Box>
      );
    }

    const sorted = [...moduleAccesses].sort((a, b) =>
      accessLabel(a).localeCompare(accessLabel(b), "pl"),
    );

    return <Box>{sorted.map((access) => renderAccessRow(access, { asHeader: sorted.length === 1 }))}</Box>;
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: "100%", md: "min(860px, 92vh)" },
          maxHeight: { xs: "100%", md: "92vh" },
          m: { xs: 0, sm: 2 },
          borderRadius: { xs: 0, sm: 2 },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: ACCENT,
          color: "white",
          fontSize: "1.15rem",
          fontWeight: "bold",
          py: 1.5,
        }}
      >
        {t("role.modal.assignAccesses.title")}
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2,
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            gap={1.5}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color={ACCENT}>
                {t("role.modal.assignAccesses.role", {
                  name: role?.name || selectedRole?.name || "",
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Włącz dostęp do sekcji, potem wybierz dozwolone czynności.
              </Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                label={`${selectedAccessUUIDs.length} dostępów`}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                size="small"
                label={`${selectedPermissionCount} uprawnień`}
                color={selectedPermissionCount > 0 ? "success" : "default"}
                variant={selectedPermissionCount > 0 ? "filled" : "outlined"}
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Stack>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj modułu, dostępu lub czynności…"
            size="small"
            fullWidth
            sx={{ mt: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {(accessError || roleError) ? (
          <Box sx={{ p: 2.5 }}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void refetchAccesses();
                    void refetchRole();
                  }}
                >
                  Ponów
                </Button>
              }
            >
              Nie udało się wczytać dostępów lub danych roli. Zapis jest zablokowany do czasu
              poprawnego wczytania.
            </Alert>
          </Box>
        ) : isLoading || !initialized ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1} minHeight={220}>
            <BrandSpinner />
          </Box>
        ) : visibleModuleNames.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">Brak wyników dla „{query.trim()}”.</Alert>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" },
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                borderRight: { md: "1px solid" },
                borderBottom: { xs: "1px solid", md: "none" },
                borderColor: "divider",
                bgcolor: "#f4f6f8",
                overflowY: "auto",
                maxHeight: { xs: 180, md: "none" },
              }}
            >
              <List dense disablePadding>
                {visibleModuleNames.map((moduleName) => {
                  const stats = moduleStats(moduleName);
                  const selected = currentModule === moduleName;
                  return (
                    <ListItemButton
                      key={moduleName}
                      selected={selected}
                      onClick={() => setActiveModule(moduleName)}
                      sx={{
                        py: 1.1,
                        px: 2,
                        borderLeft: "3px solid",
                        borderColor: selected ? ACCENT : "transparent",
                        "&.Mui-selected": {
                          bgcolor: "#fff",
                          "&:hover": { bgcolor: "#fff" },
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              fontWeight: selected ? 700 : 600,
                              textTransform: "capitalize",
                              color: ACCENT,
                              fontSize: "0.92rem",
                            }}
                          >
                            {moduleLabel(moduleName)}
                          </Typography>
                        }
                        secondary={
                          stats.selected > 0
                            ? `${stats.selected} dost. · ${stats.permissions} upr.`
                            : "brak zaznaczeń"
                        }
                        secondaryTypographyProps={{
                          sx: {
                            fontSize: "0.72rem",
                            color: stats.selected > 0 ? "#1e8449" : "text.disabled",
                            fontWeight: stats.selected > 0 ? 600 : 400,
                          },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>

            <Box sx={{ overflowY: "auto", p: 2.5, bgcolor: "#fafbfc" }}>
              {currentModule && (
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      color: ACCENT,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      mb: 1.5,
                      fontSize: "1.05rem",
                    }}
                  >
                    {moduleLabel(currentModule)}
                  </Typography>
                  {renderModuleAccesses(currentModule)}
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Button color="primary" onClick={onClose} variant="contained" disabled={isSaving}>
          {t("common.button.cancel")}
        </Button>
        <Button
          color="primary"
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || isSaving || !initialized || !!accessError || !!roleError}
          sx={{ backgroundColor: ACCENT, color: "white", fontWeight: "bold" }}
        >
          {t("common.button.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignRoleAccessesModal;
