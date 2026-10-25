"use client";
import AddIcon from "@mui/icons-material/Add";
import { RowAction } from "../common/RowAction";
import { useState } from "react";
import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import {
  useApi,
  useAction,
  useRemote,
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
export function PreparationPanel({
  event,
  onChanged,
}: {
  event: EventDetails;
  onChanged: (version: number) => void;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const path = "/events/" + event.uuid + "/preparation";
  const remote = useRemote<Preparation>(path);
  const action = useAction();
  const changed = (data: Preparation) => {
    remote.setData(data);
    onChanged(data.version);
  };
  return (
    <Panel title="Kompletacja i załadunek cateringu">
      <Feedback error={remote.error} />
      {remote.loading && <Loading />}
      {remote.data && (
        <PreparationContent
          key={remote.data.version}
          data={remote.data}
          event={event}
          onChange={changed}
        />
      )}
    </Panel>
  );
}
function PreparationContent({
  data,
  event,
  onChange,
}: {
  data: Preparation;
  event: EventDetails;
  onChange: (d: Preparation) => void;
}) {
  const { hasPermission } = useUser();
  const can = (p: string) => hasPermission("events." + p);
  const api = useApi();
  const action = useAction();
  const path = "/events/" + event.uuid + "/preparation";
  const closed = ["cancelled", "completed"].includes(event.status);
  const plan = can("plan_event_preparation") && !closed;
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
      <Stack direction="row" gap={2} alignItems="center">
        <Status value={data.status} />
        <Typography>{data.lines.length} pozycji do zabrania</Typography>
      </Stack>
      {data.summary.hasShortages && (
        <Alert severity="warning" sx={{ my: 2 }}>
          Lista ma braki w załadunku. Ich ewentualna akceptacja nie usuwa braków
          z ewidencji.
        </Alert>
      )}
      {data.summary.hasSurplus && (
        <Alert severity="info">
          Przygotowano lub załadowano nadwyżkę względem planu.
        </Alert>
      )}
      {data.acceptedShortagesReason && (
        <Alert severity="warning">
          Wyjazd z zaakceptowanymi brakami: {data.acceptedShortagesReason}
        </Alert>
      )}
      {plan && (
        <Panel title="Odpowiedzialność i termin">
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
            <Stack gap={2}>
              <Lookup
                label="Odpowiedzialny za kompletację"
                path={path + "/staff-options"}
                value={owner}
                onChange={setOwner}
              />
              <TextField
                label={"Termin kompletacji (" + event.timezone + ")"}
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Uwagi do kompletacji"
                multiline
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" disabled={action.busy} type="submit">
                Zapisz odpowiedzialność i termin
              </Button>
            </Stack>
          </form>
        </Panel>
      )}
      {(plan || can("plan_event_equipment")) && !closed && (
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
      {plan &&
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rzecz / instrukcje</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Przygotowanie i załadunek</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.lines.map((line) => (
              <PreparationRow
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
        {plan && data.status === "draft" && (
          <Button disabled={action.busy} onClick={() => command("approve")}>
            Zatwierdź listę
          </Button>
        )}
        {can("prepare_event_catering") &&
          !closed &&
          data.status === "approved" && (
            <Button disabled={action.busy} onClick={() => command("start")}>
              Rozpocznij kompletowanie
            </Button>
          )}
        {can("prepare_event_catering") &&
          !closed &&
          ["approved", "in_preparation"].includes(data.status) && (
            <Button disabled={action.busy} onClick={() => command("ready")}>
              Potwierdź gotowość do załadunku
            </Button>
          )}
        {can("dispatch_event_catering") &&
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
      {can("accept_preparation_shortages") &&
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
  const canPlan = hasPermission("events.plan_event_preparation");
  const [prepared, setPrepared] = useState(line.preparedQuantity);
  const [loaded, setLoaded] = useState(line.loadedQuantity);
  const [reason, setReason] = useState("");
  const [source, setSource] = useState(line.sourceLocation ?? "");
  const [instructions, setInstructions] = useState(line.instructions ?? "");
  const [owner, setOwner] = useState<LookupItem | null>(
    line.responsibleUuid
      ? {
          uuid: line.responsibleUuid,
          name: line.responsibleName ?? "Zapisana osoba",
        }
      : null,
  );
  const [remove, setRemove] = useState(false);
  const path = "/events/" + list.eventUuid + "/preparation";
  const canRemove =
    line.kind === "equipment"
      ? hasPermission("events.plan_event_equipment")
      : canPlan;
  return (
    <TableRow>
      <TableCell>
        <Typography fontWeight={600}>{line.name}</Typography>
        <Typography variant="body2">
          {line.kind === "equipment" ? "Sprzęt" : "Produkt / materiał"} ·{" "}
          {line.code}
        </Typography>
        <Typography variant="body2">
          {line.sourceLocation} · {line.instructions}
        </Typography>
        {canPlan && !closed && (
          <details>
            <summary>Instrukcje i odpowiedzialność</summary>
            <Stack gap={1} mt={1}>
              <Lookup
                label="Odpowiedzialny za pozycję"
                path={path + "/staff-options"}
                value={owner}
                onChange={setOwner}
              />
              <TextField
                size="small"
                label="Skąd pobrać"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <TextField
                size="small"
                label="Instrukcje"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
              <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () =>
                    onChange(
                      await api<Preparation>(
                        path + "/lines/" + line.uuid,
                        "PUT",
                        {
                          version: list.version,
                          responsibleUuid: owner?.uuid ?? null,
                          sourceLocation: source,
                          instructions,
                        },
                      ),
                    ),
                  )
                }
              >
                Zapisz instrukcje
              </Button>
            </Stack>
          </details>
        )}
      </TableCell>
      <TableCell>
        {line.requiredQuantity} {unitLabels[line.unit]}
        <Typography variant="body2">
          Brak do przygotowania: {line.missingToPrepare}
        </Typography>
        <Typography variant="body2">
          Brak w załadunku: {line.missingToLoad}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          Przygotowano: {line.preparedQuantity} · załadowano:{" "}
          {line.loadedQuantity}
        </Typography>
        {!closed && (prepare || load) && (
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
                label="Powód korekty przy zmniejszeniu"
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
      <TableCell>
        {canRemove &&
          !closed &&
          (remove ? (
            <Stack>
              <Typography>Usunąć pozycję z planu?</Typography>
              <Button
                color="error"
                variant="contained"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    await api(
                      line.kind === "equipment"
                        ? "/events/" +
                            list.eventUuid +
                            "/equipment/" +
                            line.itemUuid
                        : path + "/consumables/" + line.itemUuid,
                      "DELETE",
                      { version: list.version },
                    );
                    onChange(await api<Preparation>(path));
                  })
                }
              >
                Potwierdź usunięcie
              </Button>
              <Button onClick={() => setRemove(false)}>Zostaw</Button>
            </Stack>
          ) : (
            <RowAction action="delete" label="Usuń z planu" onClick={() => setRemove(true)} />
          ))}
      </TableCell>
    </TableRow>
  );
}
