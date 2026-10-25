"use client";
import AddIcon from "@mui/icons-material/Add";
import { RowAction } from "../common/RowAction";
import { Button, Stack, TextField } from "@mui/material";
import { Contact } from "./types";
export function ContactEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: Contact[];
  onChange: (value: Contact[]) => void;
  disabled?: boolean;
}) {
  return (
    <Stack gap={1}>
      {value.map((contact, index) => (
        <Stack key={index} direction={{ xs: "column", md: "row" }} gap={1}>
          {(["name", "phone", "email", "function"] as const).map((key) => (
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
            <RowAction action="delete" label="Usuń kontakt"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
          )}
        </Stack>
      ))}
      {!disabled && (
        <Button color="success" variant="contained" startIcon={<AddIcon fontSize="medium" />}
          sx={{ alignSelf: "start" }}
          onClick={() => onChange([...value, { name: "", phone: "" }])}
        >
          Dodaj kontakt
        </Button>
      )}
    </Stack>
  );
}
