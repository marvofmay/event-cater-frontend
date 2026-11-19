"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit, Preview, Search } from "@mui/icons-material";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useAction, useApi, useRemote } from "@/app/components/catering/api";
import { useUser } from "@/app/context/userContext";
import NoticeCover from "./NoticeCover";
import NoticeFormDialog from "./NoticeFormDialog";
import NoticeImage from "./NoticeImage";
import type { CompanyNotice, NoticeStatus } from "./types";

const filters: { value: NoticeStatus; label: string }[] = [
  { value: "published", label: "filterPublished" },
  { value: "scheduled", label: "filterScheduled" },
  { value: "archived", label: "filterArchived" },
  { value: "inactive", label: "filterInactive" },
];

const statusColor: Record<NoticeStatus, "success" | "warning" | "default" | "error"> = {
  published: "success",
  scheduled: "warning",
  archived: "default",
  inactive: "error",
};

type SortKey = "title" | "status" | "publishAt" | "createdAt";

function stamp(value: string) {
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : value;
}

export default function NoticesManageTable() {
  const { t } = useTranslation();
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [status, setStatus] = useState<NoticeStatus>("published");
  const [searchInput, setSearchInput] = useState("");
  const [phrase, setPhrase] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>("publishAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyNotice | null>(null);
  const [selected, setSelected] = useState<CompanyNotice | null>(null);
  const remote = useRemote<{ items: CompanyNotice[] }>("/company-notices?status=" + status);
  const canCreate = hasPermission("company_notices.create");
  const canUpdate = hasPermission("company_notices.update");
  const canDelete = hasPermission("company_notices.delete");

  const rows = useMemo(() => {
    const needle = phrase.trim().toLowerCase();
    const items = (remote.data?.items ?? []).filter((notice) => {
      if (!needle) return true;
      return notice.title.toLowerCase().includes(needle) || notice.createdByName.toLowerCase().includes(needle);
    });
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...items].sort((left, right) => {
      const a = left[sortBy] ?? "";
      const b = right[sortBy] ?? "";
      return String(a).localeCompare(String(b), "pl") * direction;
    });
  }, [phrase, remote.data, sortBy, sortDirection]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const sort = (key: SortKey) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const statusLabel = (value: NoticeStatus) => t("info.status" + value.charAt(0).toUpperCase() + value.slice(1));

  return (
    <Box component="section" sx={{ width: "100%", maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>{t("info.title")}</Typography>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2} gap={1} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" sx={{ width: { xs: "100%", md: "auto" }, minWidth: 0 }}>
          <TextField
            variant="outlined"
            placeholder={t("info.search")}
            size="small"
            value={searchInput}
            sx={{ width: { xs: "100%", sm: 280, md: 420 }, maxWidth: "100%" }}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPhrase(searchInput);
                setPage(1);
              }
            }}
          />
          <Button startIcon={<Search />} variant="contained" color="primary" onClick={() => { setPhrase(searchInput); setPage(1); }}>
            {t("info.searchButton")}
          </Button>
        </Box>
        {canCreate && (
          <Box display="flex" alignItems="center" gap={1} ml="auto">
            <Button variant="contained" color="success" startIcon={<Add />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              {t("info.add")}
            </Button>
          </Box>
        )}
      </Box>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} role="group" aria-label="Filtr ogłoszeń">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            size="small"
            variant={status === filter.value ? "contained" : "outlined"}
            onClick={() => { setStatus(filter.value); setPage(1); }}
          >
            {t("info." + filter.label)}
          </Button>
        ))}
      </Stack>
      {remote.error && <Typography color="error" sx={{ mb: 2 }}>{remote.error || t("info.loadError")}</Typography>}
      {action.error && <Typography color="error" sx={{ mb: 2 }}>{action.error}</Typography>}
      <TableContainer sx={{ maxHeight: "65vh", overflow: "auto" }}>
        <Table aria-label="Lista ogłoszeń">
          <TableHead>
            <TableRow>
              <TableCell sx={{ padding: "4px 8px", width: 56 }}>#</TableCell>
              {([
                ["title", "columnTitle"],
                ["status", "columnStatus"],
                ["publishAt", "columnPublishAt"],
                ["createdAt", "columnCreatedAt"],
              ] as const).map(([key, label]) => (
                <TableCell key={key} sortDirection={sortBy === key ? sortDirection : false} sx={{ padding: "4px 8px" }}>
                  <TableSortLabel active={sortBy === key} direction={sortBy === key ? sortDirection : "asc"} onClick={() => sort(key)}>
                    {t("info." + label)}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ padding: "4px 8px" }}>{t("info.columnAuthor")}</TableCell>
              <TableCell sx={{ padding: "4px 8px", whiteSpace: "nowrap", width: "1%" }}>{t("info.columnActions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 && !remote.loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>{t("info.noRows")}</TableCell>
              </TableRow>
            )}
            {pageRows.map((notice, index) => (
              <TableRow key={notice.uuid} hover>
                <TableCell sx={{ padding: "4px 8px" }}>{(page - 1) * pageSize + index + 1}</TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>{notice.title}</TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>
                  <Chip size="small" label={statusLabel(notice.status)} color={statusColor[notice.status]} variant={notice.status === "archived" ? "outlined" : "filled"} />
                </TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>{stamp(notice.publishAt)}</TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>{stamp(notice.createdAt)}</TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>{notice.createdByName}</TableCell>
                <TableCell sx={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                  <Tooltip title={t("info.preview")}><IconButton aria-label={t("info.preview") + ": " + notice.title} onClick={() => setSelected(notice)}><Preview /></IconButton></Tooltip>
                  {canUpdate && <Tooltip title={t("info.edit")}><IconButton aria-label={t("info.edit") + ": " + notice.title} onClick={() => { setEditing(notice); setFormOpen(true); }}><Edit /></IconButton></Tooltip>}
                  {canDelete && <Tooltip title={t("info.delete")}><IconButton aria-label={t("info.delete") + ": " + notice.title} onClick={() => {
                    if (!window.confirm(t("info.confirmDelete"))) return;
                    action.run(async () => {
                      await api("/company-notices/" + notice.uuid, "DELETE");
                      remote.reload();
                    }, t("info.deleted"));
                  }}><Delete /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > 0 && (
        <TablePagination
          component="div"
          count={rows.length}
          page={page - 1}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          onPageChange={(_, value) => setPage(value + 1)}
          onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
          labelRowsPerPage={t("info.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) => from + "-" + to + " z " + count}
        />
      )}
      {selected && (
        <Dialog open onClose={() => setSelected(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>{selected.title}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
              {selected.cover && <NoticeCover noticeUuid={selected.uuid} imageUuid={selected.cover.uuid} alt={selected.title} maxHeight={360} />}
              <Typography variant="caption" color="text.secondary">{statusLabel(selected.status)} - {t("info.columnPublishAt")}: {stamp(selected.publishAt)}</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{selected.body}</Typography>
              {selected.gallery.length > 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1 }}>
                  {selected.gallery.map((image) => (
                    <NoticeImage key={image.uuid} noticeUuid={selected.uuid} imageUuid={image.uuid} alt={image.fileName} height={140} objectFit="contain" />
                  ))}
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setSelected(null)}>{t("info.close")}</Button></DialogActions>
        </Dialog>
      )}
      {(canCreate || canUpdate) && (
        <NoticeFormDialog open={formOpen} notice={editing} onClose={() => setFormOpen(false)} onSaved={remote.reload} />
      )}
    </Box>
  );
}
