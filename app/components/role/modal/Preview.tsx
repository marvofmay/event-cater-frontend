import React, { useEffect, useState } from "react";
import Role from "../../../types/Role";
import Preview from "../../modal/Preview";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

interface PreviewRoleModalProps {
  open: boolean;
  selectedRole: Role | null;
  onClose: () => void;
}

const PreviewRoleModal: React.FC<PreviewRoleModalProps> = ({
  open,
  selectedRole,
  onClose,
}) => {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("Token is missing");
        return;
      }

      try {
        const response = await axios.get(
          `${SERVICE_COMPANY_URL}/api/roles/${selectedRole?.uuid}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response?.data.data) {
          setRole(response.data.data);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 200) {
          window.location.href = "/me/logout";
        }
        console.error("Error fetching role by uuid:", error);
      }
    };

    if (selectedRole?.uuid) {
      fetchRole();
    }
  }, [selectedRole]);

  return (
    <Preview
      open={open}
      title={t("role.modal.preview.title")}
      details={{
        UUID: role?.uuid || "N/D",
        [t("role.form.field.name")]: role?.name || "N/D",
        [t("role.form.field.description")]: role?.description || "N/D",
        [t("role.form.field.createdAt")]: role?.createdAt || "N/D",
        [t("role.form.field.updatedAt")]: role?.updatedAt || "N/D",
      }}
      onClose={onClose}
    />
  );
};

export default PreviewRoleModal;
