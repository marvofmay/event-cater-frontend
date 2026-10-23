import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Industry from "@/app/types/Industry";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleIndustry = async (
  industriesToDelete: Industry[],
  token: string,
): Promise<string> => {
  try {
    const industriesUUIDs = {
      industriesUUIDs: industriesToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/industries/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: industriesUUIDs,
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

const useDeleteMultipleIndustryMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (industriesToDelete: Industry[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleIndustry(industriesToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleIndustryMutation;
