import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import ContractType from "@/app/types/ContractType";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleContractType = async (
  contractTypesToDelete: ContractType[],
  token: string,
): Promise<string> => {
  try {
    const contractTypesUUIDs = {
      contractTypesUUIDs: contractTypesToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/contract_types/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: contractTypesUUIDs,
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

const useDeleteMultipleContractTypeMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (contractTypesToDelete: ContractType[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleContractType(contractTypesToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleContractTypeMutation;
