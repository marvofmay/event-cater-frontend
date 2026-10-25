import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Department from "../../types/Department";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateDepartment = async (
  updatedDepartment: Department,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/departments/${updatedDepartment.uuid}`,
      {
        uuid: updatedDepartment.uuid,
        name: updatedDepartment.name,
        internalCode: updatedDepartment.internalCode,
        description: updatedDepartment.description,
        parentDepartmentUUID:
          updatedDepartment.parentDepartment?.uuid !== ""
            ? updatedDepartment.parentDepartment?.uuid
            : null,
        companyUUID: updatedDepartment.company.uuid,
        active: updatedDepartment.active,
        phones: updatedDepartment.phones.map(phone => phone.trim()).filter(Boolean),
        emails: updatedDepartment.emails.map(email => email.trim()).filter(Boolean),
        websites: updatedDepartment.webs,
        address: updatedDepartment.address,
        createdAt: updatedDepartment.createdAt,
        updatedAt: updatedDepartment.createdAt,
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

const useUpdateDepartmentMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedDepartment: Department) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateDepartment(updatedDepartment, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateDepartmentMutation;
