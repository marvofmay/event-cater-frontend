"use client";
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
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useAction, useApi, useRemote } from "./api";
import { EquipmentCategory, Page } from "./types";
import { Feedback, Loading, Pager, Panel, Permission } from "./ui";

export function EquipmentCategoriesPage() {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Partial<EquipmentCategory> | null>(null);
  const [remove, setRemove] = useState<EquipmentCategory | null>(null);
  const remote = useRemote<Page<EquipmentCategory>>(
    hasPermission("equipment.list")
      ? `/equipment-categories?q=${encodeURIComponent(search)}&page=${page}`
      : null,
  );

  return (
    <Permission name="equipment.list">
      <Panel title="Kategorie sprzętu">
        <Typography color="text.secondary" mb={2}>
          Grupy sprzętu, np. Meble, Zastawa lub Urządzenia grzewcze. Kategorię wybierasz przy dodawaniu sprzętu.
          Usunąć można tylko kategorię bez przypisanych pozycji, także archiwalnych.
        </Typography>
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <Button component={Link} href="/catering/equipment">Wróć do sprzętu</Button>
          <TextField
            size="small"
            label="Szukaj kategorii"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {hasPermission("equipment.create") && (
            <Button variant="contained" onClick={() => setEdit({ name: "" })}>Dodaj kategorię</Button>
          )}
          <Button onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error || action.error} success={action.success} />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table>
            <TableHead><TableRow><TableCell>Nazwa kategorii</TableCell><TableCell>Działania</TableCell></TableRow></TableHead>
            <TableBody>
              {remote.data?.items.map((category) => (
                <TableRow key={category.uuid}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    {hasPermission("equipment.update") && <Button onClick={() => setEdit(category)}>Edytuj</Button>}
                    {hasPermission("equipment.delete") && <Button color="error" onClick={() => setRemove(category)}>Usuń</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {remote.data?.total === 0 && <TableRow><TableCell colSpan={2}>Brak kategorii. Dodaj pierwszą kategorię sprzętu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        {remote.data && <Pager page={page} total={remote.data.total} onChange={setPage} />}
        <Dialog open={edit !== null} onClose={() => !action.busy && setEdit(null)} fullWidth maxWidth="sm">
          <form onSubmit={(event) => {
            event.preventDefault();
            action.run(async () => {
              await api("/equipment-categories" + (edit?.uuid ? "/" + edit.uuid : ""), edit?.uuid ? "PUT" : "POST", edit);
              setEdit(null);
              remote.reload();
            });
          }}>
            <DialogTitle>{edit?.uuid ? "Edytuj kategorię sprzętu" : "Dodaj kategorię sprzętu"}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus required fullWidth label="Nazwa kategorii" sx={{ mt: 1 }}
                value={edit?.name ?? ""}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <Feedback error={action.error} />
            </DialogContent>
            <DialogActions>
              <Button disabled={action.busy} onClick={() => setEdit(null)}>Anuluj</Button>
              <Button disabled={action.busy} type="submit">Zapisz kategorię</Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={remove !== null} onClose={() => !action.busy && setRemove(null)}>
          <DialogTitle>Usunąć kategorię sprzętu?</DialogTitle>
          <DialogContent>
            {remove?.name}. Operacja jest możliwa tylko, jeśli żaden sprzęt nie korzysta z tej kategorii.
            <Feedback error={action.error} />
          </DialogContent>
          <DialogActions>
            <Button disabled={action.busy} onClick={() => setRemove(null)}>Anuluj</Button>
            <Button color="error" disabled={action.busy} onClick={() => action.run(async () => {
              if (!remove) return;
              await api("/equipment-categories/" + remove.uuid, "DELETE", { version: remove.version });
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
