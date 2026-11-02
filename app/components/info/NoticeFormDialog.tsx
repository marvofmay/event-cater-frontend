"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAction, useApi } from "@/app/components/catering/api";
import type { CompanyNotice } from "./types";
import NoticeImage from "./NoticeImage";
import CoverCropDialog from "./CoverCropDialog";
import { COVER_ASPECT, COVER_MAX_HEIGHT } from "./coverAspect";
import NoticeCover from "./NoticeCover";

type Props = {
  open: boolean;
  notice: CompanyNotice | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function NoticeFormDialog({ open, notice, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const api = useApi();
  const action = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [gallery, setGallery] = useState<FileList | null>(null);
  const [removeImageUuids, setRemoveImageUuids] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(notice?.title ?? "");
    setBody(notice?.body ?? "");
    setCover(null);
    setCoverPreviewUrl("");
    setCropSource(null);
    setGallery(null);
    setRemoveImageUuids([]);
  }, [open, notice]);

  useEffect(() => {
    if (!cover) {
      setCoverPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const visibleGallery = (notice?.gallery ?? []).filter((image) => !removeImageUuids.includes(image.uuid));

  return (
    <>
      <Dialog open={open} onClose={() => !action.busy && onClose()} fullWidth maxWidth="sm">
        <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
          {notice ? t("info.edit") : t("info.add")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            {action.error && <Typography color="error">{action.error}</Typography>}
            <TextField
              label={t("info.formTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 200 }}
              disabled={action.busy}
            />
            <TextField
              label={t("info.formBody")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              fullWidth
              required
              multiline
              minRows={5}
              inputProps={{ maxLength: 20000 }}
              disabled={action.busy}
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2">{notice ? t("info.formCoverReplace") : t("info.formCover")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("info.formCoverHint")}</Typography>
              {coverPreviewUrl ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    bgcolor: "#1e293b",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    component="img"
                    src={coverPreviewUrl}
                    alt={cover?.name ?? "Podgląd zdjęcia wiodącego"}
                    sx={{
                      width: `min(100%, calc(${COVER_MAX_HEIGHT}px * ${COVER_ASPECT}))`,
                      maxWidth: "100%",
                      maxHeight: COVER_MAX_HEIGHT,
                      aspectRatio: `${COVER_ASPECT}`,
                      height: "auto",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </Box>
              ) : notice?.cover ? (
                <NoticeCover noticeUuid={notice.uuid} imageUuid={notice.cover.uuid} alt={notice.title} />
              ) : null}
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button variant="outlined" component="label" disabled={action.busy}>
                  {t("info.formCover")}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      if (selected) setCropSource(selected);
                    }}
                  />
                </Button>
                {cover && (
                  <Button
                    variant="text"
                    disabled={action.busy}
                    onClick={() => {
                      setCover(null);
                      setCoverPreviewUrl("");
                    }}
                  >
                    Usuń wybrany kadr
                  </Button>
                )}
              </Stack>
              {cover && <Typography variant="body2" color="text.secondary">{cover.name}</Typography>}
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("info.formGallery")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("info.formGalleryHint")}</Typography>
              {visibleGallery.map((image) => (
                <Stack key={image.uuid} direction="row" gap={1} alignItems="center">
                  <NoticeImage noticeUuid={notice!.uuid} imageUuid={image.uuid} alt={image.fileName} height={72} objectFit="contain" />
                  <Button
                    size="small"
                    color="error"
                    disabled={action.busy}
                    onClick={() => setRemoveImageUuids((current) => [...current, image.uuid])}
                  >
                    {t("info.removeImage")}
                  </Button>
                </Stack>
              ))}
              <Button variant="outlined" component="label" disabled={action.busy}>
                {t("info.formGallery")}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setGallery(e.target.files)}
                />
              </Button>
              {gallery && gallery.length > 0 && (
                <Typography variant="body2">{Array.from(gallery).map((file) => file.name).join(", ")}</Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={action.busy}>{t("info.cancel")}</Button>
          <Button
            variant="contained"
            disabled={action.busy || !title.trim() || !body.trim() || (!notice && !cover)}
            onClick={() =>
              action.run(async () => {
                const form = new FormData();
                form.append("title", title.trim());
                form.append("body", body.trim());
                if (cover) form.append("cover", cover);
                if (gallery) {
                  Array.from(gallery).forEach((file) => form.append("gallery[]", file));
                }
                removeImageUuids.forEach((uuid) => form.append("removeImageUuids[]", uuid));
                if (notice) {
                  await api("/company-notices/" + notice.uuid, "POST", form);
                } else {
                  await api("/company-notices", "POST", form);
                }
                onSaved();
                onClose();
              }, t("info.saved"))
            }
          >
            {t("info.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <CoverCropDialog
        open={Boolean(cropSource)}
        file={cropSource}
        onCancel={() => setCropSource(null)}
        onConfirm={(cropped) => {
          setCover(cropped);
          setCropSource(null);
        }}
      />
    </>
  );
}
