"use client";

import { useEffect, useRef, useState } from "react";
import { Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAction, useApi, useRemote } from "./api";

export interface CustomerOption {
  uuid: string | null;
  name: string;
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  address?: string | null;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
}

const emptyCustomer = { name: "", nip: "", regon: "", krs: "", city: "", street: "", postalCode: "", country: "Polska", phone: "", email: "" };

export function CustomerPicker({ value, onChange, disabled }: { value: CustomerOption | null; onChange: (customer: CustomerOption | null) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value?.name ?? "");
  const enteredName = useRef(value?.name ?? "");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), 250);
    return () => clearTimeout(timer);
  }, [input]);
  const remote = useRemote<{ items: CustomerOption[] }>(open && !disabled ? `/event-customers?q=${encodeURIComponent(query)}` : null);

  return <Box sx={{ flex: 1, minWidth: 0 }}>
    <Stack direction="row" gap={0.5} alignItems="center">
      <Autocomplete<CustomerOption>
        size="small"
        fullWidth disabled={disabled} open={open} openOnFocus
        onOpen={() => setOpen(true)} onClose={() => setOpen(false)}
        value={value} inputValue={input}
        onInputChange={(_, text, reason) => { setInput(text); if (reason !== "blur" && reason !== "reset") enteredName.current = text; }}
        onChange={(_, customer) => { enteredName.current = customer?.name ?? ""; onChange(customer); }}
        options={remote.data?.items ?? []} filterOptions={options => options}
        getOptionLabel={option => option.name}
        isOptionEqualToValue={(option, selected) => option.uuid === selected.uuid && option.name === selected.name}
        loading={remote.loading} loadingText="Wczytywanie kontrahentów…"
        noOptionsText="Brak wyników. Dodaj kontrahenta przyciskiem + obok pola."
        renderOption={(props, customer) => {
          const { key, ...rest } = props;
          return <Box component="li" key={key} {...rest} sx={{ display: "block !important", overflowWrap: "anywhere" }}>
            <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
            <Typography variant="caption" color="text.secondary">{[customer.nip && `NIP: ${customer.nip}`, customer.address, customer.phone, customer.email].filter(Boolean).join(" - ")}</Typography>
          </Box>;
        }}
        renderInput={params => (
          <TextField
            {...params}
            size="small"
            label="Klient / organizator"
            error={Boolean(remote.error)}
            helperText={remote.error || undefined}
            placeholder="Szukaj po nazwie, NIP, REGON, KRS…"
          />
        )}
      />
      {!disabled && (
        <Tooltip title="Dodaj klienta / organizatora / kontrahenta">
          <IconButton
            type="button"
            aria-label="Dodaj kontrahenta"
            color="primary"
            size="small"
            onMouseDown={event => event.preventDefault()}
            onClick={() => { setOpen(false); setDialog(true); }}
            sx={{
              width: 40,
              height: 40,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              flexShrink: 0,
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
    <CustomerCreateDialog open={dialog} initialName={enteredName.current} onClose={() => setDialog(false)} onCreated={customer => { onChange(customer); enteredName.current = customer.name; setInput(customer.name); }} />
  </Box>;
}

export function CustomerCreateDialog({ open, onClose, onCreated, initialName = "" }: { open: boolean; onClose: () => void; onCreated: (customer: CustomerOption) => void; initialName?: string }) {
  const api = useApi();
  const action = useAction();
  const [draft, setDraft] = useState({ ...emptyCustomer });
  useEffect(() => { if (open) setDraft({ ...emptyCustomer, name: initialName }); }, [open, initialName]);
  return (
    <Dialog open={open} onClose={() => { if (!action.busy) onClose(); }} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        action.run(async () => {
          const customer = await api<CustomerOption>("/event-customers", "POST", draft);
          onCreated(customer);
          onClose();
        }, "Dodano kontrahenta.");
      }}>
        <DialogTitle sx={{ backgroundColor: '#171717', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Nowy klient / organizator / kontrahent</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>Wymagana jest tylko nazwa. Pozostałe dane możesz pozostawić puste.</Typography>
          <Stack gap={2}>
            <TextField autoFocus required fullWidth label="Nazwa" value={draft.name} disabled={action.busy} onChange={event => setDraft({ ...draft, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
              {(["nip", "regon", "krs"] as const).map(field => <TextField key={field} label={field.toUpperCase()} value={draft[field]} disabled={action.busy} onChange={event => setDraft({ ...draft, [field]: event.target.value })} slotProps={{ htmlInput: { maxLength: field === "regon" ? 18 : 14, inputMode: "numeric" } }} />)}
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField label="Miasto" fullWidth value={draft.city} disabled={action.busy} onChange={event => setDraft({ ...draft, city: event.target.value })} slotProps={{ htmlInput: { maxLength: 200, autoComplete: "address-level2" } }} />
              <TextField label="Ulica i numer" fullWidth value={draft.street} disabled={action.busy} onChange={event => setDraft({ ...draft, street: event.target.value })} slotProps={{ htmlInput: { maxLength: 200, autoComplete: "address-line1" } }} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField label="Kod pocztowy" fullWidth value={draft.postalCode} disabled={action.busy} onChange={event => setDraft({ ...draft, postalCode: event.target.value })} slotProps={{ htmlInput: { maxLength: 20, autoComplete: "postal-code" } }} />
              <TextField label="Kraj" fullWidth value={draft.country} disabled={action.busy} onChange={event => setDraft({ ...draft, country: event.target.value })} slotProps={{ htmlInput: { maxLength: 100, autoComplete: "country-name" } }} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField label="Telefon" type="tel" fullWidth value={draft.phone} disabled={action.busy} onChange={event => setDraft({ ...draft, phone: event.target.value })} slotProps={{ htmlInput: { maxLength: 30 } }} />
              <TextField label="E-mail" type="email" fullWidth value={draft.email} disabled={action.busy} onChange={event => setDraft({ ...draft, email: event.target.value })} slotProps={{ htmlInput: { maxLength: 254 } }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button type="button" color="primary" variant="contained" disabled={action.busy} onClick={() => onClose()}>Anuluj</Button>
          <Button type="submit" variant="contained" disabled={action.busy || !draft.name.trim()}>Dodaj i wybierz</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
