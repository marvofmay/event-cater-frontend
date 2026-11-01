"use client";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RowAction } from "../common/RowAction";
import { useState } from "react";
import { Box, Button, ButtonBase, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
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
  const [editor, setEditor] = useState<{ item: MenuItem; index: number | null } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <Stack gap={2}>
      <Stack component="ul" aria-label="Potrawy w menu" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {items.map((item, index) => {
          const key = item.clientId ?? String(index);
          const details = [
            ['Sekcja menu', item.section], ['Wielkość porcji', item.portionSize],
            ['Diety', item.diets.join(', ')], ['Zadeklarowane alergeny', item.allergens.join(', ')],
            ['Sposób podania', item.servingStyle], ['Uwagi do potrawy', item.notes],
          ].filter(([, value]) => value);
          return <Box component="li" key={key} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
              <ButtonBase aria-label={`${expanded[key] ? 'Zwiń' : 'Rozwiń'} potrawę: ${item.name}`} aria-expanded={Boolean(expanded[key])} onClick={() => setExpanded(current => ({ ...current, [key]: !current[key] }))} sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1, p: 1, borderRadius: 1, textAlign: 'left' }}>
                <ExpandMoreIcon sx={{ flexShrink: 0, transform: expanded[key] ? 'rotate(180deg)' : undefined }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{item.name}</Typography>
                  {item.section && <Typography variant="caption" color="text.secondary">{item.section}</Typography>}
                </Box>
                <Chip label={`Porcje: ${item.portions}`} size="small" />
              </ButtonBase>
              {!disabled && <Stack direction="row" flexShrink={0}>
                <RowAction action="edit" label={`Edytuj potrawę: ${item.name}`} onClick={() => setEditor({ item: { ...item }, index })} />
                <RowAction action="delete" label="Usuń potrawę" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} />
              </Stack>}
            </Stack>
            <Collapse in={Boolean(expanded[key])} unmountOnExit>
              <Box sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                {details.length ? details.map(([label, value]) => <Box key={label} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</Typography>
                </Box>) : <Typography variant="body2" color="text.secondary">Nie podano dodatkowych informacji.</Typography>}
              </Box>
            </Collapse>
          </Box>;
        })}
      </Stack>
      {!items.length && <Typography color="text.secondary">Nie dodano jeszcze potraw.</Typography>}
      {!disabled && <Button color="success" variant="contained" startIcon={<AddIcon fontSize="medium" />} type="button" sx={{ alignSelf: 'start' }} onClick={() => setEditor({ item: blankDish(), index: null })}>Dodaj potrawę</Button>}
      {editor && <DishDialog item={editor.item} adding={editor.index === null} disabled={disabled} onClose={() => setEditor(null)} onConfirm={dish => {
        onChange(editor.index === null ? [...items, dish] : items.map((item, index) => index === editor.index ? dish : item));
        setEditor(null);
      }} />}
    </Stack>
  );
}

function DishDialog({ item, adding, disabled, onClose, onConfirm }: { item: MenuItem; adding: boolean; disabled: boolean; onClose: () => void; onConfirm: (item: MenuItem) => void }) {
  const [draft, setDraft] = useState(item);
  const [nameError, setNameError] = useState(false);
  const update = (key: keyof MenuItem, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="menu-dish-title">
    <Box component="form" onSubmit={event => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      if (!draft.name.trim()) { setNameError(true); return; }
      onConfirm({ ...draft, name: draft.name.trim() });
    }}>
      <DialogTitle id="menu-dish-title" sx={{ bgcolor: '#34495e', color: 'white' }}>{adding ? 'Dodaj potrawę do menu' : 'Edytuj potrawę'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <TextField
              required
              label="Potrawa"
              autoFocus
              value={draft.name}
              error={nameError}
              helperText={nameError ? 'Podaj nazwę potrawy.' : undefined}
              onChange={(e) => { update('name', e.target.value); setNameError(false); }}
              disabled={disabled}
              fullWidth
            />
            <TextField
              required
              label="Liczba porcji"
              type="number"
              value={draft.portions}
              onChange={(e) =>
                update("portions", Number(e.target.value))
              }
              slotProps={{ htmlInput: { min: 1, max: 1000000, step: 1 } }}
              disabled={disabled}
            />
            <TextField
              label="Wielkość porcji"
              value={draft.portionSize ?? ""}
              onChange={(e) => update("portionSize", e.target.value)}
              disabled={disabled}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <Labels
              label="Diety, oddziel przecinkami"
              values={draft.diets}
              onChange={(v) => update("diets", v)}
              disabled={disabled}
            />
            <Labels
              label="Zadeklarowane alergeny"
              values={draft.allergens}
              onChange={(v) => update("allergens", v)}
              disabled={disabled}
            />
            <TextField
              label="Sekcja menu"
              value={draft.section ?? ""}
              onChange={(e) => update("section", e.target.value)}
              disabled={disabled}
            />
          </Stack>
          <TextField
            label="Sposób podania"
            value={draft.servingStyle ?? ""}
            onChange={(e) => update("servingStyle", e.target.value)}
            disabled={disabled}
          />
          <TextField
            label="Uwagi do potrawy"
            multiline
            value={draft.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
            disabled={disabled}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={onClose}>Anuluj</Button>
        <Button type="submit" variant="contained" disabled={disabled} sx={{ bgcolor: '#34495e' }}>{adding ? 'Dodaj do menu' : 'Zapisz pozycję'}</Button>
      </DialogActions>
    </Box>
  </Dialog>;
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
