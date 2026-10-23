import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import Role from "@/app/types/Role";

const fetchRole = async (uuid: string, token: string): Promise<Role> => {
  try {
    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/roles/${uuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useRoleQuery = (uuid: string | null) => {
  const { t } = useTranslation();

  return useQuery<Role>({
    queryKey: ["role", uuid],
    enabled: Boolean(uuid),
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));
      if (!uuid) throw new Error(t("common.message.somethingWentWrong"));

      return fetchRole(uuid, token);
    },
  });
};

export default useRoleQuery;
