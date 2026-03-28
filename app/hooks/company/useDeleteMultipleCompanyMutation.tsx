import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Company from "@/app/types/Company";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleCompany = async (
  companiesToDelete: Company[],
  token: string,
): Promise<string> => {
  try {
    const companiesUUIDs = {
      companiesUUIDs: companiesToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/companies/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: companiesUUIDs,
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

const useDeleteMultipleCompanyMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (companiesToDelete: Company[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleCompany(companiesToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleCompanyMutation;
