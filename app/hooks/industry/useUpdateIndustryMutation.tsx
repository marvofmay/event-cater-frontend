import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Industry from "../../types/Industry";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateIndustry = async (
  updatedIndustry: Industry,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/industries/${updatedIndustry.uuid}`,
      {
        uuid: updatedIndustry.uuid,
        name: updatedIndustry.name,
        description: updatedIndustry.description,
      },
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

const useUpdateIndustryMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedIndustry: Industry) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateIndustry(updatedIndustry, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateIndustryMutation;
