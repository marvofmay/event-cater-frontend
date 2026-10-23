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
  Typography,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
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
import { Lookup, LookupItem } from "./Lookup";
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
  const [kind, setKind] = useState("equipment");
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
      <Panel title="Szablony kompletacji">
        <Typography color="text.secondary" mb={2}>
          Gotowe listy sprzętu i materiałów do wielokrotnego użycia. Aby użyć szablonu, otwórz wydarzenie, przejdź do zakładki Kompletacja i wybierz „Zastosuj szablon do listy”.
        </Typography>
        <Typography mb={2}>
          Stałe ilości albo przeliczenie na liczbę gości z zapasem. Przykład: 1
          warnik na 50 gości, 1 zestaw kawowy na osobę + 10% zapasu.
        </Typography>
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
            <Button
              variant="contained"
              onClick={() => setEdit({ name: "", description: "", lines: [] })}
            >
              Dodaj szablon
            </Button>
          )}
          <Button onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback
          error={remote.error || action.error}
          success={action.success}
        />
        {remote.loading && <Loading />}
        {remote.data?.items.map((t) => (
          <Panel key={t.uuid} title={t.name}>
            <Typography>
              {t.description} · {t.active ? "Aktywny" : "Archiwalny"}
            </Typography>
            {hasPermission("preparation_templates.view") && (
              <Button
                onClick={() =>
                  action.run(
                    async () =>
                      setEdit(
                        await api<Template>("/preparation-templates/" + t.uuid),
                      ),
                    "Wczytano szablon.",
                  )
                }
              >
                {hasPermission("preparation_templates.update")
                  ? "Edytuj szablon"
                  : "Podgląd szablonu"}
              </Button>
            )}
            {hasPermission(
              t.active
                ? "preparation_templates.delete"
                : "preparation_templates.restore",
            ) && (
              <Button onClick={() => setArchive(t)}>
                {t.active ? "Archiwizuj" : "Przywróć"}
              </Button>
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
            <DialogTitle>Szablon kompletacji</DialogTitle>
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
                  <Stack direction="row" gap={2}>
                    <FieldSelect
                      label="Rodzaj pozycji"
                      value={kind}
                      onChange={(v) => {
                        setKind(v);
                        setItem(null);
                      }}
                      options={{ equipment: "Sprzęt", consumable: "Produkt" }}
                    />
                    <Lookup
                      key={kind}
                      label="Pozycja katalogowa"
                      path={
                        kind === "equipment"
                          ? "/equipment/options"
                          : "/consumables/options"
                      }
                      value={item}
                      onChange={setItem}
                    />
                    <Button
                      disabled={!item}
                      onClick={() => {
                        if (!item) return;
                        setEdit({
                          ...edit,
                          lines: [
                            ...(edit?.lines ?? []),
                            {
                              kind,
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
                      <Button
                        onClick={() =>
                          setEdit({
                            ...edit,
                            lines: edit.lines?.filter(
                              (_, index) => index !== i,
                            ),
                          })
                        }
                      >
                        Usuń ze szablonu
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </fieldset>
              <Feedback error={action.error} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEdit(null)}>Zamknij</Button>
              {(!edit?.uuid ||
                hasPermission("preparation_templates.update")) && (
                <Button type="submit" disabled={action.busy}>
                  Zapisz szablon
                </Button>
              )}
            </DialogActions>
          </form>
        </Dialog>
        <Dialog open={archive !== null} onClose={() => setArchive(null)}>
          <DialogTitle>
            {archive?.active ? "Archiwizować szablon?" : "Przywrócić szablon?"}
          </DialogTitle>
          <DialogContent>
            Listy wcześniejszych wydarzeń pozostaną bez zmian.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setArchive(null)}>Anuluj</Button>
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
