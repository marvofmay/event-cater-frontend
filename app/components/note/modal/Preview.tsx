import React, { useEffect, useId, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import Note from "../../../types/Note";
import Preview from "../../modal/Preview";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { renderNotePriority } from "@/app/components/note/renderNotePriority";
import { stickyNoteStyles } from "@/app/components/note/stickyNoteStyles";

interface PreviewNoteModalProps {
  open: boolean;
  selectedNote: Note | null;
  onClose: () => void;
  view?: 'table' | 'board';
}

const PreviewNoteModal: React.FC<PreviewNoteModalProps> = ({
  open,
  selectedNote,
  onClose,
  view = 'table',
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const titleId = useId();
  const contentId = useId();

  useEffect(() => {
    const controller = new AbortController();
    setNote(null);
    setLoading(true);
    setError(false);
    const fetchNote = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${SERVICE_COMPANY_URL}/api/users/notes/${selectedNote?.uuid}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response?.data.data) {
          setNote(response.data.data);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(true);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          window.location.href = "/me/logout";
        }
        console.error("Error fetching note by uuid:", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (selectedNote?.uuid) {
      fetchNote();
    }
    return () => controller.abort();
  }, [selectedNote]);

  if (view === 'board') {
    const displayedNote = note ?? selectedNote;
    return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} aria-describedby={contentId}
      PaperProps={{ sx: { ...stickyNoteStyles(displayedNote?.priority ?? 'low'), overflow: 'visible', minHeight: 380, m: { xs: 2, sm: 4 }, width: { xs: 'calc(100% - 32px)', sm: '100%' } } }}>
      <DialogTitle id={titleId} sx={{ pt: 3, pb: 2, px: { xs: 2.5, sm: 4 }, color: 'inherit' }}>
        <Typography component="span" sx={{ display: 'block', fontSize: 11, color: '#57534e', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>{t('note.modal.preview.title')}</Typography>
        <Typography component="span" sx={{ display: 'block', fontSize: 24, lineHeight: 1.35, fontWeight: 700, overflowWrap: 'anywhere' }}>{displayedNote?.title || t('note.view.untitled')}</Typography>
      </DialogTitle>
      <DialogContent id={contentId} sx={{ px: { xs: 2.5, sm: 4 }, py: 1, minHeight: 160, maxHeight: '55vh', overflowY: 'auto' }}>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} aria-label={t('common.loading')} /></Box>
          : error ? <Alert severity="error">{t('common.message.somethingWentWrong')}</Alert>
          : <Typography component="div" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 16, lineHeight: 1.8 }}>{note?.content ?? ''}</Typography>}
      </DialogContent>
      <DialogActions sx={{ mx: { xs: 2.5, sm: 4 }, px: 0, py: 2, borderTop: '1px solid rgba(87,83,78,0.15)', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ fontSize: 12, color: '#57534e' }}>
          {displayedNote?.createdAt && <Typography variant="caption" display="block">{t('note.form.field.createdAt')}: {displayedNote.createdAt}</Typography>}
          {displayedNote?.updatedAt && <Typography variant="caption" display="block">{t('note.form.field.updatedAt')}: {displayedNote.updatedAt}</Typography>}
        </Box>
        <Button onClick={onClose} variant="outlined" sx={{ color: '#44403c', borderColor: 'rgba(87,83,78,0.4)' }}>{t('common.button.close')}</Button>
      </DialogActions>
    </Dialog>;
  }

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
