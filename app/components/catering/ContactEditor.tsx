"use client";
import AddIcon from "@mui/icons-material/Add";
import type { ReactNode } from 'react';
import { RowAction } from "../common/RowAction";
import { Box, Button, Stack, TextField } from "@mui/material";
import { Contact } from "./types";
export function ContactEditor({
  value,
  onChange,
  disabled = false,
  actions,
}: {
  value: Contact[];
  onChange: (value: Contact[]) => void;
  disabled?: boolean;
  actions?: ReactNode;
}) {
  return (
    <Stack gap={2}>
      {value.map((contact, index) => (
        <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: disabled ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 40px', sm: disabled ? 'repeat(2, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr)) 40px', md: disabled ? 'repeat(4, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr)) 40px' }, alignItems: 'center', gap: 2, border: 1, borderColor: 'divider', borderRadius: 2, p: 2, pt: 2.5 }}>
          {(["name", "phone", "email", "function"] as const).map((key, fieldIndex) => (
            <TextField
              key={key}
              label={
                {
                  name: "Osoba do kontaktu",
                  phone: "Telefon",
                  email: "E-mail",
                  function: "Funkcja",
                }[key]
              }
              size="small"
              fullWidth
              sx={{ minWidth: 0, gridColumn: { xs: fieldIndex === 0 ? 1 : '1 / -1', sm: fieldIndex % 2 + 1, md: fieldIndex + 1 }, gridRow: { xs: fieldIndex + 1, sm: Math.floor(fieldIndex / 2) + 1, md: 1 } }}
              disabled={disabled}
              required={key === "name" || key === "phone"}
              type={key === "email" ? "email" : "text"}
              value={contact[key] ?? ""}
              onChange={(e) =>
                onChange(
                  value.map((c, i) =>
                    i === index ? { ...c, [key]: e.target.value } : c,
                  ),
                )
              }
            />
          ))}
          {!disabled && (
            <Box sx={{ gridColumn: { xs: 2, sm: 3, md: 5 }, gridRow: 1, justifySelf: 'end' }}>
            <RowAction action="delete" label="Usuń kontakt"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
            </Box>
          )}
        </Box>
      ))}
      {(!disabled || actions) && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, alignItems: { xs: 'stretch', sm: 'center' } }}>
      {!disabled && (
        <Button color="success" variant="contained" startIcon={<AddIcon fontSize="medium" />}
          type="button"
          onClick={() => onChange([...value, { name: "", phone: "" }])}
        >
          Dodaj kontakt
        </Button>
      )}
      {actions}
      </Stack>}
    </Stack>
  );
}
