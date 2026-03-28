import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Notification from "@/app/types/Notification";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteNotification = async (
  notificationToDelete: Notification,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/notification-messages/${notificationToDelete.uuid}`,
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

const useDeleteNotificationMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (notificationToDelete: Notification) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteNotification(notificationToDelete, token);
    },
  });
};

export default useDeleteNotificationMutation;
