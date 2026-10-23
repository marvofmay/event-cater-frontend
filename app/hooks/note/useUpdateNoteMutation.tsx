import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import NotePayload from "../../types/NotePayload";
import { useTranslation } from "react-i18next";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

const updateNote = async (
  updatedNotePayload: NotePayload,
  token: string,
): Promise<string> => {
  try {
    const response = await axios.put(
      `${SERVICE_COMPANY_URL}/api/users/notes/${updatedNotePayload.uuid}`,
      updatedNotePayload,
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

const useUpdateNoteMutation = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (updatedNotePayload: NotePayload) => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(t("common.message.tokenIsMissing"));
      }

      return updateNote(updatedNotePayload, token);
    },
    onError: (error) => {
      throw error;
    },
  });
};

export default useUpdateNoteMutation;
