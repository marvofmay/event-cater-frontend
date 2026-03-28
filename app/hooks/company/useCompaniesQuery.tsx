import { useQuery } from "@tanstack/react-query";
import Company from "../../types/Company";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface CompaniesResponse {
  items: Company[];
  total: number;
}

const fetchCompanies = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
  filters?: {
    active?: boolean | null;
    parentCompanyUUID?: string | null;
  },
): Promise<CompaniesResponse> => {
  try {
    const params: any = {
      pageSize,
      page,
      sortBy,
      sortDirection,
    };

    if (phrase) params.phrase = phrase;
    if (includes) params.includes = includes;

    if (filters) {
      if (typeof filters.active !== "undefined")
        params.active = filters.active ? 1 : 0;
      if (filters.parentCompanyUUID)
        params.parentCompanyUUID = filters.parentCompanyUUID;
    }

    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/companies`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
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

const useCompaniesQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
  filters?: {
    active?: boolean;
    name?: string;
  },
) => {
  const { t } = useTranslation();
  const normalizedPhrase = phrase ?? undefined;
  const normalizedIncludes = includes ?? undefined;

  return useQuery<CompaniesResponse>({
    queryKey: [
      "companies",
      pageSize,
      page,
      sortBy,
      sortDirection,
      normalizedPhrase,
      filters,
    ],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchCompanies(
        token,
        pageSize,
        page,
        sortBy,
        sortDirection,
        normalizedPhrase,
        normalizedIncludes,
        filters,
      );
    },
  });
};

export default useCompaniesQuery;
