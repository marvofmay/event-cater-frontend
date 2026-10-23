"use client";
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
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
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
export function CatalogPage({ kind }: { kind: "equipment" | "supplies" }) {
  const api = useApi();
  const { hasPermission } = useUser();
  const access = kind === "equipment" ? "equipment" : "consumables";
  const path = kind === "equipment" ? "/equipment" : "/consumables";
  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<LookupItem | null>(null);
  const [edit, setEdit] = useState<Partial<CatalogItem> | null>(null);
  const [archive, setArchive] = useState<CatalogItem | null>(null);
  const remote = useRemote<Page<CatalogItem>>(
    hasPermission(access + ".list")
      ? `${path}?q=${encodeURIComponent(q)}&active=${active}&page=${page}${kind === "equipment" && category ? "&categoryUuid=" + category.uuid : ""}`
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
          kind === "equipment"
            ? "Katalog sprzętu"
            : "Produkty i materiały zużywalne"
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
          {kind === "equipment" && (
            <Lookup
              label="Filtruj kategorię sprzętu"
              path="/equipment-categories"
              value={category}
              onChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            />
          )}
          <FieldSelect
            label="Widoczność"
            value={active}
            options={{ true: "Aktywne", false: "Archiwalne", all: "Wszystkie" }}
            onChange={(v) => {
              setActive(v);
              setPage(1);
            }}
          />
          {hasPermission(access + ".create") && (
            <Button
              variant="contained"
              onClick={() =>
                setEdit({
                  name: "",
                  code: "",
                  category: "",
                  unit: "piece",
                  description: "",
                  ...(kind === "equipment" ? { slangName: "", stockQuantity: 0 } : {}),
                })
              }
            >
              Dodaj pozycję
            </Button>
          )}
          {kind === "equipment" && (
            <Button component={Link} href="/catering/equipment/categories">
              Kategorie sprzętu
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
                {[
                  "Kod",
                  "Nazwa",
                  ...(kind === "equipment" ? ["Nazwa slangowa", "Ilość posiadana"] : []),
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
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  {kind === "equipment" && (
                    <>
                      <TableCell>{item.slangName || "—"}</TableCell>
                      <TableCell>{item.stockQuantity ?? 0} {unitLabels[item.unit]}</TableCell>
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
                      <Button
                        onClick={() =>
                          action.run(async () => {
                            setEdit(
                              await api<CatalogItem>(path + "/" + item.uuid),
                            );
                          }, "Wczytano pozycję.")
                        }
                      >
                        Edytuj
                      </Button>
                    )}
                    {hasPermission(
                      access + (item.active ? ".delete" : ".restore"),
                    ) && (
                      <Button onClick={() => setArchive(item)}>
                        {item.active ? "Archiwizuj" : "Przywróć"}
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
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                await api(
                  path + (edit?.uuid ? "/" + edit.uuid : ""),
                  edit?.uuid ? "PUT" : "POST",
                  edit,
                );
                setEdit(null);
                remote.reload();
              });
            }}
          >
            <DialogTitle>
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
                  <TextField
                    required
                    label="Kategoria"
                    value={edit?.category ?? ""}
                    onChange={(event) => setEdit({ ...edit, category: event.target.value })}
                  />
                )}
                <FieldSelect
                  label="Jednostka"
                  value={edit?.unit ?? "piece"}
                  options={units}
                  onChange={(unit) => setEdit({ ...edit, unit })}
                />
                <Feedback error={action.error} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button disabled={action.busy} onClick={() => setEdit(null)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={action.busy || (kind === "equipment" && !edit?.categoryUuid)}>
                Zapisz
              </Button>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={archive !== null} onClose={() => setArchive(null)}>
          <DialogTitle>
            {archive?.active ? "Archiwizować pozycję?" : "Przywrócić pozycję?"}
          </DialogTitle>
          <DialogContent>
            {archive?.name}. Wcześniejsze wydarzenia zachowają zapisane dane.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setArchive(null)}>Anuluj</Button>
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
