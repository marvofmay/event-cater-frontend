import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Position from "@/app/types/Position";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultiplePosition = async (
  positionsToDelete: Position[],
  token: string,
): Promise<string> => {
  try {
    const positionsUUIDs = {
      positionsUUIDs: positionsToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/positions/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: positionsUUIDs,
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

const useDeleteMultiplePositionMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (positionsToDelete: Position[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultiplePosition(positionsToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultiplePositionMutation;
