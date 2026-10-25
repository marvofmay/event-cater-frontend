"use client";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { RowAction } from "../common/RowAction";
import { useAction, useApi, useRemote } from "./api";
import { CatalogItem, EquipmentCategory, Page } from "./types";
import { Feedback, Loading, Pager, Panel, Permission } from "./ui";
import { Lookup, LookupItem } from "./Lookup";

export function EquipmentCategoriesPage({ kind = "equipment" }: { kind?: "equipment" | "supplies" }) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const equipment = kind === "equipment";
  const access = equipment ? "equipment" : "consumables";
  const path = equipment ? "/equipment-categories" : "/consumable-categories";
  const itemPath = equipment ? "/equipment" : "/consumables";
  const catalogPath = equipment ? "/catering/equipment" : "/catering/supplies";
  const subject = equipment ? "sprzętu" : "produktów";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Partial<EquipmentCategory> | null>(null);
  const [remove, setRemove] = useState<EquipmentCategory | null>(null);
  const [replacement, setReplacement] = useState<LookupItem | null>(null);
  const remote = useRemote<Page<EquipmentCategory>>(
    hasPermission(access + ".list")
      ? `${path}?q=${encodeURIComponent(search)}&page=${page}`
      : null,
  );
  const assignedEquipment = useRemote<Page<CatalogItem>>(
    remove ? `${itemPath}?categoryUuid=${remove.uuid}&active=all&limit=5` : null,
  );

  return (
    <Permission name={access + ".list"}>
      <Panel title={
        <>
          Kategorie {subject}
          <Tooltip
            title={(equipment
              ? "Grupy sprzętu, np. Meble, Zastawa lub Urządzenia grzewcze. Kategorię wybierasz przy dodawaniu sprzętu."
              : "Grupy produktów i materiałów, np. Napoje i dodatki, Opakowania lub Higiena i sprzątanie. Kategorię wybierasz przy dodawaniu produktu.")
              + " Przy usuwaniu kategorii możesz przenieść przypisane pozycje do innej kategorii."}
            describeChild
            arrow
          >
            <IconButton size="small" aria-label={"Informacje o kategoriach " + subject} sx={{ ml: 1 }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      }>
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <Button component={Link} href={catalogPath}>Wróć do {subject}</Button>
          <TextField
            size="small"
            label="Szukaj kategorii"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {hasPermission(access + ".create") && (
            <Button color="success" startIcon={<AddIcon fontSize="medium" />} variant="contained" onClick={() => setEdit({ name: "" })}>Dodaj kategorię</Button>
          )}
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} disabled={remote.loading} onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Nazwa kategorii</TableCell><TableCell>Działania</TableCell></TableRow></TableHead>
            <TableBody>
              {remote.data?.items.map((category) => (
                <TableRow key={category.uuid}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    {hasPermission(access + ".update") && <RowAction action="edit" label="Edytuj" onClick={() => setEdit(category)} />}
                    {hasPermission(access + ".delete") && <RowAction action="delete" label="Usuń" onClick={() => {
                      setReplacement(null);
                      setRemove(category);
                    }} />}
                  </TableCell>
                </TableRow>
              ))}
              {remote.data?.total === 0 && <TableRow><TableCell colSpan={2}>Brak kategorii. Dodaj pierwszą kategorię {subject}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        {remote.data && <Pager page={page} total={remote.data.total} onChange={setPage} />}
        <Dialog open={edit !== null} onClose={() => !action.busy && setEdit(null)} fullWidth maxWidth="sm">
          <form onSubmit={(event) => {
            event.preventDefault();
            action.run(async () => {
              await api(path + (edit?.uuid ? "/" + edit.uuid : ""), edit?.uuid ? "PUT" : "POST", edit);
              setEdit(null);
              remote.reload();
            });
          }}>
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{edit?.uuid ? "Edytuj kategorię " + subject : "Dodaj kategorię " + subject}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus required fullWidth label="Nazwa kategorii" sx={{ mt: 1 }}
                value={edit?.name ?? ""}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </DialogContent>
            <DialogActions>
              <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setEdit(null)}>Anuluj</Button>
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" disabled={action.busy} type="submit">Zapisz kategorię</Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={remove !== null} onClose={() => !action.busy && setRemove(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Usunąć kategorię {subject}?</DialogTitle>
          <DialogContent>
            <Typography mb={2}>
              {remove?.name}. Jeśli do kategorii należą pozycje katalogowe, wybierz kategorię docelową.
              Wszystkie przypisane pozycje, również archiwalne, zostaną przeniesione,
              a ta kategoria zostanie usunięta. Pozycje katalogowe i dane wydarzeń pozostaną zachowane.
            </Typography>
            {assignedEquipment.loading && <Loading />}
            <Feedback error={assignedEquipment.error} />
            {assignedEquipment.data && assignedEquipment.data.total > 0 && (
              <Stack gap={1} mb={2}>
                <Typography>Pozycje przypisane do tej kategorii: {assignedEquipment.data.total}.</Typography>
                {assignedEquipment.data.items.map((item) => (
                  <Typography key={item.uuid}>
                    {item.name} ({item.code}) — {item.active ? "aktywny" : "archiwalny"}
                  </Typography>
                ))}
                <Button component={Link} href={catalogPath}>
                  Pokaż katalog {subject}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Archiwizacja ukrywa pozycję w podpowiedziach, ale zachowuje jej kategorię.
                  {equipment && " Nieużywany sprzęt możesz usunąć przyciskiem „Usuń trwale”."}
                </Typography>
              </Stack>
            )}
            {hasPermission(access + ".update") ? (
              <Lookup
                label={equipment ? "Przenieś sprzęt do kategorii" : "Przenieś produkty do kategorii"}
                path={path}
                value={replacement}
                onChange={setReplacement}
                disabled={action.busy}
              />
            ) : (
              <Typography>Przeniesienie pozycji wymaga uprawnienia do edycji {subject}.</Typography>
            )}
            {replacement?.uuid === remove?.uuid && (
              <Typography color="error">Wybierz inną kategorię docelową.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setRemove(null)}>Anuluj</Button>
            <Button variant="contained" color="error" disabled={action.busy || (!!replacement && replacement.uuid === remove?.uuid)} onClick={() => action.run(async () => {
              if (!remove) return;
              await api(path + "/" + remove.uuid, "DELETE", {
                version: remove.version,
                replacementCategoryUuid: replacement?.uuid ?? null,
              });
              setRemove(null);
              if (remote.data?.items.length === 1 && page > 1) setPage(page - 1);
              else remote.reload();
            }, "Usunięto kategorię.")}>Usuń kategorię</Button>
          </DialogActions>
        </Dialog>
      </Panel>
    </Permission>
  );
}
