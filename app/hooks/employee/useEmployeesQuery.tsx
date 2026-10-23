import { useQuery } from "@tanstack/react-query";
import Employee from "../../types/Employee";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface EmployeesResponse {
  items: Employee[];
  total: number;
}

const fetchEmployees = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
): Promise<EmployeesResponse> => {
  try {
    const params: any = {
      pageSize,
      page,
      sortBy,
      sortDirection,
    };

    if (phrase) params.phrase = phrase;
    if (includes) params.includes = includes;

    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/employees`, {
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

const useEmployeesQuery = (
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

  return useQuery<EmployeesResponse>({
    queryKey: [
      "companies",
      pageSize,
      page,
      sortBy,
      sortDirection,
      normalizedPhrase,
    ],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchEmployees(
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

export default useEmployeesQuery;
