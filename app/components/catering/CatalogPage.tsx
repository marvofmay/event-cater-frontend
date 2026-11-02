"use client";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { useState } from "react";
import Link from "next/link";
import {
  Box,
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

const secondaryCatalogButtonSx = {
  minHeight: 40,
  px: 1.5,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 500,
  whiteSpace: "nowrap",
  color: "text.secondary",
  borderColor: "divider",
  bgcolor: "action.hover",
  boxShadow: "none",
  "&:hover": { color: "text.primary", bgcolor: "action.selected", borderColor: "text.disabled", boxShadow: "none" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
};

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
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center" mb={2} sx={{ "& > .MuiButton-root": { minHeight: 40 } }}>
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
          <Button component={Link} variant="outlined" startIcon={<CategoryOutlinedIcon />} sx={secondaryCatalogButtonSx} href={kind === "equipment" ? "/catering/equipment/categories" : "/catering/supplies/categories"}>
            {kind === "equipment" ? "Kategorie sprzętu" : "Kategorie produktów"}
          </Button>
          {kind === "equipment" && (
            <Button component={Link} variant="outlined" startIcon={<PlaceOutlinedIcon />} sx={secondaryCatalogButtonSx} href="/catering/equipment/locations">Miejsca sprzętu</Button>
          )}
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} disabled={remote.loading} onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        <TableContainer sx={{ width: "100%" }}>
          <Table
            size="small"
            sx={{
              width: "100%",
              tableLayout: "fixed",
              "& .MuiTableCell-root": { py: 0.5, px: 1, verticalAlign: "middle" },
            }}
          >
            <TableHead>
              <TableRow>
                {(kind === "equipment"
                  ? [
                      ["Zdjęcie", "48px"],
                      ["Kod", "9%"],
                      ["Nazwa", "16%"],
                      ["Nazwa slangowa", "12%"],
                      ["Ilość posiadana", "8%"],
                      ["Miejsce przechowywania", "18%"],
                      ["Kategoria", "12%"],
                      ["Jednostka", "7%"],
                      ["Status", "8%"],
                      ["Działania", "120px"],
                    ]
                  : [
                      ["Kod", "12%"],
                      ["Nazwa", "28%"],
                      ["Kategoria", "22%"],
                      ["Jednostka", "12%"],
                      ["Status", "12%"],
                      ["Działania", "120px"],
                    ]
                ).map(([label, width]) => (
                  <TableCell key={label} sx={{ width, whiteSpace: "nowrap" }}>{label}</TableCell>
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
                        : "-"}
                    </TableCell>
                  )}
                  <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.code}</TableCell>
                  <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>{item.name}</TableCell>
                  {kind === "equipment" && (
                    <>
                      <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.slangName || undefined}>{item.slangName || "-"}</TableCell>
                      <TableCell>{item.stockQuantity ?? 0} {unitLabels[item.unit]}</TableCell>
                      <TableCell>
                        <Tooltip title={item.storageLocation ?? "Nie przypisano miejsca"}>
                          <Typography variant="body2" noWrap>{item.storageLocation || "-"}</Typography>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                  <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.category}>{item.category}</TableCell>
                  <TableCell>{unitLabels[item.unit]}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.active ? "Aktywna" : "Archiwalna"}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Stack direction="row" alignItems="center" flexWrap="nowrap" sx={{ gap: 0 }}>
                      {hasPermission(access + ".update") && (
                        <RowAction
                          size="small"
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
                        <RowAction size="small" action="photos" label="Zdjęcia sprzętu" onClick={() => setGallery(item)} />
                      )}
                      {hasPermission(
                        access + (item.active ? ".delete" : ".restore"),
                      ) && (
                        <RowAction
                          size="small"
                          action={item.active ? "archive" : "restore"}
                          label={item.active ? "Archiwizuj" : "Przywróć"}
                          onClick={() => setArchive(item)}
                        />
                      )}
                      {kind === "equipment" && hasPermission("equipment.delete") && (
                        <RowAction size="small" action="delete" label="Usuń trwale" onClick={() => setDeleting(item)} />
                      )}
                    </Stack>
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
          maxWidth={kind === "equipment" ? "md" : "sm"}
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
              {kind === "equipment" ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                    pt: 1,
                    alignItems: "start",
                  }}
                >
                  <Stack gap={2}>
                    <TextField
                      required
                      label="Kod"
                      value={edit?.code ?? ""}
                      onChange={(e) => setEdit({ ...edit, code: e.target.value })}
                    />
                    <TextField
                      required
                      label="Nazwa"
                      value={edit?.name ?? ""}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    />
                    <TextField
                      label="Opis"
                      value={edit?.description ?? ""}
                      onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Nazwa slangowa"
                      helperText="Np. termos, bemar - do wyszukiwania."
                      value={edit?.slangName ?? ""}
                      onChange={(event) => setEdit({ ...edit, slangName: event.target.value })}
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                    />
                    <FieldSelect
                      label="Jednostka"
                      value={edit?.unit ?? "piece"}
                      options={units}
                      onChange={(unit) => setEdit({ ...edit, unit })}
                    />
                    <TextField
                      required
                      label="Ilość posiadana"
                      type="number"
                      helperText={`Łączna liczba (${units[edit?.unit ?? "piece"]}), bez odjęcia zapotrzebowania wydarzeń.`}
                      value={edit?.stockQuantity ?? ""}
                      onChange={(event) => setEdit({ ...edit, stockQuantity: event.target.value === "" ? undefined : Number(event.target.value) })}
                      slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }}
                    />
                  </Stack>
                  <Stack gap={2}>
                    <Lookup
                      label="Kategoria sprzętu"
                      path="/equipment-categories"
                      value={edit?.categoryUuid ? { uuid: edit.categoryUuid, name: edit.category ?? "" } : null}
                      onChange={(value) => setEdit({ ...edit, categoryUuid: value?.uuid, category: value?.name ?? "" })}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Np. Meble, Zastawa.{" "}
                      <Link href="/catering/equipment/categories" target="_blank" rel="noopener noreferrer">Zarządzaj kategoriami</Link>
                    </Typography>
                    <Lookup
                      label="Miejsce przechowywania"
                      path="/equipment-locations"
                      value={edit?.storageLocationUuid ? { uuid: edit.storageLocationUuid, name: edit.storageLocation ?? "" } : null}
                      onChange={(value) => setEdit({ ...edit, storageLocationUuid: value?.uuid ?? null, storageLocation: value?.name ?? null })}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Gdzie zwykle stoi sprzęt.{" "}
                      <Link href="/catering/equipment/locations" target="_blank" rel="noopener noreferrer">Zarządzaj miejscami</Link>
                    </Typography>
                    {hasPermission("equipment.update") && (
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
                </Box>
              ) : (
                <Stack gap={2} pt={1}>
                  {(["code", "name", "description"] as const).map((key) => (
                    <TextField
                      key={key}
                      required={key !== "description"}
                      label={{ code: "Kod", name: "Nazwa", description: "Opis" }[key]}
                      value={edit?.[key] ?? ""}
                      onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                      multiline={key === "description"}
                    />
                  ))}
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
                  <FieldSelect
                    label="Jednostka"
                    value={edit?.unit ?? "piece"}
                    options={units}
                    onChange={(unit) => setEdit({ ...edit, unit })}
                  />
                </Stack>
              )}
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
            Zdjęcia sprzętu - {gallery?.name}
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
