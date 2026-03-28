import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

export interface UpdateEmployeeContactsPayload {
  phones: string[];
}

const updateEmployeeContacts = async (
  payload: UpdateEmployeeContactsPayload,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.patch(
      `${SERVICE_COMPANY_URL}/api/me/contact`,
      { phones: payload.phones },
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

const useUpdateEmployeeContactsMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateEmployeeContactsPayload) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateEmployeeContacts(payload, token);
    },
    onSuccess: async (message: string) => {
      await queryClient.invalidateQueries({ queryKey: ["user_profile_data"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });
};

export default useUpdateEmployeeContactsMutation;
