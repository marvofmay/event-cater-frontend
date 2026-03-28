import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Department from "@/app/types/Department";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteDepartment = async (
  departmentToDelete: Department,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/departments/${departmentToDelete.uuid}`,
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

const useDeleteDepartmentMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (departmentToDelete: Department) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteDepartment(departmentToDelete, token);
    },
  });
};

export default useDeleteDepartmentMutation;
