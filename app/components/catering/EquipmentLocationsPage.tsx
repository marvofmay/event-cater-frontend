"use client";
import { useState } from "react";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { RowAction } from "../common/RowAction";
import { useAction, useApi, useRemote } from "./api";
import { EquipmentLocation, Page } from "./types";
import { Feedback, Loading, Pager, Panel, Permission } from "./ui";

export function EquipmentLocationsPage() {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Partial<EquipmentLocation> | null>(null);
  const [remove, setRemove] = useState<EquipmentLocation | null>(null);
  const remote = useRemote<Page<EquipmentLocation>>(
    hasPermission("equipment.list") ? `/equipment-locations?q=${encodeURIComponent(search)}&page=${page}` : null,
  );
  return (
    <Permission name="equipment.list">
      <Panel title={
        <>
          Miejsca przechowywania sprzętu
          <Tooltip title="Biblioteka miejsc, w których znajduje się sprzęt, np. za barem lub na zmywaku. Wybierz miejsce przy dodawaniu lub edycji sprzętu. Zmiana nazwy jest widoczna w całym katalogu. Usunięcie miejsca usuwa jego przypisania, ale zachowuje sprzęt." describeChild arrow>
            <IconButton size="small" aria-label="Informacje o miejscach sprzętu" sx={{ ml: 1 }}><InfoOutlinedIcon fontSize="small" /></IconButton>
          </Tooltip>
        </>
      }>
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <Button component={Link} href="/catering/equipment">Wróć do sprzętu</Button>
          <TextField size="small" label="Szukaj miejsca sprzętu" value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }} />
          {hasPermission("equipment.create") && <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => setEdit({ name: "" })}>Dodaj miejsce sprzętu</Button>}
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} disabled={remote.loading} onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Miejsce przechowywania</TableCell><TableCell>Działania</TableCell></TableRow></TableHead>
            <TableBody>
              {remote.data?.items.map((location) => (
                <TableRow key={location.uuid}>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>
                    {hasPermission("equipment.update") && <RowAction action="edit" label="Edytuj" onClick={() => setEdit(location)} />}
                    {hasPermission("equipment.delete") && hasPermission("equipment.update") && <RowAction action="delete" label="Usuń" onClick={() => setRemove(location)} />}
                  </TableCell>
                </TableRow>
              ))}
              {remote.data?.total === 0 && <TableRow><TableCell colSpan={2}>Brak miejsc przechowywania sprzętu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        {remote.data && <Pager page={page} total={remote.data.total} onChange={setPage} />}
        <Dialog open={edit !== null} onClose={() => !action.busy && setEdit(null)} fullWidth maxWidth="sm">
          <form onSubmit={(event) => {
            event.preventDefault();
            action.run(async () => {
              await api("/equipment-locations" + (edit?.uuid ? "/" + edit.uuid : ""), edit?.uuid ? "PUT" : "POST", edit);
              setEdit(null);
              remote.reload();
            });
          }}>
            <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>{edit?.uuid ? "Edytuj miejsce sprzętu" : "Dodaj miejsce sprzętu"}</DialogTitle>
            <DialogContent>
              <TextField autoFocus required fullWidth label="Nazwa miejsca sprzętu" value={edit?.name ?? ""} onChange={(event) => setEdit({ ...edit, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} sx={{ mt: 1 }} />
            </DialogContent>
            <DialogActions>
              <Button variant="contained" color="primary" disabled={action.busy} onClick={() => setEdit(null)}>Anuluj</Button>
              <Button type="submit" variant="contained" color="primary" disabled={action.busy} sx={{ backgroundColor: "#34495e", color: "white", fontWeight: "bold" }}>Zapisz miejsce sprzętu</Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={remove !== null} onClose={() => !action.busy && setRemove(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ backgroundColor: "#34495e", color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>Usunąć miejsce przechowywania?</DialogTitle>
          <DialogContent>
            {remove?.name}. Sprzęt przypisany do tego miejsca, także archiwalny, pozostanie w katalogu bez wskazanego miejsca przechowywania.
          </DialogContent>
          <DialogActions>
            <Button variant="contained" color="primary" disabled={action.busy} onClick={() => setRemove(null)}>Anuluj</Button>
            <Button variant="contained" color="error" disabled={action.busy} onClick={() => action.run(async () => {
              if (!remove) return;
              await api("/equipment-locations/" + remove.uuid, "DELETE", { version: remove.version });
              setRemove(null);
              if (remote.data?.items.length === 1 && page > 1) setPage(page - 1);
              else remote.reload();
            }, "Usunięto miejsce przechowywania.")}>Usuń miejsce sprzętu</Button>
          </DialogActions>
        </Dialog>
      </Panel>
    </Permission>
  );
}
