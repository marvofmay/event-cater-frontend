"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAction, useApi, useRemote } from "@/app/components/catering/api";
import { useUser } from "@/app/context/userContext";
import NoticeFormDialog from "./NoticeFormDialog";
import NoticeImage from "./NoticeImage";
import NoticeCover from "./NoticeCover";
import type { CompanyNotice } from "./types";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function CompanyNoticesBoard() {
  const { t } = useTranslation();
  const { hasPermission } = useUser();
  const canManage = hasPermission("company_notices.create");
  const api = useApi();
  const remote = useRemote<{ items: CompanyNotice[] }>("/company-notices");
  const action = useAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyNotice | null>(null);
  const [selected, setSelected] = useState<CompanyNotice | null>(null);

  const items = remote.data?.items ?? [];

  return (
    <Box component="section" sx={{ width: "100%", maxWidth: 900, mx: "auto" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>{t("info.title")}</Typography>
          <Typography color="text.secondary">{t("info.intro")}</Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t("info.add")}
          </Button>
        )}
      </Stack>

      {remote.error && <Alert severity="error" sx={{ mb: 2 }}>{remote.error || t("info.loadError")}</Alert>}
      {action.error && <Alert severity="error" sx={{ mb: 2 }}>{action.error}</Alert>}

      {!remote.loading && items.length === 0 && (
        <Alert severity="info">{canManage ? t("info.emptyAdmin") : t("info.empty")}</Alert>
      )}

      <Stack spacing={2}>
        {items.map((notice) => (
          <Box
            key={notice.uuid}
            component="article"
            sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
          >
            {notice.cover && (
              <NoticeCover noticeUuid={notice.uuid} imageUuid={notice.cover.uuid} alt={notice.title} />
            )}
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" component="h2" gutterBottom>{notice.title}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {t("info.createdBy")}: {notice.createdByName} - {formatDate(notice.createdAt)}
              </Typography>
              <Typography
                sx={{
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  mb: 2,
                }}
              >
                {notice.body}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={() => setSelected(notice)}>{t("info.open")}</Button>
                {canManage && (
                  <>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditing(notice);
                        setFormOpen(true);
                      }}
                    >
                      {t("info.edit")}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={action.busy}
                      onClick={() => {
                        if (!window.confirm(t("info.confirmDelete"))) return;
                        action.run(async () => {
                          await api("/company-notices/" + notice.uuid, "DELETE");
                          remote.reload();
                        }, t("info.deleted"));
                      }}
                    >
                      {t("info.delete")}
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ backgroundColor: '#171717', color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
            {selected.title}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
              {selected.cover && (
                <NoticeCover
                  noticeUuid={selected.uuid}
                  imageUuid={selected.cover.uuid}
                  alt={selected.title}
                  maxHeight={360}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {t("info.createdBy")}: {selected.createdByName} - {formatDate(selected.createdAt)}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{selected.body}</Typography>
              {selected.gallery.length > 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1 }}>
                  {selected.gallery.map((image) => (
                    <NoticeImage
                      key={image.uuid}
                      noticeUuid={selected.uuid}
                      imageUuid={image.uuid}
                      alt={image.fileName}
                      height={140}
                      objectFit="contain"
                    />
                  ))}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>{t("info.close")}</Button>
          </DialogActions>
        </Dialog>
      )}

      {canManage && (
        <NoticeFormDialog
          open={formOpen}
          notice={editing}
          onClose={() => setFormOpen(false)}
          onSaved={remote.reload}
        />
      )}
    </Box>
  );
}
