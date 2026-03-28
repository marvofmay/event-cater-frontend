import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Company from "@/app/types/Company";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteCompany = async (
  companyToDelete: Company,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/companies/${companyToDelete.uuid}`,
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

const useDeleteCompanyMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (companyToDelete: Company) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteCompany(companyToDelete, token);
    },
  });
};

export default useDeleteCompanyMutation;
