import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
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
import useAssignAccessesMutation from "@/app/hooks/role/useAssignAccessesMutation";
import useAssignPermissionsMutation from "@/app/hooks/role/useAssignPermissionsMutation";
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

  const { data: accesses = [], isLoading: isLoadingAccesses } = useAccessesQuery();
  const { data: role, isLoading: isLoadingRole } = useRoleQuery(selectedRole?.uuid ?? null);
  const { mutateAsync: assignAccesses } = useAssignAccessesMutation();
  const { mutateAsync: assignPermissions } = useAssignPermissionsMutation();

  const accessesByUuid = useMemo(
    () => Object.fromEntries(accesses.map((access) => [access.uuid, access])),
    [accesses],
  );

  useEffect(() => {
    if (!role) return;

    const assignedAccesses = role.accesses ?? [];
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
  }, [role, accessesByUuid]);

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
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      const accessMessage = await assignAccesses({
        roleUUID: selectedRole.uuid,
        accessesUUIDs: selectedAccessUUIDs,
      });

      if (selectedAccessUUIDs.length === 0) {
        onSaved(accessMessage);
        onClose();
        return;
      }

      const permissionMessage = await assignPermissions({
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

      onSaved(permissionMessage);
      onClose();
    } catch {
      toast.error(t("role.assign.error"));
    } finally {
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
        {availablePermissions.map((permission: PermissionRef) => (
          <FormControlLabel
            key={`${access.uuid}-${permission.uuid}`}
            control={
              <Checkbox
                size="small"
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
        {t("role.modal.assignAccesses.title")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          {t("role.modal.assignAccesses.role", {
            name: role?.name || selectedRole?.name || "",
          })}
        </Typography>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
            {Object.entries(accessesByModule).map(([moduleName, moduleAccesses]) => {
              const isSingleAccess = moduleAccesses.length === 1;

              return (
                <Box
                  key={moduleName}
                  flexBasis="32%"
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
        <Button
          onClick={onClose}
          variant="contained"
          disabled={isSaving}
          sx={{ backgroundColor: "#999a99", color: "white", fontWeight: "bold" }}
        >
          {t("common.button.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || isSaving}
          sx={{ backgroundColor: "#34495e", color: "white", fontWeight: "bold" }}
        >
          {t("common.button.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignRoleAccessesModal;
