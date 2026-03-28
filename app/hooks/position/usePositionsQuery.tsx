import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";
import PositionApi from "@/app/types/PositionApi";

export interface PositionsResponse {
  items: PositionApi[];
  total: number;
}

const fetchPositions = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
): Promise<PositionsResponse> => {
  try {
    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/positions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { pageSize, page, sortBy, sortDirection, phrase, includes },
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

const usePositionsQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
) => {
  const { t } = useTranslation();

  const normalizedPhrase = phrase ?? undefined;
  const normalizedIncludes = includes ?? undefined;

  return useQuery<PositionsResponse>({
    queryKey: [
      "positions",
      pageSize,
      page,
      sortBy,
      sortDirection,
      normalizedPhrase,
      normalizedIncludes,
    ],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchPositions(
        token,
        pageSize,
        page,
        sortBy,
        sortDirection,
        normalizedPhrase,
        normalizedIncludes,
      );
    },
  });
};

export default usePositionsQuery;
