import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const importEmployees = async (file: File, token: string): Promise<string> => {
  try {
    const response = await axios.post(
      `${SERVICE_COMPANY_URL}/api/employees/import`,
      {
        file: file,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
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

const useImportEmployeesFromXLSXMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (file: File) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return importEmployees(file, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useImportEmployeesFromXLSXMutation;
