import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

export interface UpdateEmployeeAddressPayload {
  street: string;
  postcode: string;
  city: string;
  country: string;
}

const updateEmployeeAddress = async (
  payload: UpdateEmployeeAddressPayload,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.patch(
      `${SERVICE_COMPANY_URL}/api/me/address`,
      { address: payload },
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

const useUpdateEmployeeAddressMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: UpdateEmployeeAddressPayload) => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return updateEmployeeAddress(payload, token);
    },
  });
};

export default useUpdateEmployeeAddressMutation;
