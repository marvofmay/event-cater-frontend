import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Employee from "@/app/types/Employee";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleEmployee = async (
  employeesToDelete: Employee[],
  token: string,
): Promise<string> => {
  try {
    const employeesUUIDs = {
      employeesUUIDs: employeesToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/employees/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: employeesUUIDs,
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

const useDeleteMultipleEmployeeMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (employeesToDelete: Employee[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleEmployee(employeesToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleEmployeeMutation;
