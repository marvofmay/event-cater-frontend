"use client";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { RowAction } from "../common/RowAction";
import { useAction, useApi, useRemote } from "./api";
import {
  Feedback,
  FieldSelect,
  Loading,
  Pager,
  Panel,
  Permission,
  unitLabels,
} from "./ui";
import { CatalogItem, Page } from "./types";
import { Lookup, LookupItem } from "./Lookup";
import { EquipmentPhotoEditor, EquipmentPhotoGallery, EquipmentPhotoImage } from "./EquipmentPhotos";
export function CatalogPage({ kind }: { kind: "equipment" | "supplies" }) {
  const api = useApi();
  const { hasPermission } = useUser();
  const access = kind === "equipment" ? "equipment" : "consumables";
  const path = kind === "equipment" ? "/equipment" : "/consumables";
  const categoryPath = kind === "equipment" ? "/equipment-categories" : "/consumable-categories";
  const [q, setQ] = useState("");
  const [active, setActive] = useState(kind === "equipment" ? "all" : "true");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<LookupItem | null>(null);
  const [storageLocation, setStorageLocation] = useState<LookupItem | null>(null);
  const [edit, setEdit] = useState<Partial<CatalogItem> | null>(null);
  const [archive, setArchive] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [gallery, setGallery] = useState<CatalogItem | null>(null);
  const beginEdit = (item: Partial<CatalogItem>) => {
    setPhotoFiles([]);
    setRemovedPhotos([]);
    setEdit(item);
  };
  const remote = useRemote<Page<CatalogItem>>(
    hasPermission(access + ".list")
      ? `${path}?q=${encodeURIComponent(q)}&active=${active}&page=${page}${category ? "&categoryUuid=" + category.uuid : ""}${kind === "equipment" && storageLocation ? "&storageLocationUuid=" + storageLocation.uuid : ""}`
      : null,
  );
  const action = useAction();
  const units: Record<string, string> =
    kind === "equipment"
      ? { piece: "Sztuka", set: "Zestaw", kit: "Komplet" }
      : {
          piece: "Sztuka",
          carton: "Karton",
          pack: "Opakowanie",
          bottle: "Butelka",
          kg: "Kilogram",
          l: "Litr",
        };
  return (
    <Permission name={access + ".list"}>
      <Panel
        title={
          kind === "equipment" ? (
            <>
              Katalog sprzętu
              <Tooltip
                title="Tutaj zapisujesz sprzęt wielokrotnego użytku, np. stoły, krzesła, warniki i obrusy. Określ kategorię, jednostkę oraz posiadaną ilość. Później wybierasz sprzęt w kompletacji wydarzenia lub szablonie i podajesz potrzebną ilość."
                describeChild
                arrow
              >
                <IconButton size="small" aria-label="Informacje o katalogu sprzętu" sx={{ ml: 1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              Produkty i materiały zużywalne
              <Tooltip
                title="To katalog rzeczy, które zużywasz podczas obsługi wydarzenia, np. mleka, kawy, serwetek, kubków jednorazowych czy opakowań. Dodajesz je tutaj raz, a potem wybierasz w kompletacji wydarzenia lub szablonie i podajesz potrzebną ilość. Dzięki temu zespół wie, co i ile przygotować oraz zabrać na wydarzenie."
                describeChild
                arrow
              >
                <IconButton
                  size="small"
                  aria-label="Co to są produkty i materiały zużywalne?"
                  sx={{ ml: 1 }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )
        }
      >
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            label={kind === "equipment" ? "Szukaj po nazwie, nazwie slangowej lub kodzie" : "Szukaj po nazwie lub kodzie"}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
            <Lookup
              label={kind === "equipment" ? "Filtruj kategorię sprzętu" : "Filtruj kategorię produktu"}
              path={categoryPath}
              value={category}
              onChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            />
          <FieldSelect
            label="Widoczność"
            value={active}
            options={{ true: "Aktywne", false: "Archiwalne", all: "Wszystkie" }}
            onChange={(v) => {
              setActive(v);
              setPage(1);
            }}
          />
          {kind === "equipment" && (
            <Lookup
              label="Filtruj miejsce przechowywania"
              path="/equipment-locations"
              value={storageLocation}
              onChange={(value) => {
                setStorageLocation(value);
                setPage(1);
              }}
            />
          )}
          {hasPermission(access + ".create") && (
            <Button color="success" startIcon={<AddIcon fontSize="medium" />}
              variant="contained"
              onClick={() =>
                beginEdit({
                  name: "",
                  code: "",
                  category: "",
                  unit: "piece",
                  description: "",
                  ...(kind === "equipment" ? { slangName: "", stockQuantity: 0, storageLocationUuid: null } : {}),
                })
              }
            >
              Dodaj pozycję
            </Button>
          )}
          <Button component={Link} href={kind === "equipment" ? "/catering/equipment/categories" : "/catering/supplies/categories"}>
            {kind === "equipment" ? "Kategorie sprzętu" : "Kategorie produktów"}
          </Button>
          {kind === "equipment" && (
            <Button component={Link} href="/catering/equipment/locations">Miejsca sprzętu</Button>
          )}
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} disabled={remote.loading} onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  ...(kind === "equipment" ? ["Zdjęcie"] : []),
                  "Kod",
                  "Nazwa",
                  ...(kind === "equipment" ? ["Nazwa slangowa", "Ilość posiadana", "Miejsce przechowywania"] : []),
                  "Kategoria",
                  "Jednostka",
                  "Status",
                  "Działania",
                ].map((x) => (
                  <TableCell key={x}>{x}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {remote.data?.items.map((item) => (
                <TableRow key={item.uuid}>
                  {kind === "equipment" && (
                    <TableCell>
                      {item.photos?.[0] && hasPermission("equipment.view")
                        ? <EquipmentPhotoImage equipmentUuid={item.uuid} photo={item.photos[0]} thumbnail />
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  {kind === "equipment" && (
                    <>
                      <TableCell>{item.slangName || "—"}</TableCell>
                      <TableCell>{item.stockQuantity ?? 0} {unitLabels[item.unit]}</TableCell>
                      <TableCell>
                        <Tooltip title={item.storageLocation ?? "Nie przypisano miejsca"}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>{item.storageLocation || "—"}</Typography>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{unitLabels[item.unit]}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.active ? "Aktywna" : "Archiwalna"}
                    />
                  </TableCell>
                  <TableCell>
                    {hasPermission(access + ".update") && (
                      <RowAction
                        action="edit"
                        label="Edytuj"
                        onClick={() =>
                          action.run(async () => {
                            beginEdit(
                              await api<CatalogItem>(path + "/" + item.uuid),
                            );
                          }, "Wczytano pozycję.")
                        }
                      />
                    )}
                    {kind === "equipment" && hasPermission("equipment.view") && !!item.photos?.length && (
                      <RowAction action="photos" label="Zdjęcia sprzętu" onClick={() => setGallery(item)} />
                    )}
                    {hasPermission(
                      access + (item.active ? ".delete" : ".restore"),
                    ) && (
                      <RowAction
                        action={item.active ? "archive" : "restore"}
                        label={item.active ? "Archiwizuj" : "Przywróć"}
                        onClick={() => setArchive(item)}
                      />
                    )}
                    {kind === "equipment" && hasPermission("equipment.delete") && (
                      <RowAction action="delete" label="Usuń trwale" onClick={() => setDeleting(item)} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {remote.data && (
          <Pager page={page} total={remote.data.total} onChange={setPage} />
        )}
        <Dialog
          open={edit !== null}
          onClose={() => !action.busy && setEdit(null)}
          fullWidth
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                try {
                  let saved = await api<CatalogItem>(
                    path + (edit?.uuid ? "/" + edit.uuid : ""),
                    edit?.uuid ? "PUT" : "POST",
                    edit,
                  );
                  setEdit(saved);
                  if (kind === "equipment") {
                    for (const photoUuid of removedPhotos) {
                      saved = await api<CatalogItem>(`/equipment/${saved.uuid}/photos/${photoUuid}`, "DELETE", { version: saved.version });
                      setEdit(saved);
                      setRemovedPhotos((current) => current.filter((uuid) => uuid !== photoUuid));
                    }
                    for (const photo of photoFiles) {
                      const body = new FormData();
                      body.append("version", String(saved.version));
                      body.append("file", photo);
                      saved = await api<CatalogItem>(`/equipment/${saved.uuid}/photos`, "POST", body);
                      setEdit(saved);
                      setPhotoFiles((current) => current.filter((file) => file !== photo));
                    }
                  }
                  setEdit(null);
                } finally {
                  remote.reload();
                }
              });
            }}
          >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {edit?.uuid ? "Edycja pozycji" : "Nowa pozycja"}
            </DialogTitle>
            <DialogContent>
              <Stack gap={2} pt={1}>
                {(["code", "name", "description"] as const).map(
                  (key) => (
                    <TextField
                      key={key}
                      required={key !== "description"}
                      label={
                        {
                          code: "Kod",
                          name: "Nazwa",
                          description: "Opis",
                        }[key]
                      }
                      value={edit?.[key] ?? ""}
                      onChange={(e) =>
                        setEdit({ ...edit, [key]: e.target.value })
                      }
                      multiline={key === "description"}
                    />
                  ),
                )}
                {kind === "equipment" ? (
                  <>
                    <TextField
                      label="Nazwa slangowa"
                      helperText="Opcjonalna nazwa używana przez pracowników, np. termos, bemar. Można po niej wyszukiwać sprzęt."
                      value={edit?.slangName ?? ""}
                      onChange={(event) => setEdit({ ...edit, slangName: event.target.value })}
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                    />
                    <Lookup
                      label="Kategoria sprzętu"
                      path="/equipment-categories"
                      value={edit?.categoryUuid ? { uuid: edit.categoryUuid, name: edit.category ?? "" } : null}
                      onChange={(value) => setEdit({ ...edit, categoryUuid: value?.uuid, category: value?.name ?? "" })}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Kategoria grupuje podobny sprzęt, np. Meble lub Zastawa.
                      {" "}<Link href="/catering/equipment/categories" target="_blank" rel="noopener noreferrer">Dodaj lub edytuj kategorie w osobnym widoku</Link>.
                    </Typography>
                    <Lookup
                      label="Miejsce przechowywania"
                      path="/equipment-locations"
                      value={edit?.storageLocationUuid ? { uuid: edit.storageLocationUuid, name: edit.storageLocation ?? "" } : null}
                      onChange={(value) => setEdit({ ...edit, storageLocationUuid: value?.uuid ?? null, storageLocation: value?.name ?? null })}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Wybierz miejsce, w którym zwykle znajduje się sprzęt.
                      {" "}<Link href="/catering/equipment/locations" target="_blank" rel="noopener noreferrer">Zarządzaj biblioteką miejsc sprzętu</Link>.
                    </Typography>
                    <TextField
                      required
                      label="Ilość posiadana"
                      type="number"
                      helperText={`Łączna liczba w wybranej jednostce (${units[edit?.unit ?? "piece"]}). Nie jest pomniejszana o zapotrzebowanie wydarzeń.`}
                      value={edit?.stockQuantity ?? ""}
                      onChange={(event) => setEdit({ ...edit, stockQuantity: event.target.value === "" ? undefined : Number(event.target.value) })}
                      slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }}
                    />
                  </>
                ) : (
                  <>
                    <Lookup
                      label="Kategoria produktu"
                      path={categoryPath}
                      value={edit?.categoryUuid ? { uuid: edit.categoryUuid, name: edit.category ?? "" } : null}
                      onChange={(value) => setEdit({ ...edit, categoryUuid: value?.uuid, category: value?.name ?? "" })}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Wybierz kategorię z biblioteki, np. Napoje i dodatki lub Opakowania.
                      {" "}<Link href="/catering/supplies/categories" target="_blank" rel="noopener noreferrer">Zarządzaj kategoriami produktów</Link>.
                    </Typography>
                  </>
                )}
                <FieldSelect
                  label="Jednostka"
                  value={edit?.unit ?? "piece"}
                  options={units}
                  onChange={(unit) => setEdit({ ...edit, unit })}
                />
                {kind === "equipment" && hasPermission("equipment.update") && (
                  <EquipmentPhotoEditor
                    equipment={edit ?? {}}
                    files={photoFiles}
                    removed={removedPhotos}
                    onFilesChange={setPhotoFiles}
                    onRemove={(uuid) => setRemovedPhotos((current) => [...current, uuid])}
                    disabled={action.busy}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setEdit(null)}>
                Anuluj
              </Button>
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" type="submit" disabled={action.busy || !edit?.categoryUuid}>
                Zapisz
              </Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={gallery !== null} onClose={() => setGallery(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
            Zdjęcia sprzętu — {gallery?.name}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {gallery && <EquipmentPhotoGallery equipmentUuid={gallery.uuid} photos={gallery.photos ?? []} />}
          </DialogContent>
          <DialogActions>
            <Button variant="contained" color="primary" onClick={() => setGallery(null)}>Zamknij</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={deleting !== null} onClose={() => !action.busy && setDeleting(null)}>
          <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Trwale usunąć sprzęt?</DialogTitle>
          <DialogContent>
            {deleting?.name}. Tej operacji nie można cofnąć. Usunięcie jest możliwe,
            jeśli sprzęt nie jest przypisany do żadnego wydarzenia ani szablonu.
            Po usunięciu ostatniego sprzętu z kategorii można usunąć również kategorię.
          </DialogContent>
          <DialogActions>
            <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setDeleting(null)}>Anuluj</Button>
            <Button variant="contained"
              color="error"
              disabled={action.busy}
              onClick={() => action.run(async () => {
                if (!deleting) return;
                await api(path + "/" + deleting.uuid, "DELETE", { version: deleting.version });
                setDeleting(null);
                remote.reload();
              })}
            >
              Usuń trwale
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={archive !== null} onClose={() => setArchive(null)}>
          <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {archive?.active ? "Archiwizować pozycję?" : "Przywrócić pozycję?"}
          </DialogTitle>
          <DialogContent>
            {archive?.name}. Wcześniejsze wydarzenia zachowają zapisane dane.
          </DialogContent>
          <DialogActions>
            <Button color="primary" variant="contained" onClick={() => setArchive(null)}>Anuluj</Button>
            <Button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  if (!archive) return;
                  await api(path + "/" + archive.uuid + "/active", "PUT", {
                    version: archive.version,
                    active: !archive.active,
                  });
                  setArchive(null);
                  remote.reload();
                })
              }
            >
              Potwierdź
            </Button>
          </DialogActions>
        </Dialog>
      </Panel>
    </Permission>
  );
}
