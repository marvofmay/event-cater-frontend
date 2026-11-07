"use client";
import { useEffect, useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useRemote } from "./api";
export interface LookupItem {
  uuid: string;
  itemUuid?: string;
  name: string;
  slangName?: string | null;
  code?: string;
  unit?: string;
  kind?: string;
  version?: number;
  location?: { city: string | null; street: string | null };
  storageLocation?: string | null;
}

function optionLabel(item: LookupItem): string {
  return (
    item.name +
    (item.slangName ? " (" + item.slangName + ")" : "") +
    (item.code ? " - " + item.code : "") +
    (item.kind === "equipment" ? " - Sprzęt" : "") +
    (item.kind === "consumable" ? " - Produkt / materiał" : "") +
    (item.location?.city ? " - " + item.location.city : "")
  );
}

export function Lookup({
  label,
  path,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  path: string;
  value: LookupItem | null;
  onChange: (value: LookupItem | null) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState(value ? optionLabel(value) : "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInput(value ? optionLabel(value) : "");
  }, [value?.uuid, value?.name, value?.slangName, value?.code, value?.kind]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const remote = useRemote<{ items: LookupItem[] }>(
    open && !disabled
      ? path +
          (path.includes("?") ? "&" : "?") +
          "q=" +
          encodeURIComponent(query)
      : null,
  );

  const options = useMemo(() => {
    const remoteItems = (remote.data?.items ?? []).map((item) => ({
      ...item,
      uuid: item.itemUuid ?? item.uuid,
    }));
    if (!value) return remoteItems;
    if (remoteItems.some((item) => item.uuid === value.uuid && item.kind === value.kind)) {
      return remoteItems;
    }
    return [value, ...remoteItems];
  }, [remote.data?.items, value]);

  return (
    <Autocomplete
      size="small"
      sx={{ minWidth: 220, flex: 1 }}
      disabled={disabled}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      inputValue={input}
      options={options}
      filterOptions={(items) => items}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => a.uuid === b.uuid && a.kind === b.kind}
      onChange={(_, item) => onChange(item)}
      onInputChange={(_, text, reason) => {
        if (reason === "input" || reason === "clear") setInput(text);
        if (reason === "reset" && value) setInput(optionLabel(value));
      }}
      loading={remote.loading}
      noOptionsText={remote.error || "Brak wyników"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          error={!!remote.error}
          helperText={remote.error || undefined}
        />
      )}
    />
  );
}
