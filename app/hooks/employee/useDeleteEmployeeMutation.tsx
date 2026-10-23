import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Employee from "@/app/types/Employee";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteEmployee = async (
  employeeToDelete: Employee,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/employees/${employeeToDelete.uuid}`,
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

const useDeleteEmployeeMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (employeeToDelete: Employee) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteEmployee(employeeToDelete, token);
    },
  });
};

export default useDeleteEmployeeMutation;
