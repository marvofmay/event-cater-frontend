import { useQuery } from "@tanstack/react-query";
import Notification from "../../types/Notification";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface NotificationsResponse {
  items: Notification[];
  total: number;
}

const fetchNotifications = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
): Promise<NotificationsResponse> => {
  try {
    const response = await axios.get(
      `${SERVICE_COMPANY_URL}/api/notification-messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { pageSize, page, sortBy, sortDirection, phrase },
      },
    );

    return {
      items: response.data.data.items || [],
      total: response.data.data.total || 0,
    };
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useNotificationsQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
) => {
  const { t } = useTranslation();

  return useQuery<NotificationsResponse>({
    queryKey: ["roles", pageSize, page, sortBy, sortDirection, phrase],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchNotifications(
        token,
        pageSize,
        page,
        sortBy,
        sortDirection,
        phrase,
      );
    },
  });
};

export default useNotificationsQuery;
