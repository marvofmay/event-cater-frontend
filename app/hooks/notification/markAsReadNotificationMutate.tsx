import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Notification from "@/app/types/Notification";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const markAsReadMultipleNotification = async (
  notificationsToMarkAsRead: Notification[],
  token: string,
): Promise<string> => {
  try {
    const notificationsUUIDs = {
      notificationsUUIDs: notificationsToMarkAsRead.map((item) => item.uuid),
    };

    console.log(notificationsUUIDs);

    const response = await axios.patch(
      `${SERVICE_COMPANY_URL}/api/notifications/read`,
      notificationsUUIDs,
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

const useMarkAsReadMultipleNotificationMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (notificationsToMarkAsRead: Notification[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return markAsReadMultipleNotification(notificationsToMarkAsRead, token);
    },
    onSuccess: async () => {},
  });
};

export default useMarkAsReadMultipleNotificationMutation;
