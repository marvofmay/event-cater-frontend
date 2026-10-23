import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import PositionPayload from "@/app/types/PositionPayload";

const updatePosition = async (
  updatedPosition: PositionPayload,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/positions/${updatedPosition.uuid}`,
      {
        uuid: updatedPosition.uuid,
        name: updatedPosition.name,
        description: updatedPosition.description,
        departmentsUUIDs: updatedPosition.departmentsUUIDs,
        active: updatedPosition.active,
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

const useUpdatePositionMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedPosition: PositionPayload) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updatePosition(updatedPosition, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdatePositionMutation;
