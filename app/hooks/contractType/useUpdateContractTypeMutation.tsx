import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import ContractType from "../../types/ContractType";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateContractType = async (
  updatedContractType: ContractType,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/contract_types/${updatedContractType.uuid}`,
      {
        uuid: updatedContractType.uuid,
        name: updatedContractType.name,
        description: updatedContractType.description,
        active: updatedContractType.active,
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

const useUpdateContractTypeMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedContractType: ContractType) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateContractType(updatedContractType, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateContractTypeMutation;
