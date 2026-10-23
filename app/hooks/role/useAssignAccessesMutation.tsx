import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const assignAccesses = async (
  roleUUID: string,
  accessesUUIDs: string[],
  token: string,
): Promise<string> => {
  try {
    const response = await axios.post(
      `${SERVICE_COMPANY_URL}/api/roles/${roleUUID}/accesses`,
      { accessesUUIDs },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.message;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useAssignAccessesMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      roleUUID,
      accessesUUIDs,
    }: {
      roleUUID: string;
      accessesUUIDs: string[];
    }) => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return assignAccesses(roleUUID, accessesUUIDs, token);
    },
  });
};

export default useAssignAccessesMutation;
