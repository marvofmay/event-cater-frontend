"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useRemote, today } from "./api";
import { KitchenOrder, Page } from "./types";
import {
  Feedback,
  FieldSelect,
  Loading,
  Pager,
  Panel,
  Permission,
  stateLabels,
} from "./ui";
import { KitchenCard } from "./KitchenCard";
export function KitchenBoard() {
  const { hasPermission } = useUser();
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const remote = useRemote<Page<KitchenOrder>>(
    hasPermission("orders.list") && hasPermission("orders.view")
      ? `/kitchen-orders?date=${date}&page=${page}${status ? "&status=" + status : ""}`
      : null,
  );
  return (
    <Permission name="orders.list">
      <Permission name="orders.view">
        <Panel title="Dzienny plan kuchni">
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField
              label="Dzień produkcji"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FieldSelect
              label="Etap produkcji"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={{
                "": "Wszystkie",
                ...Object.fromEntries(
                  [
                    "draft",
                    "released",
                    "in_production",
                    "ready",
                    "handed_over",
                    "cancelled",
                  ].map((s) => [s, stateLabels[s]]),
                ),
              }}
            />
            <Button onClick={remote.reload}>Odśwież plan</Button>
          </Stack>
          <Typography color="text.secondary" mt={2}>
            Osobne karty dla każdego wydarzenia. Dzień produkcji może poprzedzać
            dzień przyjęcia.
          </Typography>
          <Feedback error={remote.error} />
          {remote.loading && <Loading />}
          {remote.data?.total === 0 && (
            <Typography sx={{ my: 3 }}>
              Brak kart na wybrany dzień. Kartę tworzy się w zakładce Kuchnia
              danego wydarzenia.
            </Typography>
          )}
        </Panel>
        {remote.data?.items.map((order) => (
          <section key={order.uuid}>
            <Typography variant="h5">
              {order.source.title} · wydarzenie {order.source.date}
            </Typography>
            {hasPermission("events.view") && (
              <Button
                component={Link}
                href={"/catering/events/" + order.eventUuid}
              >
                Otwórz wydarzenie
              </Button>
            )}
            <KitchenCard
              key={order.uuid + "-" + order.version}
              order={order}
              onChange={(updated) =>
                remote.setData((previous) =>
                  previous
                    ? {
                        ...previous,
                        items: previous.items.map((x) =>
                          x.uuid === updated.uuid ? updated : x,
                        ),
                      }
                    : previous,
                )
              }
            />
          </section>
        ))}
        {remote.data && (
          <Pager page={page} total={remote.data.total} onChange={setPage} />
        )}
      </Permission>
    </Permission>
  );
}
