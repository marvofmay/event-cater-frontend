import { useQuery } from "@tanstack/react-query";
import Role from "../../types/Role";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface RolesResponse {
  items: Role[];
  total: number;
}

const fetchRoles = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
): Promise<RolesResponse> => {
  try {
    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { pageSize, page, sortBy, sortDirection, phrase },
    });

    return {
      items: response.data.data.items || [],
      total: response.data.data.total || 0,
    };
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useRolesQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
) => {
  const { t } = useTranslation();

  return useQuery<RolesResponse>({
    queryKey: ["roles", pageSize, page, sortBy, sortDirection, phrase],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchRoles(token, pageSize, page, sortBy, sortDirection, phrase);
    },
  });
};

export default useRolesQuery;
