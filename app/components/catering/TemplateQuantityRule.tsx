import { Alert, Box, Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import type { TemplateLine } from './types';
import { FieldSelect, unitLabels } from './ui';
import { templateQuantity } from '@/app/utils/templateQuantity';

export function TemplateQuantityRule({ line, guests, onChange }: { line: TemplateLine; guests: number; onChange: (rule: TemplateLine['rule']) => void }) {
    const { rule } = line;
    const unit = unitLabels[line.unit ?? 'piece'] ?? line.unit ?? 'szt.';
    const fractional = ['kg', 'l'].includes(line.unit ?? '');
    const perGuest = rule.mode === 'per_guest';
    const result = templateQuantity(rule, line.unit ?? 'piece', guests);
    const base = templateQuantity({ ...rule, reservePercent: 0, reserveQuantity: '0' }, line.unit ?? 'piece', guests);
    const format = (quantity: number) => quantity.toLocaleString('pl-PL', { maximumFractionDigits: 3 });
    return <Stack gap={2}>
        <Box>
            <FieldSelect label="Ile zabrać?" value={rule.mode} options={{ fixed: 'Zawsze tyle samo', per_guest: 'Według liczby gości' }} onChange={mode => onChange({ ...rule, mode, perGuests: mode === 'per_guest' ? rule.perGuests ?? 1 : null, reservePercent: mode === 'fixed' ? 0 : rule.reservePercent, reserveQuantity: mode === 'fixed' ? '0' : rule.reserveQuantity ?? '0' })} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{perGuest ? 'Ilość dopasuje się do liczby gości wpisanej w wydarzeniu.' : 'Ta sama ilość na każde wydarzenie, niezależnie od liczby gości.'}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }} flexWrap="wrap">
            <Typography sx={{ pt: { sm: 1 } }}>Potrzebuję</Typography>
            <TextField required size="small" type="number" label="Ilość do zabrania" value={rule.quantity} onChange={event => onChange({ ...rule, quantity: event.target.value })} sx={{ width: { xs: '100%', sm: 180 } }}
                slotProps={{ htmlInput: { min: fractional ? 0.001 : 1, max: 1000000, step: fractional ? 0.001 : 1 }, input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }} />
            {perGuest && <>
                <Typography sx={{ pt: { sm: 1 } }}>{rule.perGuests === 1 ? 'na każdą' : 'na każde'}</Typography>
                <TextField required size="small" type="number" label="Liczba osób" value={rule.perGuests ?? ''} onChange={event => onChange({ ...rule, perGuests: event.target.value === '' ? null : Number(event.target.value) })} sx={{ width: { xs: '100%', sm: 160 } }} slotProps={{ htmlInput: { min: 1, max: 1000000, step: 1 }, input: { endAdornment: <InputAdornment position="end">{rule.perGuests === 1 ? 'osobę' : 'osób'}</InputAdornment> } }} />
                {rule.reservePercent > 0 ? <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">Dotychczasowy zapas: {rule.reservePercent}% ilości obliczonej dla gości.</Typography>
                    <Button type="button" size="small" onClick={() => onChange({ ...rule, reservePercent: 0, reserveQuantity: '0' })}>Zamiast procentów wpisz liczbę {unit}</Button>
                </Box> : <TextField size="small" type="number" label="Dodatkowy zapas" value={rule.reserveQuantity ?? '0'} onChange={event => onChange({ ...rule, reserveQuantity: event.target.value, reservePercent: 0 })} helperText={`Np. 5 oznacza 5 dodatkowych ${unit} — 0 oznacza brak zapasu.`} sx={{ width: { xs: '100%', sm: 220 } }} slotProps={{ htmlInput: { min: 0, max: 1000000, step: fractional ? 0.001 : 1 }, input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }} />}
            </>}
        </Stack>
        <Alert severity={result === null ? 'warning' : 'info'}>
            {result === null ? 'Uzupełnij poprawne ilości, aby zobaczyć przykład wyliczenia. Maksymalna ilość to 1 000 000.' : <>
                <Typography variant="body2" fontWeight={600}>{perGuest ? `Dla ${format(guests)} gości zabierz: ${format(result)} ${unit}` : `Na każde wydarzenie zabierz: ${format(result)} ${unit}`}</Typography>
                {perGuest && <Typography variant="body2">{rule.reservePercent ? `Wynik uwzględnia dotychczasowy zapas ${rule.reservePercent}%.` : `${format(base ?? 0)} ${unit} dla gości + ${format(Number(rule.reserveQuantity ?? 0))} ${unit} zapasu = ${format(result)} ${unit}`}</Typography>}
                {perGuest && !rule.reservePercent && <Typography variant="caption">Zapas jest stałą dodatkową ilością — nie zmieni się wraz z liczbą gości.</Typography>}
            </>}
        </Alert>
    </Stack>;
}
