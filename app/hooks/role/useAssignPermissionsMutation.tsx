import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

export type AssignPermissionsPayload = {
  accessUUID: string;
  permissionsUUIDs: string[];
};

const assignPermissions = async (
  roleUUID: string,
  accesses: AssignPermissionsPayload[],
  token: string,
): Promise<string> => {
  try {
    const response = await axios.post(
      `${SERVICE_COMPANY_URL}/api/roles/${roleUUID}/accesses/permissions`,
      { accesses },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.message;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useAssignPermissionsMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      roleUUID,
      accesses,
    }: {
      roleUUID: string;
      accesses: AssignPermissionsPayload[];
    }) => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return assignPermissions(roleUUID, accesses, token);
    },
  });
};

export default useAssignPermissionsMutation;
