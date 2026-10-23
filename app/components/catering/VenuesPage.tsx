"use client";
import { useState } from "react";
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
  Typography,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useApi, useAction, useRemote } from "./api";
import { Feedback, FieldSelect, Loading, Pager, Panel, Permission } from "./ui";
import { Page, Venue } from "./types";
import { LocationEditor, emptyLocation } from "./LocationEditor";
import { ContactEditor } from "./ContactEditor";
export function VenuesPage() {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState("true");
  const [edit, setEdit] = useState<Partial<Venue> | null>(null);
  const [archive, setArchive] = useState<Venue | null>(null);
  const remote = useRemote<Page<Venue>>(
    hasPermission("venues.list")
      ? `/event-venues?q=${encodeURIComponent(q)}&active=${active}&page=${page}`
      : null,
  );
  return (
    <Permission name="venues.list">
      <Panel title="Baza miejsc obsługi">
        <Typography color="text.secondary" mb={2}>
          Zapisz miejsce raz i wczytuj je przy kolejnych wyjazdach. Każde
          wydarzenie zachowuje własny adres i kontakty.
        </Typography>
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            label="Szukaj miejsca, miasta lub ulicy"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
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
          {hasPermission("venues.create") && (
            <Button
              variant="contained"
              onClick={() =>
                setEdit({
                  name: "",
                  location: { ...emptyLocation },
                  contacts: [],
                  notes: "",
                  serviceMode: "off_site",
                })
              }
            >
              Dodaj miejsce
            </Button>
          )}
          <Button onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback
          error={remote.error || action.error}
          success={action.success}
        />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nazwa miejsca</TableCell>
                <TableCell>Adres</TableCell>
                <TableCell>Obsługa</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Działania</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remote.data?.items.map((v) => (
                <TableRow key={v.uuid}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>
                    {v.location.street}, {v.location.postalCode}{" "}
                    {v.location.city}
                  </TableCell>
                  <TableCell>
                    {v.serviceMode === "on_site" ? "W bazie firmy" : "Wyjazd"}
                  </TableCell>
                  <TableCell>{v.active ? "Aktywne" : "Archiwalne"}</TableCell>
                  <TableCell>
                    {hasPermission("venues.view") && (
                      <Button
                        onClick={() =>
                          action.run(
                            async () =>
                              setEdit(
                                await api<Venue>("/event-venues/" + v.uuid),
                              ),
                            "Wczytano miejsce.",
                          )
                        }
                      >
                        {hasPermission("venues.update") ? "Edytuj" : "Podgląd"}
                      </Button>
                    )}
                    {hasPermission(
                      v.active ? "venues.delete" : "venues.restore",
                    ) && (
                      <Button onClick={() => setArchive(v)}>
                        {v.active ? "Archiwizuj" : "Przywróć"}
                      </Button>
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
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                await api(
                  "/event-venues" + (edit?.uuid ? "/" + edit.uuid : ""),
                  edit?.uuid ? "PUT" : "POST",
                  edit,
                );
                setEdit(null);
                remote.reload();
              });
            }}
          >
            <DialogTitle>
              {edit?.uuid ? "Miejsce obsługi" : "Nowe miejsce obsługi"}
            </DialogTitle>
            <DialogContent>
              <fieldset
                disabled={
                  action.busy ||
                  (!!edit?.uuid && !hasPermission("venues.update"))
                }
                style={{ border: 0, padding: 0 }}
              >
                <Stack gap={2} pt={1}>
                  <TextField
                    required
                    label="Nazwa miejsca"
                    value={edit?.name ?? ""}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <FieldSelect
                    label="Domyślna obsługa"
                    value={edit?.serviceMode ?? "off_site"}
                    options={{ off_site: "Wyjazd", on_site: "W bazie firmy" }}
                    onChange={(serviceMode) =>
                      setEdit({ ...edit, serviceMode })
                    }
                  />
                  <LocationEditor
                    value={edit?.location ?? emptyLocation}
                    onChange={(location) => setEdit({ ...edit, location })}
                    required
                  />
                  <ContactEditor
                    value={edit?.contacts ?? []}
                    onChange={(contacts) => setEdit({ ...edit, contacts })}
                  />
                  <TextField
                    label="Uwagi organizacyjne"
                    multiline
                    value={edit?.notes ?? ""}
                    onChange={(e) =>
                      setEdit({ ...edit, notes: e.target.value })
                    }
                  />
                </Stack>
              </fieldset>
              <Feedback error={action.error} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEdit(null)}>Zamknij</Button>
              {(!edit?.uuid || hasPermission("venues.update")) && (
                <Button type="submit" disabled={action.busy}>
                  Zapisz miejsce
                </Button>
              )}
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={archive !== null} onClose={() => setArchive(null)}>
          <DialogTitle>
            {archive?.active ? "Archiwizować miejsce?" : "Przywrócić miejsce?"}
          </DialogTitle>
          <DialogContent>
            {archive?.name}. Adresy wcześniejszych wydarzeń pozostaną bez zmian.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setArchive(null)}>Anuluj</Button>
            <Button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  if (!archive) return;
                  await api(
                    "/event-venues/" + archive.uuid + "/active",
                    "PUT",
                    { version: archive.version, active: !archive.active },
                  );
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
