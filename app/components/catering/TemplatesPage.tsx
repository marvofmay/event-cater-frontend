"use client";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useUser } from "@/app/context/userContext";
import { RowAction } from "../common/RowAction";
import { useApi, useAction, useRemote } from "./api";
import { Template, TemplateLine, Page } from "./types";
import {
  Feedback,
  FieldSelect,
  Loading,
  Panel,
  Pager,
  Permission,
  unitLabels,
} from "./ui";
import { LookupItem } from "./Lookup";
import { PreparationLookup } from "./PreparationLookup";
export function TemplatesPage() {
  const api = useApi();
  const { hasPermission } = useUser();
  const action = useAction();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const remote = useRemote<Page<Template>>(
    hasPermission("preparation_templates.list")
      ? `/preparation-templates?page=${page}&q=${encodeURIComponent(q)}&active=${active}`
      : null,
  );
  const [edit, setEdit] = useState<Partial<Template> | null>(null);
  const [item, setItem] = useState<LookupItem | null>(null);
  const [archive, setArchive] = useState<Template | null>(null);
  const update = (index: number, patch: Partial<TemplateLine>) =>
    setEdit({
      ...edit,
      lines: edit?.lines?.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    });
  return (
    <Permission name="preparation_templates.list">
      <Panel title={
        <>
          Szablony kompletacji
          <Tooltip
            title="Gotowe listy sprzętu i materiałów do wielokrotnego użycia. Aby użyć szablonu, otwórz wydarzenie, przejdź do zakładki Kompletacja i wybierz „Zastosuj szablon do listy”. Szablon może zawierać stałe ilości albo przeliczać je na liczbę gości z zapasem, np. 1 warnik na 50 gości lub 1 zestaw kawowy na osobę + 10% zapasu."
            describeChild
            arrow
          >
            <IconButton size="small" aria-label="Informacje o szablonach kompletacji" sx={{ ml: 1 }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      }>
        <Stack direction="row" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            label="Szukaj szablonu"
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
          {hasPermission("preparation_templates.create") && (
            <Button color="success" startIcon={<AddIcon fontSize="medium" />}
              variant="contained"
              onClick={() => setEdit({ name: "", description: "", lines: [] })}
            >
              Dodaj szablon
            </Button>
          )}
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} disabled={remote.loading} onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        {remote.data?.items.map((t) => (
          <Panel key={t.uuid} title={t.name}>
            <Typography>
              {t.description} · {t.active ? "Aktywny" : "Archiwalny"}
            </Typography>
            {hasPermission("preparation_templates.view") && (
              <RowAction
                action={hasPermission("preparation_templates.update") ? "edit" : "preview"}
                label={hasPermission("preparation_templates.update") ? "Edytuj szablon" : "Podgląd szablonu"}
                onClick={() =>
                  action.run(
                    async () =>
                      setEdit(
                        await api<Template>("/preparation-templates/" + t.uuid),
                      ),
                    "Wczytano szablon.",
                  )
                }
              />
            )}
            {hasPermission(
              t.active
                ? "preparation_templates.delete"
                : "preparation_templates.restore",
            ) && (
              <RowAction
                action={t.active ? "archive" : "restore"}
                label={t.active ? "Archiwizuj" : "Przywróć"}
                onClick={() => setArchive(t)}
              />
            )}
          </Panel>
        ))}
        {remote.data && (
          <Pager page={page} total={remote.data.total} onChange={setPage} />
        )}
        <Dialog
          open={edit !== null}
          onClose={() => !action.busy && setEdit(null)}
          fullWidth
          maxWidth="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                await api(
                  "/preparation-templates" +
                    (edit?.uuid ? "/" + edit.uuid : ""),
                  edit?.uuid ? "PUT" : "POST",
                  edit,
                );
                setEdit(null);
                remote.reload();
              });
            }}
          >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Szablon kompletacji</DialogTitle>
            <DialogContent>
              <fieldset
                disabled={
                  action.busy ||
                  (!!edit?.uuid &&
                    !hasPermission("preparation_templates.update"))
                }
                style={{ border: 0, padding: 0 }}
              >
                <Stack gap={2} pt={1}>
                  <TextField
                    required
                    label="Nazwa szablonu"
                    value={edit?.name ?? ""}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <TextField
                    multiline
                    label="Opis szablonu"
                    value={edit?.description ?? ""}
                    onChange={(e) =>
                      setEdit({ ...edit, description: e.target.value })
                    }
                  />
                  <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
                    <Stack direction="row" gap={0.5} alignItems="center" sx={{ flex: 1, minWidth: 260 }}>
                      <PreparationLookup
                        label="Pozycja katalogowa"
                        value={item}
                        onChange={setItem}
                      />
                      <Tooltip
                        title="Wyszukaj rzecz po nazwie lub kodzie, np. stół cateringowy albo serwetki. Rodzaj — sprzęt lub produkt — zostanie pobrany automatycznie z katalogu. Jeśli rzeczy nie ma na liście, najpierw dodaj ją w sekcji Sprzęt albo Produkty i materiały. Następnie kliknij Dodaj do szablonu i podaj potrzebną ilość."
                        describeChild
                        arrow
                      >
                        <IconButton size="small" aria-label="Wyjaśnienie: Pozycja katalogowa">
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Button color="success" variant="contained" startIcon={<AddIcon fontSize="medium" />}
                      disabled={!item}
                      onClick={() => {
                        if (
                          !item ||
                          (item.kind !== "equipment" && item.kind !== "consumable")
                        ) return;
                        setEdit({
                          ...edit,
                          lines: [
                            ...(edit?.lines ?? []),
                            {
                              kind: item.kind,
                              itemUuid: item.uuid,
                              name: item.name,
                              unit: item.unit,
                              rule: {
                                mode: "fixed",
                                quantity: "1",
                                perGuests: null,
                                reservePercent: 0,
                              },
                            },
                          ],
                        });
                        setItem(null);
                      }}
                    >
                      Dodaj do szablonu
                    </Button>
                  </Stack>
                  {edit?.lines?.map((line, i) => (
                    <Stack
                      key={line.kind + line.itemUuid + "-" + i}
                      gap={1}
                      sx={{ p: 2, border: "1px solid #ddd" }}
                    >
                      <Typography>
                        {line.name} · {line.unit ? unitLabels[line.unit] : ""}
                      </Typography>
                      <Stack direction="row" gap={2} flexWrap="wrap">
                        <FieldSelect
                          label="Sposób wyliczenia"
                          value={line.rule.mode}
                          options={{
                            fixed: "Stała ilość",
                            per_guest: "Na liczbę gości",
                          }}
                          onChange={(mode) =>
                            update(i, {
                              rule: {
                                ...line.rule,
                                mode,
                                perGuests:
                                  mode === "per_guest"
                                    ? (line.rule.perGuests ?? 1)
                                    : null,
                                reservePercent:
                                  mode === "fixed"
                                    ? 0
                                    : line.rule.reservePercent,
                              },
                            })
                          }
                        />
                        <TextField
                          required
                          type="number"
                          label="Ilość"
                          value={line.rule.quantity}
                          onChange={(e) =>
                            update(i, {
                              rule: { ...line.rule, quantity: e.target.value },
                            })
                          }
                          slotProps={{
                            htmlInput: {
                              min:
                                line.unit === "kg" || line.unit === "l"
                                  ? 0.001
                                  : 1,
                              max: 1000000,
                              step:
                                line.unit === "kg" || line.unit === "l"
                                  ? 0.001
                                  : 1,
                            },
                          }}
                        />
                        {line.rule.mode === "per_guest" && (
                          <TextField
                            required
                            type="number"
                            label="Na ilu gości"
                            value={line.rule.perGuests ?? 1}
                            onChange={(e) =>
                              update(i, {
                                rule: {
                                  ...line.rule,
                                  perGuests: Number(e.target.value),
                                },
                              })
                            }
                            slotProps={{
                              htmlInput: { min: 1, max: 1000000, step: 1 },
                            }}
                          />
                        )}
                        <TextField
                          type="number"
                          label="Zapas (%)"
                          disabled={line.rule.mode === "fixed"}
                          value={line.rule.reservePercent}
                          onChange={(e) =>
                            update(i, {
                              rule: {
                                ...line.rule,
                                reservePercent: Number(e.target.value),
                              },
                            })
                          }
                          slotProps={{
                            htmlInput: { min: 0, max: 100, step: 1 },
                          }}
                        />
                      </Stack>
                      <TextField
                        label="Miejsce pobrania"
                        value={line.sourceLocation ?? ""}
                        onChange={(e) =>
                          update(i, { sourceLocation: e.target.value })
                        }
                      />
                      <TextField
                        label="Instrukcje"
                        value={line.instructions ?? ""}
                        onChange={(e) =>
                          update(i, { instructions: e.target.value })
                        }
                      />
                      <RowAction action="delete" label="Usuń ze szablonu"
                        onClick={() =>
                          setEdit({
                            ...edit,
                            lines: edit.lines?.filter(
                              (_, index) => index !== i,
                            ),
                          })
                        }
                      />
                    </Stack>
                  ))}
                </Stack>
              </fieldset>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" color="primary" onClick={() => setEdit(null)}>Zamknij</Button>
              {(!edit?.uuid ||
                hasPermission("preparation_templates.update")) && (
                <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" type="submit" disabled={action.busy}>
                  Zapisz szablon
                </Button>
              )}
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={archive !== null} onClose={() => setArchive(null)}>
          <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {archive?.active ? "Archiwizować szablon?" : "Przywrócić szablon?"}
          </DialogTitle>
          <DialogContent>
            Listy wcześniejszych wydarzeń pozostaną bez zmian.
          </DialogContent>
          <DialogActions>
            <Button color="primary" variant="contained" onClick={() => setArchive(null)}>Anuluj</Button>
            <Button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  if (!archive) return;
                  await api(
                    "/preparation-templates/" + archive.uuid + "/active",
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
