"use client";

import { Button, Dialog, DialogActions, DialogContent } from "@mui/material";
import { useTranslation } from "react-i18next";
import NoticeCover from "./NoticeCover";
import NoticeImage from "./NoticeImage";
import type { CompanyNotice } from "./types";
import "./notices-board.css";

type Props = {
  notice: CompanyNotice | null;
  onClose: () => void;
  metaLine?: string;
};

export default function NoticeDetailDialog({ notice, onClose, metaLine }: Props) {
  const { t } = useTranslation();
  if (!notice) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: "1.15rem" },
          overflow: "hidden",
          backgroundImage: "none",
          bgcolor: "#fbfcfb",
        },
      }}
    >
      {notice.cover && (
        <NoticeCover
          noticeUuid={notice.uuid}
          imageUuid={notice.cover.uuid}
          alt={notice.title}
          maxHeight={380}
        />
      )}
      <DialogContent sx={{ p: 0 }}>
        <h2 className="ec-notice-detail__title">{notice.title}</h2>
        {metaLine ? <p className="ec-notice-detail__meta">{metaLine}</p> : null}
        <p className="ec-notice-detail__body">{notice.body}</p>
        {notice.gallery.length > 0 && (
          <div className="ec-notice-detail__gallery">
            {notice.gallery.map((image) => (
              <NoticeImage
                key={image.uuid}
                noticeUuid={notice.uuid}
                imageUuid={image.uuid}
                alt={image.fileName}
                height={140}
                objectFit="cover"
              />
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.75 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: "rgba(28, 61, 50, 0.28)",
            color: "#1c3d32",
            textTransform: "none",
            borderRadius: "999px",
            px: 2,
            "&:hover": {
              borderColor: "#1c3d32",
              backgroundColor: "rgba(28, 61, 50, 0.06)",
            },
          }}
        >
          {t("info.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
