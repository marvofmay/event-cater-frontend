import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Notification from "@/app/types/Notification";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleNotification = async (
  notificationsToDelete: Notification[],
  token: string,
): Promise<string> => {
  try {
    const notificationsUUIDs = {
      notificationsUUIDs: notificationsToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/notifications/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: notificationsUUIDs,
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

const useDeleteMultipleNotificationMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (notificationsToDelete: Notification[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleNotification(notificationsToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleNotificationMutation;
