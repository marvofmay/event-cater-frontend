import { useQuery } from "@tanstack/react-query";
import ContractType from "../../types/ContractType";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface ContractTypesResponse {
  items: ContractType[];
  total: number;
}

const fetchContractTypes = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
): Promise<ContractTypesResponse> => {
  try {
    const response = await axios.get(
      `${SERVICE_COMPANY_URL}/api/contract_types`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { pageSize, page, sortBy, sortDirection, phrase },
      },
    );

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

const useContractTypesQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
) => {
  const { t } = useTranslation();

  return useQuery<ContractTypesResponse>({
    queryKey: ["contractTypes", pageSize, page, sortBy, sortDirection, phrase],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchContractTypes(
        token,
        pageSize,
        page,
        sortBy,
        sortDirection,
        phrase,
      );
    },
  });
};

export default useContractTypesQuery;
