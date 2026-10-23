import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Role from "../../types/Role";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateRole = async (
  updatedRole: Role,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/roles/${updatedRole.uuid}`,
      {
        uuid: updatedRole.uuid,
        name: updatedRole.name,
        description: updatedRole.description,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.message;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }

    throw error;
  }
};

const useUpdateRoleMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedRole: Role) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateRole(updatedRole, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateRoleMutation;
