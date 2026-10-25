import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Box,
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Typography,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
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
    if (!role || initialized || isLoadingAccesses || isLoadingRole || accessError || roleError) return;

    const assignedAccesses = (role.accesses ?? []).filter(access => accessesByUuid[access.uuid]);
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
    setInitialized(true);
  }, [role, accessesByUuid, initialized, isLoadingAccesses, isLoadingRole, accessError, roleError]);

  const accessesByModule = useMemo(() => {
    return accesses.reduce<Record<string, Access[]>>((grouped, access) => {
      const moduleName = access.module?.name || "other";
      grouped[moduleName] = [...(grouped[moduleName] ?? []), access];
      return grouped;
    }, {});
  }, [accesses]);

  const isLoading = isLoadingAccesses || isLoadingRole;

  const toggleAccess = (accessUUID: string, checked: boolean) => {
    setSelectedAccessUUIDs((current) =>
      checked ? [...current, accessUUID] : current.filter((uuid) => uuid !== accessUUID),
    );

    if (!checked) {
      setPermissionsByAccess((current) => ({ ...current, [accessUUID]: [] }));
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
            (accessesByUuid[accessUUID]?.availablePermissions ?? []).map((permission) => permission.uuid),
          );

          return {
            accessUUID,
            permissionsUUIDs: (permissionsByAccess[accessUUID] ?? []).filter((uuid) => allowedUUIDs.has(uuid)),
          };
        }),
      });

      onSaved(message);
      onClose();
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || t("role.assign.error") : t("role.assign.error"));
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const renderPermissionCheckboxes = (access: Access) => {
    const availablePermissions = access.availablePermissions ?? [];
    if (availablePermissions.length === 0) {
      return null;
    }

    return (
      <Box sx={{ pl: 1.5, pt: 0.5 }}>
        <FormControlLabel
          control={<Checkbox
            size="small"
            disabled={!canAssignPermissions || isSaving}
            checked={availablePermissions.every(permission => (permissionsByAccess[access.uuid] ?? []).includes(permission.uuid))}
            indeterminate={(permissionsByAccess[access.uuid]?.length ?? 0) > 0 && !availablePermissions.every(permission => (permissionsByAccess[access.uuid] ?? []).includes(permission.uuid))}
            onChange={event => setPermissionsByAccess(current => ({ ...current, [access.uuid]: event.target.checked ? availablePermissions.map(permission => permission.uuid) : [] }))}
          />}
          label="Wszystkie czynności"
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.5 }}>
        {availablePermissions.map((permission: PermissionRef) => (
          <FormControlLabel
            key={`${access.uuid}-${permission.uuid}`}
            control={
              <Checkbox
                size="small"
                disabled={!canAssignPermissions || isSaving}
                checked={(permissionsByAccess[access.uuid] ?? []).includes(permission.uuid)}
                onChange={(event) =>
                  togglePermission(access.uuid, permission.uuid, event.target.checked)
                }
                sx={{ color: "#34495e", "&.Mui-checked": { color: "#2ecc71" } }}
              />
            }
            label={t(`permission.action.${permission.name}`, { defaultValue: permission.name })}
            sx={{ display: "block" }}
          />
        ))}
        </Box>
      </Box>
    );
  };

  const renderAccessRow = (access: Access, { asHeader = false }: { asHeader?: boolean } = {}) => {
    const accessChecked = selectedAccessUUIDs.includes(access.uuid);
    const groupKey = access.uuid;
    const isOpen = openGroups[groupKey] ?? true;

    return (
      <Box key={access.uuid} sx={{ mb: asHeader ? 0 : 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={accessChecked}
                disabled={!canAssignAccesses || isSaving}
                onChange={(event) => toggleAccess(access.uuid, event.target.checked)}
                sx={{ color: "#34495e", "&.Mui-checked": { color: "#2ecc71" } }}
              />
            }
            label={
              <Typography
                sx={{
                  color: "#34495e",
                  fontWeight: asHeader ? 600 : 500,
                  textTransform: "capitalize",
                }}
              >
                {t(`access.${access.name}`, { defaultValue: access.name })}
              </Typography>
            }
          />
          {accessChecked && (access.availablePermissions?.length ?? 0) > 0 && (
            <IconButton
              aria-label={isOpen ? 'Zwiń uprawnienia' : 'Rozwiń uprawnienia'}
              aria-expanded={isOpen}
              onClick={() => setOpenGroups((prev) => ({ ...prev, [groupKey]: !isOpen }))}
            >
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {accessChecked && (
          <Collapse in={isOpen}>
            {renderPermissionCheckboxes(access)}
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={() => { if (!isSaving) onClose(); }} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
        {t("role.modal.assignAccesses.title")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          {t("role.modal.assignAccesses.role", {
            name: role?.name || selectedRole?.name || "",
          })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Dostęp włącza sekcję modułu. Zaznacz osobno czynności, które rola może wykonywać.
          Uprawnienia dotyczą pracowników tej firmy. Rola Superadministrator nie nadaje dostępu do panelu SaaS.
        </Typography>
        {(accessError || roleError) ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => { void refetchAccesses(); void refetchRole(); }}>Ponów</Button>}>
            Nie udało się wczytać dostępów lub danych roli. Zapis jest zablokowany do czasu poprawnego wczytania.
          </Alert>
        ) : isLoading || !initialized ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <Box display="grid" gap={2} mt={1} sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, alignItems: 'start' }}>
            {Object.entries(accessesByModule).map(([moduleName, moduleAccesses]) => {
              const isSingleAccess = moduleAccesses.length === 1;

              return (
                <Box
                  key={moduleName}
                  sx={{
                    padding: "1rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    marginBottom: "1rem",
                  }}
                >
                  {isSingleAccess ? (
                    renderAccessRow(moduleAccesses[0], { asHeader: true })
                  ) : (
                    <>
                      <Typography sx={{ color: "#34495e", fontWeight: 600, textTransform: "capitalize", mb: 1 }}>
                        {t(`module.${moduleName}`, { defaultValue: moduleName })}
                      </Typography>
                      {moduleAccesses.map((access) => renderAccessRow(access))}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="primary"
          onClick={onClose}
          variant="contained"
          disabled={isSaving}
        >
          {t("common.button.cancel")}
        </Button>
        <Button color="primary"
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || isSaving || !initialized || !!accessError || !!roleError}
          sx={{ backgroundColor: "#34495e", color: "white", fontWeight: "bold" }}
        >
          {t("common.button.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignRoleAccessesModal;
