import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import Access from "@/app/types/Access";

const fetchAccesses = async (token: string): Promise<Access[]> => {
  try {
    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/accesses`, {
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

const useAccessesQuery = () => {
  const { t } = useTranslation();

  return useQuery<Access[]>({
    queryKey: ["accesses"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchAccesses(token);
    },
  });
};

export default useAccessesQuery;
