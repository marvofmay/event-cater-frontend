import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Department from "@/app/types/Department";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleDepartment = async (
  departmentsToDelete: Department[],
  token: string,
): Promise<string> => {
  try {
    const departmentsUUIDs = {
      departmentsUUIDs: departmentsToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/departments/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: departmentsUUIDs,
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

const useDeleteMultipleDepartmentMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (departmentsToDelete: Department[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleDepartment(departmentsToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleDepartmentMutation;
