"use client";

import { useEffect, useRef, useState } from "react";
import { Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAction, useApi, useRemote } from "./api";

export interface CustomerOption {
  uuid: string | null;
  name: string;
  nip?: string | null;
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
  const api = useApi();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value?.name ?? "");
  const enteredName = useRef(value?.name ?? "");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState({ ...emptyCustomer });
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), 250);
    return () => clearTimeout(timer);
  }, [input]);
  const remote = useRemote<{ items: CustomerOption[] }>(open && !disabled ? `/event-customers?q=${encodeURIComponent(query)}` : null);

  return <Box sx={{ flex: 1, minWidth: 0 }}>
    <Stack direction="row" gap={.5} alignItems="flex-start">
      <Autocomplete<CustomerOption>
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
            <Typography variant="caption" color="text.secondary">{[customer.nip && `NIP: ${customer.nip}`, customer.address, customer.phone, customer.email].filter(Boolean).join(" · ")}</Typography>
          </Box>;
        }}
        renderInput={params => <TextField {...params} label="Klient / organizator" error={Boolean(remote.error)} helperText={remote.error || "Szukaj po nazwie, NIP, REGON, KRS, telefonie lub e-mailu."} />}
      />
      {!disabled && <Tooltip title="Dodaj klienta / organizatora / kontrahenta"><IconButton type="button" aria-label="Dodaj kontrahenta" color="primary" onMouseDown={event => event.preventDefault()} onClick={() => { setDraft({ ...emptyCustomer, name: enteredName.current }); setOpen(false); setDialog(true); }} sx={{ mt: .75, border: 1, borderColor: "divider", borderRadius: 1.5 }}><AddIcon /></IconButton></Tooltip>}
    </Stack>
    <Dialog open={dialog} onClose={() => { if (!action.busy) setDialog(false); }} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        action.run(async () => {
          const customer = await api<CustomerOption>("/event-customers", "POST", draft);
          onChange(customer);
          enteredName.current = customer.name;
          setInput(customer.name);
          setDialog(false);
        }, "Dodano kontrahenta.");
      }}>
        <DialogTitle>Nowy klient / organizator / kontrahent</DialogTitle>
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
          <Button type="button" disabled={action.busy} onClick={() => setDialog(false)}>Anuluj</Button>
          <Button type="submit" variant="contained" disabled={action.busy || !draft.name.trim()}>Dodaj i wybierz</Button>
        </DialogActions>
      </Box>
    </Dialog>
  </Box>;
}
