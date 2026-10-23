import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Note from "@/app/types/Note";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteMultipleNote = async (
  notesToDelete: Note[],
  token: string,
): Promise<string> => {
  try {
    const notesUUIDs = {
      notesUUIDs: notesToDelete.map((item) => item.uuid),
    };

    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/users/notes/multiple`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: notesUUIDs,
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

const useDeleteMultipleNoteMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (notesToDelete: Note[]) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteMultipleNote(notesToDelete, token);
    },
    onSuccess: async () => {},
  });
};

export default useDeleteMultipleNoteMutation;
