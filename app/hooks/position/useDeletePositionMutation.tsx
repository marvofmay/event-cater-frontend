import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Position from "@/app/types/Position";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deletePosition = async (
  positionToDelete: Position,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/positions/${positionToDelete.uuid}`,
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

const useDeletePositionMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (positionToDelete: Position) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deletePosition(positionToDelete, token);
    },
  });
};

export default useDeletePositionMutation;
