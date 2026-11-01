"use client";

import { useEffect, useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import SettingsPanel from '@/app/components/settings/SettingsPanel';
import DashboardLayoutSettings from '@/app/components/settings/DashboardLayoutSettings';
import type { PreferenceResource } from '@/app/context/preferencesContext';
import { useUser } from '@/app/context/userContext';
import { canConfigureListPreference } from '@/app/utils/preferenceAccess';

const sections: { resource: PreferenceResource | 'dashboard'; label: string }[] = [
    { resource: 'dashboard', label: 'Pulpit' },
    { resource: 'companies', label: 'Firmy' }, { resource: 'departments', label: 'Oddziały' },
    { resource: 'employees', label: 'Pracownicy' }, { resource: 'positions', label: 'Stanowiska' },
    { resource: 'roles', label: 'Role' }, { resource: 'contractTypes', label: 'Formy zatrudnienia' },
    { resource: 'industries', label: 'Branże' }, { resource: 'notifications', label: 'Powiadomienia' },
];

export default function Page() {
    const { hasAccess, hasPermission, token } = useUser();
    const availableSections = sections.filter(section => section.resource === 'dashboard' || section.resource === 'notifications' || canConfigureListPreference(section.resource, hasAccess, hasPermission));
    const [resource, setResource] = useState<PreferenceResource | 'dashboard'>('dashboard');
    const activeResource = availableSections.some(section => section.resource === resource) ? resource : 'dashboard';
    useEffect(() => {
        const selected = new URLSearchParams(window.location.search).get('section');
        if (sections.some(section => section.resource === selected)) setResource(selected as PreferenceResource | 'dashboard');
    }, []);
    return <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
        <Typography variant="h5" gutterBottom>Moje ustawienia</Typography>
        <Tabs value={activeResource} onChange={(_, selected) => setResource(selected)} variant="scrollable" scrollButtons="auto" aria-label="Obszar ustawień osobistych">
            {availableSections.map(section => <Tab key={section.resource} value={section.resource} label={section.label} />)}
        </Tabs>
        {activeResource === 'dashboard' ? <DashboardLayoutSettings /> : <SettingsPanel key={`${token}:${activeResource}`} resource={activeResource} personalOnly />}
    </Box>;
}
