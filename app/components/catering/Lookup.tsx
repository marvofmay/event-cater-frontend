"use client";
import { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useRemote } from "./api";
export interface LookupItem {
  uuid: string;
  name: string;
  slangName?: string | null;
  code?: string;
  unit?: string;
  kind?: string;
  version?: number;
  location?: { city: string | null; street: string | null };
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
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
  return (
    <Autocomplete
      sx={{ minWidth: 220, flex: 1 }}
      disabled={disabled}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      options={remote.data?.items ?? []}
      filterOptions={(items) => items}
      getOptionLabel={(item) =>
        item.name +
        (item.slangName ? " (" + item.slangName + ")" : "") +
        (item.code ? " · " + item.code : "") +
        (item.location?.city ? " · " + item.location.city : "")
      }
      isOptionEqualToValue={(a, b) => a.uuid === b.uuid && a.kind === b.kind}
      onChange={(_, item) => onChange(item)}
      onInputChange={(_, text, reason) => {
        if (reason === "input") setInput(text);
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
