import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Notification from "@/app/types/Notification";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const markAsReadNotification = async (
  notificationToMarkAsRead: Notification,
  token: string,
): Promise<string> => {
  try {
    console.log(notificationToMarkAsRead);

    const response = await axios.patch(
      `${SERVICE_COMPANY_URL}/api/notification-messages/${notificationToMarkAsRead.uuid}/read`,
      {},
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

const useMarkAsReadNotificationMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (notificationToMarkAsRead: Notification) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return markAsReadNotification(notificationToMarkAsRead, token);
    },
    onSuccess: async () => {},
  });
};

export default useMarkAsReadNotificationMutation;
