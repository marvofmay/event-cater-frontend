"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { downloadPrivate, useAction, useApi, useRemote } from "@/app/components/catering/api";
import { useUser } from "@/app/context/userContext";

type CompanyDocument = {
  uuid: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdByName: string;
  createdAt: string;
};

type ListResponse = { items: CompanyDocument[]; categories: string[] };

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompanyDocumentsPage() {
  const { t } = useTranslation();
  const { token, hasPermission } = useUser();
  const canManage = hasPermission("documents.create");
  const api = useApi();
  const action = useAction();
  const [category, setCategory] = useState("all");
  const remote = useRemote<ListResponse>(
    `/company-documents?category=${encodeURIComponent(category)}`,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formCategory, setFormCategory] = useState("other");
  const [file, setFile] = useState<File | null>(null);

  const categories = useMemo(
    () => ["all", ...(remote.data?.categories ?? [])],
    [remote.data?.categories],
  );
  const items = remote.data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setFormCategory(category === "all" ? "other" : category);
    setFile(null);
    setFormOpen(true);
  };

  const openEdit = (document: CompanyDocument) => {
    setEditing(document);
    setTitle(document.title);
    setDescription(document.description ?? "");
    setFormCategory(document.category);
    setFile(null);
    setFormOpen(true);
  };

  return (
    <Box component="main" sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>{t("documents.title")}</Typography>
          <Typography color="text.secondary">{t("documents.intro")}</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" onClick={openCreate}>{t("documents.add")}</Button>
        )}
      </Stack>

      <TextField
        select
        label={t("documents.formCategory")}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        size="small"
        sx={{ mb: 2, minWidth: 260, maxWidth: 360 }}
      >
        {categories.map((id) => (
          <MenuItem key={id} value={id}>
            {id === "all" ? t("documents.all") : t(`documents.categories.${id}`)}
          </MenuItem>
        ))}
      </TextField>

      {remote.error && <Alert severity="error" sx={{ mb: 2 }}>{remote.error}</Alert>}
      {action.error && <Alert severity="error" sx={{ mb: 2 }}>{action.error}</Alert>}

      {!remote.loading && items.length === 0 && (
        <Alert severity="info">{canManage ? t("documents.emptyAdmin") : t("documents.empty")}</Alert>
      )}

      <Stack spacing={1.5}>
        {items.map((document) => (
          <Box key={document.uuid} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
            <Typography variant="h6" component="h2">{document.title}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t(`documents.categories.${document.category}`)} - {document.fileName} - {sizeLabel(document.size)}
              {" - "}{document.createdByName}
            </Typography>
            {document.description && (
              <Typography color="text.secondary" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>{document.description}</Typography>
            )}
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                disabled={action.busy}
                onClick={() =>
                  action.run(
                    () => downloadPrivate(`/company-documents/${document.uuid}/file`, token, document.fileName),
                    "Pobrano plik.",
                  )
                }
              >
                {t("documents.download")}
              </Button>
              {canManage && (
                <>
                  <Button size="small" onClick={() => openEdit(document)}>{t("documents.edit")}</Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={action.busy}
                    onClick={() => {
                      if (!window.confirm(t("documents.confirmDelete"))) return;
                      action.run(async () => {
                        await api(`/company-documents/${document.uuid}`, "DELETE");
                        remote.reload();
                      }, t("documents.deleted"));
                    }}
                  >
                    {t("documents.delete")}
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={formOpen} onClose={() => !action.busy && setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
          {editing ? t("documents.edit") : t("documents.add")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label={t("documents.formTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 200 }}
              disabled={action.busy}
            />
            <TextField
              label={t("documents.formDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 5000 }}
              disabled={action.busy}
            />
            <TextField
              select
              label={t("documents.formCategory")}
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              fullWidth
              disabled={action.busy}
            >
              {(remote.data?.categories ?? []).map((id) => (
                <MenuItem key={id} value={id}>{t(`documents.categories.${id}`)}</MenuItem>
              ))}
            </TextField>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">{editing ? t("documents.formFileReplace") : t("documents.formFile")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("documents.formFileHint")}</Typography>
              <Button variant="outlined" component="label" disabled={action.busy}>
                {t("documents.formFile")}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {(file || editing) && (
                <Typography variant="body2">{file?.name ?? editing?.fileName}</Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={action.busy}>{t("documents.cancel")}</Button>
          <Button
            variant="contained"
            disabled={action.busy || !title.trim() || (!editing && !file)}
            onClick={() =>
              action.run(async () => {
                const form = new FormData();
                form.append("title", title.trim());
                form.append("description", description.trim());
                form.append("category", formCategory);
                if (file) form.append("file", file);
                if (editing) {
                  await api(`/company-documents/${editing.uuid}`, "POST", form);
                } else {
                  await api("/company-documents", "POST", form);
                }
                setFormOpen(false);
                remote.reload();
              }, t("documents.saved"))
            }
          >
            {t("documents.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
