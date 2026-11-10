"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useAction, useApi } from "@/app/components/catering/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  date?: string;
  plannedMinutes?: number;
};

export default function ReportHoursDialog({ open, onClose, onSaved, date = "", plannedMinutes = 0 }: Props) {
  const api = useApi();
  const action = useAction();
  const [workDate, setWorkDate] = useState(date);
  const [hours, setHours] = useState(plannedMinutes ? String(Math.floor(plannedMinutes / 60)) : "");
  const [minutes, setMinutes] = useState(plannedMinutes ? String(plannedMinutes % 60) : "0");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    setWorkDate(date);
    setHours(plannedMinutes ? String(Math.floor(plannedMinutes / 60)) : "");
    setMinutes(plannedMinutes ? String(plannedMinutes % 60) : "0");
    setComment("");
  }, [open, date, plannedMinutes]);

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const canSave = Boolean(workDate) && totalMinutes > 0 && comment.trim().length >= 5 && !action.busy;

  return (
    <Dialog open={open} onClose={() => !action.busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ backgroundColor: '#171717', color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
        {plannedMinutes > 0 ? "Dodaj dodatkowy czas w tym wydarzeniu" : "Dodaj godziny poza wydarzeniem"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          {action.error && <Alert severity="error">{action.error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            {plannedMinutes > 0
              ? `Zaplanowano z wydarzeń: ${Math.floor(plannedMinutes / 60)} h ${plannedMinutes % 60} min. Dodaj dodatkowy lub skorygowany czas i obowiązkowo uzasadnij różnicę.`
              : "Wpisz czas pracy w dniu bez wydarzenia (np. bar, sprzątanie, przygotowania) oraz obowiązkowy komentarz."}
          </Typography>
          <TextField
            label="Data"
            type="date"
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            disabled={action.busy || Boolean(date)}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Godziny"
              type="number"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              inputProps={{ min: 0, max: 24 }}
              required
              disabled={action.busy}
              fullWidth
            />
            <TextField
              label="Minuty"
              type="number"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              inputProps={{ min: 0, max: 59 }}
              required
              disabled={action.busy}
              fullWidth
            />
          </Stack>
          <TextField
            label="Komentarz (obowiązkowy)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            multiline
            minRows={3}
            required
            disabled={action.busy}
            helperText="Wyjaśnij, dlaczego pracowałeś dłużej, krócej albo czym zajmowałeś się poza wydarzeniem."
            inputProps={{ maxLength: 4000 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="primary" variant="contained" disabled={action.busy} onClick={onClose}>Anuluj</Button>
        <Button
          color="primary"
          variant="contained"
          disabled={!canSave}
          onClick={() => action.run(async () => {
            await api("/my-hours", "POST", {
              date: workDate,
              minutes: totalMinutes,
              comment: comment.trim(),
              plannedMinutes,
              kind: plannedMinutes > 0 ? "adjustment" : "manual",
            });
            onSaved();
            onClose();
          }, "Zapisano wpis godzin.")}
        >
          Zapisz godziny
        </Button>
      </DialogActions>
    </Dialog>
  );
}
