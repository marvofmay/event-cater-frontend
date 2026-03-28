import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import Note from "@/app/types/Note";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const deleteNote = async (
  noteToDelete: Note,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.delete(
      `${SERVICE_COMPANY_URL}/api/users/notes/${noteToDelete.uuid}`,
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

const useDeleteNoteMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (noteToDelete: Note) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return deleteNote(noteToDelete, token);
    },
  });
};

export default useDeleteNoteMutation;
