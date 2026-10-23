import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Industry from "@/app/types/Industry";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteIndustry = async (
  roleToDelete: Industry,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/industries/${roleToDelete.uuid}`,
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

const useDeleteIndustryMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (roleToDelete: Industry) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteIndustry(roleToDelete, token);
    },
  });
};

export default useDeleteIndustryMutation;
