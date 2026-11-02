"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { Locale } from "@svar-ui/react-core";
import { Filemanager, Willow, getMenuOptions, type IApi, type IEntity } from "@svar-ui/react-filemanager";
import { toast } from "react-toastify";
import { useUser } from "@/app/context/userContext";
import { useApi } from "@/app/components/catering/api";
import { beginPendingOperation } from "@/app/utils/pendingOperations";
import "@svar-ui/react-filemanager/all.css";
import "./theme.css";
import plSvar from "@/app/i18n/svar/pl";

interface Entry { uuid: string; parentUuid: string | null; name: string; type: "file" | "folder"; size: number; date: string }
interface Snapshot { version: number; items: Entry[]; usedBytes: number; maxBytes: number; maxEntries: number }

function tree(snapshot: Snapshot) {
  const entries = new Map(snapshot.items.map(entry => [entry.uuid, entry]));
  const paths = new Map<string, string>();
  const path = (entry: Entry): string => {
    if (!paths.has(entry.uuid)) paths.set(entry.uuid, (entry.parentUuid ? path(entries.get(entry.parentUuid)!) : "") + "/" + entry.name);
    return paths.get(entry.uuid)!;
  };
  const data: IEntity[] = snapshot.items.map(entry => ({ id: path(entry), type: entry.type, size: entry.size, date: new Date(entry.date) }));
  const byPath = new Map(snapshot.items.map(entry => [path(entry), entry]));
  return { data, byPath };
}

export default function MainFileManager() {
  const { token } = useUser();
  return <FileWorkspace key={token ?? "anonymous"} />;
}

