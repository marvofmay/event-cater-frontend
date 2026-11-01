"use client";

import { useEffect, useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import SettingsPanel from '@/app/components/settings/SettingsPanel';
import DashboardLayoutSettings from '@/app/components/settings/DashboardLayoutSettings';
import type { PreferenceResource } from '@/app/context/preferencesContext';

const sections: { resource: PreferenceResource | 'dashboard'; label: string }[] = [
    { resource: 'dashboard', label: 'Pulpit' },
    { resource: 'companies', label: 'Firmy' }, { resource: 'departments', label: 'Oddziały' },
    { resource: 'employees', label: 'Pracownicy' }, { resource: 'positions', label: 'Stanowiska' },
    { resource: 'roles', label: 'Role' }, { resource: 'contractTypes', label: 'Formy zatrudnienia' },
    { resource: 'industries', label: 'Branże' }, { resource: 'notifications', label: 'Powiadomienia' },
];

export default function Page() {
    const [resource, setResource] = useState<PreferenceResource | 'dashboard'>('dashboard');
    useEffect(() => {
        const selected = new URLSearchParams(window.location.search).get('section');
        if (sections.some(section => section.resource === selected)) setResource(selected as PreferenceResource | 'dashboard');
    }, []);
    return <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
        <Typography variant="h5" gutterBottom>Moje ustawienia</Typography>
        <Tabs value={resource} onChange={(_, selected) => setResource(selected)} variant="scrollable" scrollButtons="auto" aria-label="Obszar ustawień osobistych">
            {sections.map(section => <Tab key={section.resource} value={section.resource} label={section.label} />)}
        </Tabs>
        {resource === 'dashboard' ? <DashboardLayoutSettings /> : <SettingsPanel key={resource} resource={resource} personalOnly />}
    </Box>;
}
