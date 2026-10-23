"use client";
import { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { MenuItem } from "./types";
export const blankDish = (): MenuItem => ({
  clientId: crypto.randomUUID(),
  name: "",
  portions: 1,
  section: "",
  portionSize: "",
  servingStyle: "",
  diets: [],
  allergens: [],
  notes: "",
});
export function MenuEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, key: keyof MenuItem, value: unknown) =>
    onChange(items.map((x, i) => (i === index ? { ...x, [key]: value } : x)));
  return (
    <Stack gap={2}>
      {items.map((item, index) => (
        <Stack
          key={item.clientId ?? index}
          gap={1}
          sx={{ p: 2, border: "1px solid #ddd", borderRadius: 1 }}
        >
          <Stack direction={{ xs: "column", md: "row" }} gap={1}>
            <TextField
              required
              label="Potrawa"
              value={item.name}
              onChange={(e) => update(index, "name", e.target.value)}
              disabled={disabled}
              fullWidth
            />
            <TextField
              required
              label="Liczba porcji"
              type="number"
              value={item.portions}
              onChange={(e) =>
                update(index, "portions", Number(e.target.value))
              }
              slotProps={{ htmlInput: { min: 1, max: 1000000, step: 1 } }}
              disabled={disabled}
            />
            <TextField
              label="Wielkość porcji"
              value={item.portionSize ?? ""}
              onChange={(e) => update(index, "portionSize", e.target.value)}
              disabled={disabled}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} gap={1}>
            <Labels
              label="Diety, oddziel przecinkami"
              values={item.diets}
              onChange={(v) => update(index, "diets", v)}
              disabled={disabled}
            />
            <Labels
              label="Zadeklarowane alergeny"
              values={item.allergens}
              onChange={(v) => update(index, "allergens", v)}
              disabled={disabled}
            />
            <TextField
              label="Sekcja menu"
              value={item.section ?? ""}
              onChange={(e) => update(index, "section", e.target.value)}
              disabled={disabled}
            />
          </Stack>
          <TextField
            label="Sposób podania"
            value={item.servingStyle ?? ""}
            onChange={(e) => update(index, "servingStyle", e.target.value)}
            disabled={disabled}
          />
          <TextField
            label="Uwagi do potrawy"
            multiline
            value={item.notes ?? ""}
            onChange={(e) => update(index, "notes", e.target.value)}
            disabled={disabled}
          />
          {!disabled && (
            <Button
              sx={{ alignSelf: "end" }}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Usuń potrawę
            </Button>
          )}
        </Stack>
      ))}
      {!items.length && <Typography>Nie dodano jeszcze potraw.</Typography>}
      {!disabled && (
        <Button
          sx={{ alignSelf: "start" }}
          onClick={() => onChange([...items, blankDish()])}
        >
          Dodaj potrawę
        </Button>
      )}
    </Stack>
  );
}
export function Labels({
  label,
  values,
  onChange,
  disabled = false,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(values.join(", "));
  return (
    <TextField
      disabled={disabled}
      label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
