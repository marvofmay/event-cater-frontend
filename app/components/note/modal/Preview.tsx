import React, { useEffect, useState } from "react";
import Note from "../../../types/Note";
import Preview from "../../modal/Preview";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { renderNotePriority } from "@/app/components/note/renderNotePriority";

interface PreviewNoteModalProps {
  open: boolean;
  selectedNote: Note | null;
  onClose: () => void;
}

const PreviewNoteModal: React.FC<PreviewNoteModalProps> = ({
  open,
  selectedNote,
  onClose,
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const fetchNote = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("Token is missing");

        return;
      }

      try {
        const response = await axios.get(
          `${SERVICE_COMPANY_URL}/api/users/notes/${selectedNote?.uuid}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response?.data.data) {
          setNote(response.data.data);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 200) {
          window.location.href = "/me/logout";
        }
        console.error("Error fetching note by uuid:", error);
      }
    };

    if (selectedNote?.uuid) {
      fetchNote();
    }
  }, [selectedNote]);

  return (
    <Preview
      open={open}
      title={t("note.modal.preview.title")}
      details={{
        UUID: note?.uuid || "N/D",
        [t("note.form.field.title")]: note?.title || "N/D",
        [t("note.form.field.content")]: note?.content || "N/D",
        [t("note.form.field.priority")]: renderNotePriority(
          t,
          note?.priority,
          "N/D",
        ),
        [t("note.form.field.createdAt")]: note?.createdAt || "N/D",
        [t("note.form.field.updatedAt")]: note?.updatedAt || "N/D",
      }}
      onClose={onClose}
    />
  );
};

export default PreviewNoteModal;
