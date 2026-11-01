"use client";

import { useEffect, useState } from "react";
import { Add, Refresh, VisibilityOutlined } from "@mui/icons-material";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { CustomerCreateDialog, type CustomerOption } from "./CustomerPicker";
import { useRemote } from "./api";
import { Feedback, Loading, Panel } from "./ui";

export function CustomersPage() {
  const { token } = useUser();
  return <CustomerWorkspace key={token ?? "anonymous"} />;
}

function CustomerWorkspace() {
  const { loading, isAuthenticated, hasPermission } = useUser();
  const canWrite = hasPermission("events.create") || hasPermission("events.update");
  const canBrowse = canWrite || hasPermission("events.view");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 250); return () => clearTimeout(timer); }, [search]);
  const remote = useRemote<{ items: CustomerOption[]; total: number }>(isAuthenticated && canBrowse ? `/event-customers?q=${encodeURIComponent(query)}&page=${page + 1}&limit=${limit}` : null);
  if (loading) return <Loading />;
  if (!isAuthenticated || !canBrowse) return <Alert severity="warning">Brak dostępu do biblioteki kontrahentów.</Alert>;
  return <Panel title="Kontrahenci">
    <Typography variant="body2" color="text.secondary" mb={2}>Klienci i organizatorzy zapisani w tej firmie. Z tej samej biblioteki wybierasz kontrahenta w formularzu wydarzenia.</Typography>
    <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
      <TextField size="small" label="Szukaj kontrahenta" placeholder="Nazwa, NIP, REGON, KRS, telefon lub e-mail" value={search} onChange={event => setSearch(event.target.value)} sx={{ flex: 1, minWidth: 240 }} slotProps={{ htmlInput: { maxLength: 200 } }} />
      {canWrite && <Button variant="contained" color="success" startIcon={<Add />} sx={{ minHeight: 40 }} onClick={() => setCreate(true)}>Dodaj kontrahenta</Button>}
      <Button variant="outlined" startIcon={<Refresh />} disabled={remote.loading} sx={{ minHeight: 40 }} onClick={remote.reload}>Odśwież</Button>
    </Stack>
    <Feedback error={remote.error} />
    {remote.loading && <Loading />}
    <TableContainer>
      <Table size="small" aria-label="Lista kontrahentów" sx={{ minWidth: 720, "& th": { fontWeight: 600 }, "& td, & th": { py: 1.5, verticalAlign: "middle" } }}>
        <TableHead><TableRow><TableCell>Nazwa</TableCell><TableCell>NIP</TableCell><TableCell>Adres</TableCell><TableCell>Telefon</TableCell><TableCell>E-mail</TableCell><TableCell align="center" sx={{ width: 80 }}>Akcje</TableCell></TableRow></TableHead>
        <TableBody>
          {(remote.data?.items ?? []).map(customer => <TableRow key={customer.uuid} hover>
            <TableCell><Typography variant="body2" fontWeight={600}>{customer.name}</Typography></TableCell>
            <TableCell>{customer.nip || "—"}</TableCell>
            <TableCell sx={{ maxWidth: 300, overflowWrap: "anywhere" }}>{customer.address || "—"}</TableCell>
            <TableCell>{customer.phone || "—"}</TableCell>
            <TableCell sx={{ overflowWrap: "anywhere" }}>{customer.email || "—"}</TableCell>
            <TableCell align="center"><Tooltip title="Podgląd"><IconButton size="small" aria-label={"Podgląd: " + customer.name} onClick={() => setSelected(customer)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip></TableCell>
          </TableRow>)}
          {!remote.loading && !remote.error && !remote.data?.items.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Brak kontrahentów spełniających kryteria.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination component="div" count={remote.data?.total ?? 0} page={page} rowsPerPage={limit} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setLimit(Number(event.target.value)); setPage(0); }} labelRowsPerPage="Rekordów na stronę" labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count}`} getItemAriaLabel={type => type === "next" ? "Następna strona" : "Poprzednia strona"} />
    {canWrite && <CustomerCreateDialog open={create} onClose={() => setCreate(false)} onCreated={() => { setPage(0); remote.reload(); }} />}
    <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{selected?.name}</DialogTitle>
      <DialogContent dividers>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", gap: 1.5, "& dd": { m: 0, overflowWrap: "anywhere" }, "& dt": { color: "text.secondary" } }}>
          {([['NIP', selected?.nip], ['REGON', selected?.regon], ['KRS', selected?.krs], ['Adres', selected?.address], ['Telefon', selected?.phone], ['E-mail', selected?.email]] as const).map(([label, value]) => <Box key={label} sx={{ display: "contents" }}><Typography component="dt" variant="body2">{label}</Typography><Typography component="dd" variant="body2">{value || "—"}</Typography></Box>)}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={() => setSelected(null)}>Zamknij</Button></DialogActions>
    </Dialog>
  </Panel>;
}
