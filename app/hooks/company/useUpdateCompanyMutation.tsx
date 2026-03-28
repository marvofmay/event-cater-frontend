import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Company from "../../types/Company";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateCompany = async (
  updatedCompany: Company,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/companies/${updatedCompany.uuid}`,
      {
        uuid: updatedCompany.uuid,
        fullName: updatedCompany.fullName,
        shortName: updatedCompany.shortName,
        internalCode: updatedCompany.internalCode,
        nip: updatedCompany.nip,
        regon: updatedCompany.regon,
        description: updatedCompany.description,
        parentCompanyUUID: updatedCompany.parentCompany?.uuid,
        industryUUID: updatedCompany.industry.uuid,
        active: updatedCompany.active,
        phones: updatedCompany.phones,
        emails: updatedCompany.emails,
        websites: updatedCompany.webs,
        address: updatedCompany.address,
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

const useUpdateCompanyMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedCompany: Company) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateCompany(updatedCompany, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateCompanyMutation;
