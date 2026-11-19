"use client";
import { Stack, TextField } from "@mui/material";
import { Location } from "./types";
export const emptyLocation: Location = {
  venue: "",
  street: "",
  city: "",
  postalCode: "",
  instructions: "",
};
export function LocationEditor({
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  value: Location;
  onChange: (v: Location) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const field = (
    key: keyof Location,
    label: string,
    options: { required?: boolean; multiline?: boolean; flex?: number; minWidth?: number } = {},
  ) => (
    <TextField
      key={key}
      disabled={disabled}
      size="small"
      fullWidth
      label={label}
      required={options.required}
      value={value[key] ?? ""}
      multiline={options.multiline}
      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
      sx={{ flex: options.flex, minWidth: options.minWidth ?? 0 }}
    />
  );

  return (
    <Stack gap={2}>
      {field("venue", "Obiekt / sala")}
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        {field("street", "Ulica i numer", { required, flex: 1.6, minWidth: 160 })}
        {field("city", "Miejscowość", { required, flex: 1.2, minWidth: 140 })}
        {field("postalCode", "Kod pocztowy", { required, flex: 0.7, minWidth: 120 })}
      </Stack>
      {field("instructions", "Dojazd, rozładunek i dostęp do zaplecza", { multiline: true })}
    </Stack>
  );
}