function FileWorkspace() {
  const { token, tenant, hasPermission } = useUser();
  const api = useApi();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const queue = useRef(Promise.resolve());
  const panelPaths = useRef<string[]>(["/", "/"]);
  const canCreate = hasPermission("file_manager.create"), canUpdate = hasPermission("file_manager.update"), canDelete = hasPermission("file_manager.delete"), canView = hasPermission("file_manager.view");
  const parsed = useMemo(() => snapshot ? tree(snapshot) : null, [snapshot]);

  const reload = async () => {
    const fresh = await api<Snapshot>("/file-manager");
    if (mounted.current) { current.current = fresh; setSnapshot(fresh); setError(""); }
  };
  useEffect(() => {
    mounted.current = true;
    reload().catch(failure => { if (mounted.current) setError(failure.message); });
    return () => { mounted.current = false; };
  }, [api]);

  const download = async (id: string) => {
    if (!canView || !current.current) throw new Error("Brak uprawnień do pobierania plików.");
    const entry = tree(current.current).byPath.get(id);
    if (!entry || entry.type !== "file") return;
    const response = await fetch("/api/file-manager/" + entry.uuid + "/download", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 403 ? "Brak uprawnień do pobierania plików." : "Nie udało się pobrać pliku. Odśwież widok lub zaloguj się ponownie.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = entry.name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const init = (manager: IApi) => {
    const perform = (allowed: boolean, action: (version: number, entry: (path: string) => Entry, parent: (path: string) => string | null) => Promise<unknown>) => {
      queue.current = queue.current.then(async () => {
        if (!mounted.current) return;
        setBusy(true);
        const complete = beginPendingOperation();
        try {
          if (!allowed) throw new Error("Brak uprawnień do tej operacji.");
          const latest = current.current;
          if (!latest) throw new Error("Odśwież listę plików.");
          const byPath = tree(latest).byPath;
          const entry = (path: string) => {
            const found = byPath.get(path);
            if (!found) throw new Error("Plik lub folder nie jest już dostępny. Odśwież widok.");
            return found;
          };
          panelPaths.current = manager.getState().panels?.map(panel => panel.path ?? "/") ?? ["/", "/"];
          await action(latest.version, entry, path => path === "/" ? null : entry(path).uuid);
          await reload();
          if (mounted.current) toast.success("Zapisano zmiany.");
        } catch (failure) {
          const message = failure instanceof Error ? failure.message : "Nie udało się zapisać zmian.";
          if (mounted.current) { setError(message); toast.error(message); }
        } finally {
          complete();
          if (mounted.current) setBusy(false);
        }
      });
      return false;
    };
    manager.intercept("create-file", event => perform(canCreate, async (version, _entry, parent) => {
      if (event.file.file) {
        if (!event.file.file.size || event.file.file.size > 20 * 1024 * 1024) throw new Error("Plik musi mieć od 1 bajta do 20 MiB.");
        const form = new FormData();
        form.append("file", event.file.file);
        form.append("name", event.file.name);
        form.append("version", String(version));
        const uuid = parent(event.parent);
        if (uuid) form.append("parentUuid", uuid);
        return api("/file-manager/upload", "POST", form);
      }
      if (event.file.type !== "folder") throw new Error("Aby dodać plik, wybierz opcję Wgraj plik.");
      return api("/file-manager/folders", "POST", { name: event.file.name, parentUuid: parent(event.parent), version });
    }));
    manager.intercept("rename-file", event => perform(canUpdate, (version, entry) => api("/file-manager/" + entry(event.id).uuid + "/rename", "PATCH", { name: event.name, version })));
    manager.intercept("delete-files", event => perform(canDelete, (version, entry) => api("/file-manager/delete", "POST", { uuids: event.ids.map(id => entry(id).uuid), version })));
    manager.intercept("move-files", event => perform(canUpdate, (version, entry, parent) => api("/file-manager/transfer", "POST", { operation: "move", uuids: event.ids.map(id => entry(id).uuid), parentUuid: parent(event.target), version })));
    manager.intercept("copy-files", event => perform(canCreate && canView, (version, entry, parent) => api("/file-manager/transfer", "POST", { operation: "copy", uuids: event.ids.map(id => entry(id).uuid), parentUuid: parent(event.target), version })));
    const receive = ({ id }: { id: string }) => { void download(id).catch(failure => toast.error(failure.message)); return false; };
    manager.intercept("download-file", receive);
    manager.intercept("open-file", receive);
  };

  return <Box className="eventcater-file-manager" sx={{ minWidth: 0 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
      <Typography variant="body2" color="text.secondary">Twoje prywatne pliki{tenant?.name ? " w firmie " + tenant.name : ""}. Maksymalnie 20 MiB na plik.</Typography>
      <Button startIcon={<Refresh />} disabled={busy} onClick={() => reload().catch(failure => { setError(failure.message); toast.error(failure.message); })}>Odśwież</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {!snapshot && !error && <CircularProgress aria-label="Wczytywanie plików" />}
    {snapshot && parsed && <>
      <Typography variant="caption" color="text.secondary">Wykorzystano {(snapshot.usedBytes / 1024 / 1024).toFixed(1)} MiB z {snapshot.maxBytes / 1024 / 1024 / 1024} GiB - {snapshot.items.length} z {snapshot.maxEntries} plików i folderów</Typography>
      <Locale words={plSvar}><Willow>
        <Box aria-busy={busy} sx={{ height: "70vh", minHeight: 500, position: "relative", pointerEvents: busy ? "none" : "auto", opacity: busy ? 0.65 : 1 }}>
          {busy && <CircularProgress size={28} aria-label="Zapisywanie plików" sx={{ position: "absolute", top: 12, right: 12, zIndex: 2 }} />}
          <Filemanager key={[snapshot.version, canCreate, canUpdate, canDelete, canView].join('-')} data={parsed.data} drive={{ used: snapshot.usedBytes, total: snapshot.maxBytes }} panels={panelPaths.current.map(path => ({ path: path === "/" || parsed.byPath.get(path)?.type === "folder" ? path : "/" }))} init={init} readonly={!canCreate && !canUpdate && !canDelete} menuOptions={mode => getMenuOptions(mode).filter(option => {
            if (option.id === "add-file") return false;
            if (["add-folder", "upload"].includes(String(option.id))) return canCreate;
            if (option.id === "download") return canView;
            if (option.id === "copy") return canCreate && canView;
            if (["move", "rename"].includes(String(option.id))) return canUpdate;
            if (option.id === "delete") return canDelete;
            if (option.id === "paste") return canCreate || canUpdate;
            return true;
          }).map(option => ({ ...option, hotkey: option.hotkey ?? "" }))} />
        </Box>
      </Willow></Locale>
    </>}
  </Box>;
}
