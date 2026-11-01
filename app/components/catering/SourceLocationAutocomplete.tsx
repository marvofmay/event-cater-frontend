import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useUser } from '@/app/context/userContext';
import { useRemote } from './api';
import type { EquipmentLocation, Page } from './types';

export function SourceLocationAutocomplete({ value, onChange, disabled = false, label = 'Miejsce pobrania' }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
    const { hasPermission } = useUser();
    const canSearch = hasPermission('equipment.list');
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setQuery(value), 250);
        return () => clearTimeout(timer);
    }, [value]);
    const remote = useRemote<Page<EquipmentLocation>>(open && canSearch && !disabled ? `/equipment-locations?q=${encodeURIComponent(query)}&limit=20` : null);
    return <Autocomplete
        freeSolo fullWidth disabled={disabled} open={open} forcePopupIcon={canSearch} openOnFocus={canSearch}
        onOpen={() => setOpen(true)} onClose={() => setOpen(false)}
        value={value || null} inputValue={value}
        options={(remote.data?.items ?? []).map(location => location.name)}
        filterOptions={options => options}
        onChange={(_, selected) => onChange(selected ?? '')}
        onInputChange={(_, text, reason) => { if (reason === 'input' || reason === 'clear') onChange(text); }}
        loading={remote.loading} loadingText="Wczytywanie miejsc…"
        renderInput={params => <TextField {...params} label={label} error={Boolean(remote.error)} helperText={remote.error || (canSearch ? 'Wybierz miejsce z listy lub wpisz własne. Lista pochodzi z miejsc przechowywania sprzętu.' : 'Wpisz miejsce, z którego należy zabrać tę rzecz.')} slotProps={{ htmlInput: { ...params.inputProps, maxLength: 200 } }} />}
    />;
}
