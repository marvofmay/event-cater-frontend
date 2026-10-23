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
  return (
    <Stack gap={2}>
      {(["venue", "street", "city", "postalCode", "instructions"] as const).map(
        (key) => (
          <TextField
            key={key}
            disabled={disabled}
            size="small"
            label={
              {
                venue: "Obiekt / sala",
                street: "Ulica i numer",
                city: "Miejscowość",
                postalCode: "Kod pocztowy",
                instructions: "Dojazd, rozładunek i dostęp do zaplecza",
              }[key]
            }
            required={
              required && ["street", "city", "postalCode"].includes(key)
            }
            value={value[key] ?? ""}
            multiline={key === "instructions"}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        ),
      )}
    </Stack>
  );
}
