"use client";
import AddIcon from "@mui/icons-material/Add";
import { RowAction } from "../common/RowAction";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Tabs,
  Tab,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import {
  useApi,
  useAction,
  useRemote,
  downloadPrivate,
  eventDateTime,
  localDateTime,
} from "./api";
import { EventDetails, Preparation, PreparationLine, Template } from "./types";
import {
  Feedback,
  Loading,
  Panel,
  Status,
  unitLabels,
} from "./ui";
import { Lookup, LookupItem } from "./Lookup";
import { PreparationLookup } from "./PreparationLookup";
import { SourceLocationAutocomplete } from './SourceLocationAutocomplete';

const quantityText = (value: string) => Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 3 });
export function PreparationPanel({
  event,
  onChanged,
}: {
  event: EventDetails;
  onChanged: (version: number) => void;
}) {
  const { hasPermission } = useUser();
  const path = "/events/" + event.uuid + "/preparation";
  const remote = useRemote<Preparation>(path);
  const [mode, setMode] = useState<'plan' | 'execution'>(hasPermission('events.plan_event_preparation') || hasPermission('events.plan_event_equipment') ? 'plan' : hasPermission('events.prepare_event_catering') || hasPermission('events.load_event_catering') || hasPermission('events.dispatch_event_catering') ? 'execution' : 'plan');
  const changed = (data: Preparation) => {
    remote.setData(data);
    onChanged(data.version);
  };
  return (
    <Panel title="Lista rzeczy do zabrania">
      <Feedback error={remote.error} />
      {remote.loading && <Loading />}
      {remote.data && (
        <PreparationContent
          key={remote.data.version}
          data={remote.data}
          event={event}
          onChange={changed}
          mode={mode}
          setMode={setMode}
        />
      )}
    </Panel>
  );
}
function PreparationContent({
  data,
  event,
  onChange,
  mode,
  setMode,
}: {
  data: Preparation;
  event: EventDetails;
  onChange: (d: Preparation) => void;
  mode: 'plan' | 'execution';
  setMode: (mode: 'plan' | 'execution') => void;
}) {
  const { hasPermission, token } = useUser();
  const can = (p: string) => hasPermission("events." + p);
  const api = useApi();
  const action = useAction();
  const path = "/events/" + event.uuid + "/preparation";
  const closed = ["cancelled", "completed"].includes(event.status);
  const plan = can("plan_event_preparation") && !closed;
  const canExecute = can('prepare_event_catering') || can('load_event_catering') || can('dispatch_event_catering');
  const planning = mode === 'plan' || !canExecute;
  const [owner, setOwner] = useState<LookupItem | null>(
    data.responsibleUuid
      ? {
          uuid: data.responsibleUuid,
          name: data.responsibleName ?? "Zapisana osoba",
        }
      : null,
  );
  const [deadline, setDeadline] = useState(
    localDateTime(data.deadlineAt, event.timezone),
  );
  const [notes, setNotes] = useState(data.notes ?? "");
  const [item, setItem] = useState<LookupItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [template, setTemplate] = useState<LookupItem | null>(null);
  const [shortages, setShortages] = useState("");
  const command = (name: string, body: object = {}) =>
    action.run(async () =>
      onChange(
        await api<Preparation>(path + "/" + name, "POST", {
          version: data.version,
          ...body,
        }),
      ),
    );
  return (
    <>
      {canExecute && <Tabs value={planning ? 'plan' : 'execution'} onChange={(_, selected) => setMode(selected)} aria-label="Tryb listy rzeczy" sx={{ mb: 2 }}>
        <Tab value="plan" label="Planowanie" />
        <Tab value="execution" label="Kompletowanie" />
      </Tabs>}
      <Typography color="text.secondary" sx={{ mb: 2 }}>{planning ? 'Ustal, co i ile zabrać, skąd to pobrać oraz wyznacz jedną osobę do skompletowania całej listy. Osoba kompletująca nie musi być w obsadzie wydarzenia - to osobna rola.' : 'Zaznacz pozycje, które skompletowałeś. Na końcu potwierdź całą listę. W razie potrzeby możesz zmienić ilość albo dodać komentarz.'}</Typography>
      {!planning && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {data.responsibleName
            ? `Całą listę kompletuje: ${data.responsibleName}. Obsada wydarzenia to osobna rola.`
            : 'Nie wyznaczono jeszcze osoby kompletującej. Możesz kompletować na podstawie uprawnień.'}
        </Alert>
      )}
      {!planning && data.status === 'draft' && <Alert severity="info" sx={{ mb: 2 }}>Lista jest jeszcze planowana. Organizator musi ją zatwierdzić przed rozpoczęciem kompletowania.</Alert>}
      {planning && plan && data.status !== 'draft' && data.status !== 'loaded' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Po zatwierdzeniu nadal możesz dopisać lub zmienić pozycje. Taka zmiana cofnie listę do szkicu i będzie wymagać ponownego zatwierdzenia.
        </Alert>
      )}
      <Stack direction="row" gap={2} alignItems="center">
        <Status value={data.status} />
        <Typography>Pozycji do zabrania: {data.lines.length}</Typography>
      </Stack>
      {!planning && data.status !== 'draft' && data.summary.hasShortages && (
        <Alert severity="warning" sx={{ my: 2 }}>
          Lista ma braki w załadunku. Ich ewentualna akceptacja nie usuwa braków
          z ewidencji.
        </Alert>
      )}
      {!planning && data.summary.hasSurplus && (
        <Alert severity="info">
          Przygotowano lub załadowano nadwyżkę względem planu.
        </Alert>
      )}
      {!planning && data.acceptedShortagesReason && (
        <Alert severity="warning">
          Wyjazd z zaakceptowanymi brakami: {data.acceptedShortagesReason}
        </Alert>
      )}
      {(!planning || !plan) && <Typography sx={{ my: 2 }}>Całą listę kompletuje: <strong>{data.responsibleName || 'Nie wyznaczono jeszcze osoby'}</strong>{data.notes ? ` - ${data.notes}` : ''}</Typography>}
      {planning && plan && (
        <Panel title="Kto kompletuje całą listę i na kiedy">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () =>
                onChange(
                  await api<Preparation>(path, "PUT", {
                    version: data.version,
                    responsibleUuid: owner?.uuid ?? null,
                    deadlineAt: eventDateTime(deadline, event.timezone),
                    notes,
                  }),
                ),
              );
            }}
          >
            <Stack gap={2} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.3fr) minmax(240px, 1fr) auto' }, alignItems: 'start' }}>
              <Lookup
                label="Osoba kompletująca całą listę"
                path={path + "/staff-options"}
                value={owner}
                onChange={setOwner}
              />
              <TextField
                label={"Termin kompletacji (" + event.timezone + ")"}
                size="small"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Uwagi do kompletacji"
                size="small"
                sx={{ gridColumn: { md: '1 / -1' }, gridRow: { md: 2 } }}
                multiline
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold', gridColumn: { md: 3 }, gridRow: { md: 1 }, alignSelf: 'center' }} color="primary" variant="contained" disabled={action.busy} type="submit">
                Zapisz osobę i termin
              </Button>
            </Stack>
          </form>
        </Panel>
      )}
      {planning && (plan || can("plan_event_equipment")) && !closed && (
        <Panel title="Dodaj rzecz do listy">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                if (
                  !item ||
                  (item.kind !== "equipment" && item.kind !== "consumable")
                ) throw new Error("Wybierz pozycję z katalogu.");
                if (item.kind === "equipment") {
                  await api(
                    "/events/" + event.uuid + "/equipment/" + item.uuid,
                    "PUT",
                    { version: data.version, quantity: Number(quantity) },
                  );
                  onChange(await api<Preparation>(path));
                } else {
                  onChange(
                    await api<Preparation>(
                      path + "/consumables/" + item.uuid,
                      "PUT",
                      { version: data.version, requiredQuantity: quantity },
                    ),
                  );
                }
              });
            }}
          >
            <Stack direction="row" gap={2} flexWrap="wrap">
              <PreparationLookup
                label="Wyszukaj rzecz z katalogu"
                equipment={can("plan_event_equipment")}
                consumables={plan}
                value={item}
                onChange={setItem}
              />
              <TextField
                label={
                  "Wymagana ilość" +
                  (item?.unit ? " (" + unitLabels[item.unit] + ")" : "")
                }
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                slotProps={{
                  htmlInput: {
                    min: item?.unit === "kg" || item?.unit === "l" ? 0.001 : 1,
                    max: 1000000,
                    step: item?.unit === "kg" || item?.unit === "l" ? 0.001 : 1,
                  },
                }}
              />
              <Button color="success" variant="contained" startIcon={<AddIcon fontSize="medium" />}
                type="submit"
                disabled={
                  action.busy ||
                  !item ||
                  (item?.kind === "equipment" && !can("plan_event_equipment")) ||
                  (item?.kind === "consumable" && !plan)
                }
              >
                Dodaj / zmień ilość w planie
              </Button>
            </Stack>
          </form>
        </Panel>
      )}
      {planning && plan &&
        hasPermission("preparation_templates.view") &&
        hasPermission("preparation_templates.list") && (
          <Stack gap={1} my={2}>
            <Typography variant="body2" color="text.secondary">
              Szablon to gotowa lista sprzętu i materiałów. Zastosowanie dodaje jej pozycje do tego wydarzenia; późniejsza edycja szablonu nie zmienia tej listy.
            </Typography>
            <Stack direction="row" gap={2}>
            <Lookup
              label="Szablon kompletacji dla tego wydarzenia"
              path="/preparation-templates"
              value={template}
              onChange={setTemplate}
            />
            <Button
              disabled={action.busy || !template}
              onClick={() =>
                action.run(async () => {
                  if (!template) return;
                  const chosen = await api<Template>(
                    "/preparation-templates/" + template.uuid,
                  );
                  onChange(
                    await api<Preparation>(path + "/apply-template", "POST", {
                      version: data.version,
                      templateUuid: chosen.uuid,
                      templateVersion: chosen.version,
                    }),
                  );
                })
              }
            >
              Zastosuj szablon do listy
            </Button>
            </Stack>
          </Stack>
        )}
      <TableContainer>
        <Table size="small" sx={{ minWidth: 650, '& th': { bgcolor: 'grey.50', whiteSpace: 'nowrap' }, '& td': { py: 1.5, verticalAlign: 'middle' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Rzecz / instrukcje</TableCell>
              <TableCell>Do zabrania</TableCell>
              <TableCell>{planning ? 'Skąd pobrać' : 'Przygotowanie i załadunek'}</TableCell>
              {planning && <TableCell align="right">Akcje</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.lines.map((line) => (
              planning ? <PreparationPlanRow
                key={line.uuid}
                line={line}
                list={data}
                closed={closed}
                onChange={onChange}
              /> : <PreparationRow
                key={line.uuid}
                line={line}
                list={data}
                closed={closed}
                onChange={onChange}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" gap={1} flexWrap="wrap" my={2}>
        {data.lines.length > 0 && (
          <Button
            disabled={action.busy}
            onClick={() =>
              action.run(
                () =>
                  downloadPrivate(
                    path + "/pdf",
                    token,
                    event.number + "-kompletacja.pdf",
                  ),
                "Pobrano listę PDF.",
              )
            }
          >
            Pobierz PDF do odhaczania
          </Button>
        )}
        {planning && plan && data.status === "draft" && (
          <Button disabled={action.busy} onClick={() => command("approve")}>
            Zatwierdź listę
          </Button>
        )}
        {!planning && can("prepare_event_catering") &&
          !closed &&
          data.status === "approved" && (
            <Button disabled={action.busy} onClick={() => command("start")}>
              Rozpocznij kompletowanie
            </Button>
          )}
        {!planning && can("prepare_event_catering") &&
          !closed &&
          ["approved", "in_preparation"].includes(data.status) && (
            <Button disabled={action.busy} onClick={() => command("ready")}>
              Potwierdź: złożyłem całą listę
            </Button>
          )}
        {!planning && can("dispatch_event_catering") &&
          !closed &&
          ["ready_for_loading", "in_preparation", "approved"].includes(
            data.status,
          ) && (
            <Button
              disabled={action.busy}
              variant="contained"
              onClick={() => command("confirm-loaded")}
            >
              Potwierdź załadunek
            </Button>
          )}
      </Stack>
      {!planning && can("accept_preparation_shortages") &&
        can("dispatch_event_catering") &&
        !closed &&
        data.status !== "draft" &&
        data.status !== "loaded" && (
          <Stack direction="row" gap={1} flexWrap="wrap">
            <TextField
              label="Powód wyjazdu z brakami (min. 10 znaków)"
              value={shortages}
              onChange={(e) => setShortages(e.target.value)}
            />
            <Button
              color="warning"
              disabled={action.busy || shortages.trim().length < 10}
              onClick={() =>
                command("confirm-loaded", { acceptShortagesReason: shortages })
              }
            >
              Potwierdź wyjazd z brakami
            </Button>
          </Stack>
        )}
    </>
  );
}
function PreparationPlanRow({ line, list, closed, onChange }: { line: PreparationLine; list: Preparation; closed: boolean; onChange: (list: Preparation) => void }) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const canConfigure = hasPermission('events.plan_event_preparation') && !closed;
  const canQuantity = hasPermission(line.kind === 'equipment' ? 'events.plan_event_equipment' : 'events.plan_event_preparation') && !closed;
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [quantity, setQuantity] = useState(String(Number(line.requiredQuantity)));
  const [source, setSource] = useState(line.sourceLocation ?? '');
  const [instructions, setInstructions] = useState(line.instructions ?? '');
  const path = `/events/${list.eventUuid}/preparation`;
  return <>
    <TableRow>
      <TableCell>
        <Typography fontWeight={600}>{line.name}</Typography>
        <Typography variant="caption" color="text.secondary">{line.kind === 'equipment' ? 'Sprzęt' : 'Produkt / materiał'} - {line.code}</Typography>
        {line.instructions && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{line.instructions}</Typography>}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{quantityText(line.requiredQuantity)} {unitLabels[line.unit]}</TableCell>
      <TableCell>{line.sourceLocation || 'Nie wskazano miejsca'}</TableCell>
      <TableCell align="right">
        {(canConfigure || canQuantity) && <RowAction action="edit" label={`Edytuj pozycję: ${line.name}`} onClick={() => {
          setQuantity(String(Number(line.requiredQuantity)));
          setSource(line.sourceLocation ?? '');
          setInstructions(line.instructions ?? '');
          setEditing(true);
        }} />}
      </TableCell>
    </TableRow>
    <Dialog open={editing && !removing} onClose={() => !action.busy && setEditing(false)} fullWidth maxWidth="sm" aria-labelledby={`preparation-line-${line.uuid}`}>
      <Box component="form" onSubmit={event => {
        event.preventDefault();
        action.run(async () => {
          if (canConfigure) {
            onChange(await api<Preparation>(`${path}/lines/${line.uuid}`, 'PUT', {
              version: list.version, sourceLocation: source, instructions,
              ...(canQuantity && Number(quantity) !== Number(line.requiredQuantity) ? { requiredQuantity: quantity } : {}),
            }));
          } else if (canQuantity) {
            await api(`/events/${list.eventUuid}/equipment/${line.itemUuid}`, 'PUT', { version: list.version, quantity: Number(quantity) });
            onChange(await api<Preparation>(path));
          }
          setEditing(false);
        }, 'Zapisano pozycję w planie.');
      }}>
        <DialogTitle id={`preparation-line-${line.uuid}`} sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Edycja planu - {line.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField required type="number" label={`Ilość do zabrania (${unitLabels[line.unit]})`} value={quantity} onChange={event => setQuantity(event.target.value)} disabled={action.busy || !canQuantity} slotProps={{ htmlInput: { min: ['kg', 'l'].includes(line.unit) ? 0.001 : 1, max: 1000000, step: ['kg', 'l'].includes(line.unit) ? 0.001 : 1 } }} />
            <SourceLocationAutocomplete label="Skąd pobrać" value={source} onChange={setSource} disabled={action.busy || !canConfigure} />
            <TextField label="Instrukcje" multiline minRows={2} value={instructions} onChange={event => setInstructions(event.target.value)} disabled={action.busy || !canConfigure} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          {canQuantity && <Button color="error" variant="contained" disabled={action.busy} onClick={() => setRemoving(true)} sx={{ mr: 'auto' }}>Usuń z planu</Button>}
          <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setEditing(false)}>Anuluj</Button>
          <Button type="submit" variant="contained" disabled={action.busy} sx={{ bgcolor: '#34495e' }}>Zapisz pozycję w planie</Button>
        </DialogActions>
      </Box>
    </Dialog>
    <Dialog open={removing} onClose={() => !action.busy && setRemoving(false)} fullWidth maxWidth="xs" aria-labelledby={`remove-preparation-${line.uuid}`}>
      <DialogTitle id={`remove-preparation-${line.uuid}`} sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Usunąć pozycję z planu?</DialogTitle>
      <DialogContent>{line.name}</DialogContent>
      <DialogActions>
        <Button color="primary" variant="contained" disabled={action.busy} onClick={() => setRemoving(false)}>Anuluj</Button>
        <Button color="error" variant="contained" disabled={action.busy} onClick={() => action.run(async () => {
          await api(line.kind === 'equipment' ? `/events/${list.eventUuid}/equipment/${line.itemUuid}` : `${path}/consumables/${line.itemUuid}`, 'DELETE', { version: list.version });
          onChange(await api<Preparation>(path));
        }, 'Usunięto pozycję z planu.')}>Usuń z planu</Button>
      </DialogActions>
    </Dialog>
  </>;
}

function PreparationRow({
  line,
  list,
  closed,
  onChange,
}: {
  line: PreparationLine;
  list: Preparation;
  closed: boolean;
  onChange: (d: Preparation) => void;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const prepare = hasPermission("events.prepare_event_catering");
  const load = hasPermission("events.load_event_catering");
  const [prepared, setPrepared] = useState(String(Number(line.preparedQuantity)));
  const [loaded, setLoaded] = useState(String(Number(line.loadedQuantity)));
  const [reason, setReason] = useState("");
  const path = "/events/" + list.eventUuid + "/preparation";
  const required = Number(line.requiredQuantity);
  const checked = Number(line.preparedQuantity) >= required && required > 0;
  const togglePrepared = (next: boolean) => {
    if (!prepare || closed || list.status === "draft") return;
    action.run(async () =>
      onChange(
        await api<Preparation>(path + "/lines/" + line.uuid + "/progress", "PUT", {
          version: list.version,
          preparedQuantity: next ? String(required) : "0",
          correctionReason: next ? null : "Odznaczono pozycję na liście kompletacji",
        }),
      ),
    );
  };
  return (
    <TableRow>
      <TableCell>
        <Stack direction="row" gap={1} alignItems="flex-start">
          {!closed && list.status !== "draft" && prepare ? (
            <Checkbox
              checked={checked}
              disabled={action.busy}
              onChange={(_, value) => togglePrepared(value)}
              inputProps={{ "aria-label": `Skompletowano: ${line.name}` }}
              sx={{ mt: -0.5 }}
            />
          ) : null}
          <Box>
            <Typography fontWeight={600} sx={{ textDecoration: checked ? "line-through" : "none" }}>
              {line.name}
            </Typography>
            <Typography variant="body2">
              {line.kind === "equipment" ? "Sprzęt" : "Produkt / materiał"} ·{" "}
              {line.code}
            </Typography>
            {line.sourceLocation && <Typography variant="body2">Skąd pobrać: {line.sourceLocation}</Typography>}
            {line.instructions && <Typography variant="body2">{line.instructions}</Typography>}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        {quantityText(line.requiredQuantity)} {unitLabels[line.unit]}
        <Typography variant="body2">
          Do przygotowania pozostało: {quantityText(line.missingToPrepare)}
        </Typography>
        <Typography variant="body2">
          Brak w załadunku: {quantityText(line.missingToLoad)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          Przygotowano: {quantityText(line.preparedQuantity)} - załadowano:{" "}
          {quantityText(line.loadedQuantity)}
        </Typography>
        {!closed && list.status !== 'draft' && (prepare || load) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () =>
                onChange(
                  await api<Preparation>(
                    path + "/lines/" + line.uuid + "/progress",
                    "PUT",
                    {
                      version: list.version,
                      ...(prepare ? { preparedQuantity: prepared } : {}),
                      ...(load ? { loadedQuantity: loaded } : {}),
                      correctionReason: reason || null,
                    },
                  ),
                ),
              );
            }}
          >
            <Stack gap={1} mt={1}>
              {prepare && (
                <TextField
                  size="small"
                  label="Przygotowano"
                  type="number"
                  value={prepared}
                  onChange={(e) => setPrepared(e.target.value)}
                  required
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 1000000,
                      step: ["kg", "l"].includes(line.unit) ? 0.001 : 1,
                    },
                  }}
                />
              )}
              {load && (
                <TextField
                  size="small"
                  label="Załadowano"
                  type="number"
                  value={loaded}
                  onChange={(e) => setLoaded(e.target.value)}
                  required
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 1000000,
                      step: ["kg", "l"].includes(line.unit) ? 0.001 : 1,
                    },
                  }}
                />
              )}
              <TextField
                size="small"
                label="Komentarz / powód korekty"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" type="submit" disabled={action.busy}>
                Zapisz ilości
              </Button>
            </Stack>
          </form>
        )}
      </TableCell>
    </TableRow>
  );
}
