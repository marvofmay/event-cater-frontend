import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import Permission from "@/app/types/Permission";

const fetchPermissions = async (token: string): Promise<Permission[]> => {
  try {
    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const usePermissionsQuery = () => {
  const { t } = useTranslation();

  return useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchPermissions(token);
    },
  });
};

export default usePermissionsQuery;
