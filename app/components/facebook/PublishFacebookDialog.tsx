"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { Facebook } from "@mui/icons-material";
import { useAction, useApi, useRemote } from "@/app/components/catering/api";
import type { EventDetails } from "@/app/components/catering/types";

type Props = {
  open: boolean;
  onClose: () => void;
  event: EventDetails;
};

type Connection = { connected: boolean; pageName: string | null };

export default function PublishFacebookDialog({ open, onClose, event }: Props) {
  const api = useApi();
  const action = useAction();
  const connection = useRemote<Connection>(open ? "/facebook/connection" : null);
  const imageAttachments = useMemo(
    () => event.attachments.filter((attachment) => attachment.mimeType.startsWith("image/")),
    [event.attachments],
  );
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [permalink, setPermalink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(`${event.title}\n${event.date}${event.guestCount ? ` - ${event.guestCount} gości` : ""}`);
    setSelected([]);
    setFiles(null);
    setPermalink(null);
  }, [open, event.title, event.date, event.guestCount]);

  const toggle = (uuid: string, checked: boolean) => {
    setSelected((current) => checked ? [...current, uuid] : current.filter((id) => id !== uuid));
  };

  return (
    <Dialog open={open} onClose={() => !action.busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ backgroundColor: '#171717', color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
        Publikuj post na Facebooku
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          {connection.error && <Alert severity="error">{connection.error}</Alert>}
          {action.error && <Alert severity="error">{action.error}</Alert>}
          {permalink && (
            <Alert severity="success">
              Opublikowano.{" "}
              <MuiLink href={permalink} target="_blank" rel="noopener noreferrer">Otwórz post na Facebooku</MuiLink>
            </Alert>
          )}
          {connection.data && !connection.data.connected && (
            <Alert severity="warning">
              Najpierw połącz stronę firmową Facebook.{" "}
              <MuiLink component={NextLink} href="/settings/facebook">Przejdź do ustawień Facebook</MuiLink>
            </Alert>
          )}
          {connection.data?.connected && (
            <Typography variant="body2" color="text.secondary">
              Publikacja na stronę: <strong>{connection.data.pageName}</strong>
            </Typography>
          )}
          <TextField
            label="Treść posta"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={4}
            required
            disabled={action.busy}
            inputProps={{ maxLength: 5000 }}
            helperText={`${message.length}/5000`}
          />
          {imageAttachments.length > 0 && (
            <Stack>
              <Typography variant="subtitle2" mb={1}>Zdjęcia z wydarzenia</Typography>
              {imageAttachments.map((attachment) => (
                <FormControlLabel
                  key={attachment.uuid}
                  control={
                    <Checkbox
                      checked={selected.includes(attachment.uuid)}
                      onChange={(_, checked) => toggle(attachment.uuid, checked)}
                      disabled={action.busy}
                    />
                  }
                  label={`${attachment.name}${attachment.description ? ` - ${attachment.description}` : ""}`}
                />
              ))}
            </Stack>
          )}
          <TextField
            type="file"
            label="Dodaj inne zdjęcia z komputera"
            onChange={(e) => setFiles((e.target as HTMLInputElement).files)}
            disabled={action.busy}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { accept: "image/jpeg,image/png,image/webp,image/gif", multiple: true },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="primary" variant="contained" disabled={action.busy} onClick={onClose}>
          {permalink ? "Zamknij" : "Anuluj"}
        </Button>
        {!permalink && (
          <Button
            color="primary"
            variant="contained"
            startIcon={<Facebook />}
            disabled={action.busy || !connection.data?.connected || !message.trim()}
            onClick={() => action.run(async () => {
              const body = new FormData();
              body.append("message", message.trim());
              selected.forEach((uuid) => body.append("attachmentUuids[]", uuid));
              if (files) {
                Array.from(files).forEach((file) => body.append("files[]", file));
              }
              const result = await api<{ permalink?: string | null }>(
                "/events/" + event.uuid + "/facebook-posts",
                "POST",
                body,
              );
              setPermalink(result.permalink ?? null);
            }, "Opublikowano post na Facebooku.")}
          >
            Publikuj
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
