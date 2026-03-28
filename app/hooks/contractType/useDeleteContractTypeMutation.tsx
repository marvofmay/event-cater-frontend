import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import ContractType from "@/app/types/ContractType";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteContractType = async (
  contractTypeToDelete: ContractType,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/contract_types/${contractTypeToDelete.uuid}`,
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

const useDeleteContractTypeMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (contractTypeToDelete: ContractType) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteContractType(contractTypeToDelete, token);
    },
  });
};

export default useDeleteContractTypeMutation;
