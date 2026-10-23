"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Stack,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Typography,
  Divider,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import {
  useApi,
  useAction,
  downloadPrivate,
  eventDateTime,
  localDateTime,
} from "./api";
import { KitchenLine, KitchenOrder, KitchenPlan } from "./types";
import { Feedback, FieldSelect, Panel, Status } from "./ui";
import { Lookup, LookupItem } from "./Lookup";
import { Labels } from "./MenuEditor";
import { HistoryPanel } from "./HistoryPanel";
const newLine = (): KitchenLine => ({
  uuid: crypto.randomUUID(),
  name: "",
  requiredPortions: 1,
  portionSize: "",
  diets: [],
  allergens: [],
  packing: "",
  notes: "",
  responsibleUuid: null,
});
export function KitchenCard({
  order,
  onChange,
  onDirty,
}: {
  order: KitchenOrder;
  onChange: (order: KitchenOrder) => void;
  onDirty?: (value: boolean) => void;
}) {
  const api = useApi();
  const action = useAction();
  const { hasPermission, token } = useUser();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState(false);
  const [printRevision, setPrintRevision] = useState(
    String(order.revision || ""),
  );
  const path = "/kitchen-orders/" + order.uuid;
  const can = (p: string) => hasPermission("orders." + p);
  const blocked = order.productionBlocked;
  const command = (name: string, body: object = {}) =>
    action.run(async () =>
      onChange(
        await api<KitchenOrder>(path + "/" + name, "POST", {
          version: order.version,
          ...body,
        }),
      ),
    );
  return (
    <Panel title="Karta produkcyjna kuchni">
      <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
        <Status value={order.status} />
        <Typography>
          Rewizja {order.revision || "robocza"} ·{" "}
          {order.source.guestCount ?? "—"} gości · produkcja{" "}
          {order.productionDate}
        </Typography>
        <Typography>
          {order.serviceMode === "on_site"
            ? "Obsługa w bazie firmy"
            : "Catering wyjazdowy"}
        </Typography>
      </Stack>
      {order.sourceChanged && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Wydarzenie zmieniło się po przygotowaniu tej karty. Uzgodnij nowe menu
          z kuchnią. Dotychczasowe potrawy i wykonanie pozostają zapisane.
        </Alert>
      )}
      {blocked && (
        <Alert severity="warning">
          Produkcja zablokowana: karta lub wydarzenie zostały anulowane albo
          wydarzenie zakończono.
        </Alert>
      )}
      <Feedback error={action.error} success={action.success} />
      {order.pendingRevision && (
        <Panel title="Propozycja zmiany do uzgodnienia">
          <Typography mb={1}>{order.pendingRevision.reason}</Typography>
          {order.revisionDiff?.changed.map((change) => (
            <Typography key={change.uuid}>
              {change.after.name}: {change.before.requiredPortions} →{" "}
              {change.after.requiredPortions} porcji (
              {change.portionsDelta > 0 ? "+" : ""}
              {change.portionsDelta})
              {JSON.stringify(change.before.diets) !==
              JSON.stringify(change.after.diets)
                ? " · zmiana diety"
                : ""}
            </Typography>
          ))}
          {order.revisionDiff?.added.map((line, i) => (
            <Typography key={i}>
              Nowa pozycja: {line.name}, {line.requiredPortions} porcji ·{" "}
              {line.diets.join(", ")}
            </Typography>
          ))}
          {order.revisionDiff?.removed.map((line, i) => (
            <Typography key={i}>
              Usunięcie: {line.name}, {line.requiredPortions} porcji
            </Typography>
          ))}
          <Typography variant="body2" mt={1}>
            Nowy termin:{" "}
            {localDateTime(
              order.pendingRevision.plan.dueAt,
              order.source.timezone,
            ).replace("T", " ")}{" "}
            · produkcja {order.pendingRevision.plan.productionDate} ·{" "}
            {order.pendingRevision.plan.serviceMode === "on_site"
              ? "W bazie firmy"
              : "Wyjazd"}
          </Typography>
          {can("accept_kitchen_revision") && (
            <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
              <Button
                disabled={action.busy || blocked}
                variant="contained"
                onClick={() => command("revisions/accept")}
              >
                Akceptuj zmianę
              </Button>
              <TextField
                size="small"
                label="Powód odrzucenia (min. 10 znaków)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                disabled={action.busy || reason.trim().length < 10}
                onClick={() => command("revisions/reject", { reason })}
              >
                Odrzuć zmianę
              </Button>
            </Stack>
          )}
        </Panel>
      )}
      {!editing && (
        <>
          <Typography variant="body2" mb={2}>
            Gotowe na:{" "}
            {localDateTime(order.dueAt, order.source.timezone).replace(
              "T",
              " ",
            ) || "Nie ustalono"}{" "}
            ({order.source.timezone}). {order.notes}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Potrawa / wariant</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Wykonanie i przekazanie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.lines.map((line, i) => (
                  <KitchenProgressRow
                    key={line.uuid + "-" + order.version}
                    line={line}
                    index={i}
                    order={order}
                    busy={action.busy}
                    onSave={(lineUuid, body) =>
                      action.run(async () =>
                        onChange(
                          await api<KitchenOrder>(
                            path + "/lines/" + lineUuid + "/progress",
                            "PUT",
                            { version: order.version, ...body },
                          ),
                        ),
                      )
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" gap={1} flexWrap="wrap" my={2}>
            {can("plan_kitchen_production") &&
              !blocked &&
              !order.pendingRevision && (
                <Button
                  disabled={action.busy}
                  onClick={() => {
                    setEditing(true);
                    onDirty?.(true);
                  }}
                >
                  {order.status === "draft"
                    ? "Edytuj kartę kuchni"
                    : "Zaproponuj zmianę karty"}
                </Button>
              )}
            {order.status === "draft" && can("release_kitchen_production") && (
              <Button
                variant="contained"
                disabled={action.busy || blocked || order.sourceChanged}
                onClick={() => command("release")}
              >
                Wydaj kartę do kuchni
              </Button>
            )}
            {order.status === "released" && can("prepare_kitchen_meals") && (
              <Button
                disabled={
                  action.busy ||
                  blocked ||
                  order.sourceChanged ||
                  !!order.pendingRevision
                }
                onClick={() => command("start")}
              >
                Rozpocznij przygotowanie
              </Button>
            )}
            {["released", "in_production"].includes(order.status) &&
              can("prepare_kitchen_meals") && (
                <Button
                  disabled={
                    action.busy ||
                    blocked ||
                    order.sourceChanged ||
                    !!order.pendingRevision
                  }
                  onClick={() => command("ready")}
                >
                  Potwierdź gotowość potraw
                </Button>
              )}
            {order.status === "ready" && can("hand_over_kitchen_meals") && (
              <Button
                variant="contained"
                disabled={
                  action.busy ||
                  blocked ||
                  order.sourceChanged ||
                  !!order.pendingRevision
                }
                onClick={() => command("hand-over")}
              >
                {order.serviceMode === "on_site"
                  ? "Potwierdź przekazanie do obsługi"
                  : "Potwierdź przekazanie do transportu"}
              </Button>
            )}
            {can("pdf") && order.revision > 0 && (
              <>
                <TextField
                  size="small"
                  label="Rewizja wydruku"
                  type="number"
                  value={printRevision}
                  onChange={(e) => setPrintRevision(e.target.value)}
                  slotProps={{
                    htmlInput: { min: 1, max: order.revision, step: 1 },
                  }}
                  sx={{ width: 150 }}
                />
                <Button
                  disabled={action.busy}
                  onClick={() =>
                    action.run(
                      () =>
                        downloadPrivate(
                          path +
                            "/pdf?revision=" +
                            encodeURIComponent(
                              printRevision || String(order.revision),
                            ),
                          token,
                          order.number +
                            "-r" +
                            (printRevision || order.revision) +
                            ".pdf",
                        ),
                      "Pobrano kartę PDF.",
                    )
                  }
                >
                  Pobierz kartę PDF
                </Button>
              </>
            )}
            <Button onClick={() => setHistory((v) => !v)}>
              {history ? "Ukryj historię" : "Historia karty"}
            </Button>
          </Stack>
        </>
      )}
      {editing && (
        <KitchenPlanEditor
          key={order.version}
          order={order}
          onCancel={() => {
            setEditing(false);
            onDirty?.(false);
          }}
          onSave={async (plan, proposalReason) => {
            const ok = await action.run(async () => {
              const updated = await api<KitchenOrder>(
                path + (order.status === "draft" ? "" : "/revisions"),
                order.status === "draft" ? "PUT" : "POST",
                {
                  version: order.version,
                  eventVersion: order.currentSource.eventVersion,
                  ...plan,
                  ...(order.status === "draft"
                    ? {}
                    : { reason: proposalReason }),
                },
              );
              setEditing(false);
              onDirty?.(false);
              onChange(updated);
            });
            return ok;
          }}
          busy={action.busy}
        />
      )}
      {can("cancel_kitchen_order") &&
        order.status !== "cancelled" &&
        !editing && (
          <Stack direction="row" gap={1} flexWrap="wrap" mt={2}>
            <TextField
              size="small"
              label="Powód anulowania karty (min. 10 znaków)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              color="error"
              disabled={action.busy || reason.trim().length < 10}
              onClick={() => command("cancel", { reason })}
            >
              Anuluj kartę kuchni
            </Button>
          </Stack>
        )}
      {history && <HistoryPanel path={path + "/history"} />}
    </Panel>
  );
}
function KitchenProgressRow({
  line,
  index,
  order,
  onSave,
  busy,
}: {
  line: KitchenLine;
  index: number;
  order: KitchenOrder;
  onSave: (lineUuid: string, body: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const { hasPermission } = useUser();
  const prepare = hasPermission("orders.prepare_kitchen_meals");
  const hand = hasPermission("orders.hand_over_kitchen_meals");
  const [prepared, setPrepared] = useState(String(line.preparedPortions ?? 0));
  const [handed, setHanded] = useState(String(line.handedOverPortions ?? 0));
  const [reason, setReason] = useState("");
  const editable =
    !order.productionBlocked && order.status !== "draft" && (prepare || hand);
  return (
    <TableRow>
      <TableCell>
        <Typography fontWeight={600}>{line.name}</Typography>
        <Typography variant="body2">
          {line.diets.join(", ") || "Nie podano diety"} · alergeny:{" "}
          {line.allergens.join(", ") || "do weryfikacji"}
        </Typography>
        <Typography variant="body2">
          {line.portionSize} · {line.packing}
        </Typography>
        <Typography variant="body2">{line.notes}</Typography>
      </TableCell>
      <TableCell>
        {line.requiredPortions} porcji
        {line.requiredPortions === 0 && (
          <Typography variant="caption" display="block">
            Pozycja wycofana z planu; wykonanie zachowane.
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          Przygotowano: {line.preparedPortions ?? 0} · przekazano:{" "}
          {line.handedOverPortions ?? 0} · brak do przygotowania:{" "}
          {line.missingPreparedPortions ?? 0}
        </Typography>
        {editable && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSave(line.uuid!, {
                ...(prepare ? { preparedPortions: Number(prepared) } : {}),
                ...(hand ? { handedOverPortions: Number(handed) } : {}),
                correctionReason: reason || null,
              });
            }}
          >
            <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
              <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                {prepare && (
                  <TextField
                    size="small"
                    type="number"
                    label="Przygotowano"
                    value={prepared}
                    onChange={(e) => setPrepared(e.target.value)}
                    required
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 1000000,
                        step: 1,
                        "aria-label": "Przygotowano pozycję " + (index + 1),
                      },
                    }}
                    sx={{ width: 150 }}
                  />
                )}
                {hand && (
                  <TextField
                    size="small"
                    type="number"
                    label="Przekazano"
                    value={handed}
                    onChange={(e) => setHanded(e.target.value)}
                    required
                    slotProps={{ htmlInput: { min: 0, max: 1000000, step: 1 } }}
                    sx={{ width: 150 }}
                  />
                )}
                <TextField
                  size="small"
                  label="Powód korekty (przy zmniejszeniu)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button type="submit" disabled={busy}>
                  Zapisz wykonanie
                </Button>
              </Stack>
            </fieldset>
          </form>
        )}
      </TableCell>
    </TableRow>
  );
}
function KitchenPlanEditor({
  order,
  onSave,
  onCancel,
  busy,
}: {
  order: KitchenOrder;
  onSave: (p: KitchenPlan, r: string) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [plan, setPlan] = useState<KitchenPlan>({
    serviceMode: order.serviceMode,
    productionDate: order.productionDate,
    dueAt: order.dueAt,
    responsibleUuid: order.responsibleUuid,
    notes: order.notes,
    lines: order.lines.map((line) => ({ ...line })),
  });
  const [due, setDue] = useState(
    localDateTime(order.dueAt, order.source.timezone),
  );
  const [owner, setOwner] = useState<LookupItem | null>(
    order.responsibleUuid
      ? { uuid: order.responsibleUuid, name: "Zapisana osoba odpowiedzialna" }
      : null,
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const update = (index: number, patch: Partial<KitchenLine>) =>
    setPlan({
      ...plan,
      lines: plan.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          void onSave(
            {
              ...plan,
              responsibleUuid: owner?.uuid ?? null,
              dueAt: eventDateTime(due, order.source.timezone),
            },
            reason,
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Błąd daty");
        }
      }}
    >
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
        <Stack gap={2}>
          <Alert severity="info">
            Aktualne menu wydarzenia:{" "}
            {order.currentSource.menu
              .map(
                (d) =>
                  `${d.name} (${d.portions}, ${d.diets.join(", ") || "bez oznaczenia diety"})`,
              )
              .join("; ") || "Brak potraw"}
            . Zmieniaj ilość istniejącej pozycji świadomie. Wykonanych porcji
            nie można przypisać nowej potrawie.
          </Alert>
          <Button
            onClick={() => {
              const retained = order.lines
                .filter(
                  (l) =>
                    (l.preparedPortions ?? 0) > 0 ||
                    (l.handedOverPortions ?? 0) > 0,
                )
                .map((l) => ({ ...l, requiredPortions: 0 }));
              setPlan({
                ...plan,
                lines: [
                  ...retained,
                  ...order.currentSource.menu.map((d) => ({
                    uuid: crypto.randomUUID(),
                    name: d.name,
                    requiredPortions: d.portions,
                    portionSize: d.portionSize ?? null,
                    diets: d.diets,
                    allergens: d.allergens,
                    packing: d.servingStyle ?? null,
                    notes: d.notes ?? null,
                    responsibleUuid: null,
                  })),
                ],
              });
            }}
          >
            Wczytaj aktualne menu jako nowe pozycje; zachowaj wykonane
          </Button>
          <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <TextField
              required
              type="date"
              label="Dzień produkcji"
              value={plan.productionDate}
              onChange={(e) =>
                setPlan({ ...plan, productionDate: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="datetime-local"
              label="Gotowe na"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FieldSelect
              label="Obsługa"
              value={plan.serviceMode}
              onChange={(serviceMode) => setPlan({ ...plan, serviceMode })}
              options={{ off_site: "Wyjazd", on_site: "W bazie firmy" }}
            />
            <Lookup
              label="Odpowiedzialny za kuchnię"
              path="/kitchen-orders/staff-options"
              value={owner}
              onChange={setOwner}
            />
          </Stack>
          <TextField
            label="Uwagi do karty"
            multiline
            value={plan.notes ?? ""}
            onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
          />
          {plan.lines.map((line, i) => (
            <Stack
              key={line.uuid ?? "new-" + i}
              gap={1}
              sx={{ border: "1px solid #ddd", p: 2 }}
            >
              <Stack direction={{ xs: "column", md: "row" }} gap={1}>
                <TextField
                  label="Potrawa"
                  required
                  value={line.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Planowane porcje"
                  type="number"
                  required
                  value={line.requiredPortions}
                  onChange={(e) =>
                    update(i, { requiredPortions: Number(e.target.value) })
                  }
                  slotProps={{ htmlInput: { min: 0, max: 1000000, step: 1 } }}
                />
                <TextField
                  label="Wielkość porcji"
                  value={line.portionSize ?? ""}
                  onChange={(e) => update(i, { portionSize: e.target.value })}
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} gap={1}>
                <Labels
                  label="Diety"
                  values={line.diets}
                  onChange={(diets) => update(i, { diets })}
                />
                <Labels
                  label="Zadeklarowane alergeny"
                  values={line.allergens}
                  onChange={(allergens) => update(i, { allergens })}
                />
                <Lookup
                  label="Odpowiedzialny za potrawę (opcjonalnie)"
                  path="/kitchen-orders/staff-options"
                  value={
                    line.responsibleUuid
                      ? {
                          uuid: line.responsibleUuid,
                          name: line.responsibleName ?? "Zapisana osoba",
                        }
                      : null
                  }
                  onChange={(v) =>
                    update(i, {
                      responsibleUuid: v?.uuid ?? null,
                      responsibleName: v?.name ?? null,
                    })
                  }
                />
              </Stack>
              <TextField
                label="Podanie / transport (bufet, półmiski, GN)"
                value={line.packing ?? ""}
                onChange={(e) => update(i, { packing: e.target.value })}
              />
              <TextField
                label="Uwagi do potrawy"
                multiline
                value={line.notes ?? ""}
                onChange={(e) => update(i, { notes: e.target.value })}
              />
              <Button
                onClick={() =>
                  setPlan({
                    ...plan,
                    lines: plan.lines.filter((_, index) => index !== i),
                  })
                }
                disabled={
                  (line.preparedPortions ?? 0) > 0 ||
                  (line.handedOverPortions ?? 0) > 0
                }
              >
                Usuń pozycję
              </Button>
            </Stack>
          ))}
          <Button
            onClick={() =>
              setPlan({ ...plan, lines: [...plan.lines, newLine()] })
            }
          >
            Dodaj pozycję kuchenną
          </Button>
          {order.status !== "draft" && (
            <TextField
              required
              label="Powód zmiany (min. 10 znaków)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              slotProps={{ htmlInput: { minLength: 10, maxLength: 2000 } }}
            />
          )}
          <Feedback error={error} />
          <Stack direction="row" gap={1}>
            <Button type="submit" variant="contained">
              {order.status === "draft"
                ? "Zapisz kartę roboczą"
                : "Przekaż propozycję do akceptacji kuchni"}
            </Button>
            <Button onClick={onCancel}>Anuluj edycję</Button>
          </Stack>
        </Stack>
      </fieldset>
    </form>
  );
}
