"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import CenteredSpinner from '@/app/components/common/BrandSpinner';
import { ArrowDownward, ArrowUpward, DragIndicator } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useUser } from '@/app/context/userContext';
import { usePreferences } from '@/app/context/preferencesContext';
import { orderTiles, useDashboardTiles } from '@/app/components/dashboard/useDashboardTiles';

interface Layout { order: string[]; version: number }

export default function DashboardLayoutSettings() {
    const { token, tenant } = useUser();
    const { refresh } = usePreferences();
    const { defaultTiles } = useDashboardTiles();
    const [layout, setLayout] = useState<Layout | null>(null);
    const [order, setOrder] = useState<string[]>([]);
    const [dragged, setDragged] = useState<string | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const tiles = orderTiles(defaultTiles, order);

    useEffect(() => {
        setLayout(null);
        setError('');
        if (!token) return;
        const controller = new AbortController();
        fetch('/api/preferences/dashboard', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
            .then(async response => {
                if (!response.ok) throw new Error('Nie udało się pobrać układu pulpitu.');
                const data: Layout = (await response.json()).data;
                if (!controller.signal.aborted) {
                    setLayout(data);
                    setOrder(data.order);
                }
            })
            .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
        return () => controller.abort();
    }, [token, reload]);

    const move = (source: string, target: string) => {
        if (source === target || saving) return;
        const ids = tiles.map(tile => tile.id);
        const from = ids.indexOf(source);
        const to = ids.indexOf(target);
        if (from < 0 || to < 0) return;
        ids.splice(from, 1);
        ids.splice(to, 0, source);
        setOrder([...ids, ...order.filter(id => !ids.includes(id))]);
    };

    const save = async () => {
        if (!layout || saving) return;
        setSaving(true);
        setError('');
        try {
            const response = await fetch('/api/preferences/dashboard', {
                method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: layout.version, order }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.message || 'Nie udało się zapisać układu pulpitu.');
            setLayout(body.data);
            setOrder(body.data.order);
            await refresh();
            toast.success('Zapisano układ pulpitu.');
        } catch (failure) {
            const message = failure instanceof Error ? failure.message : 'Nie udało się zapisać układu pulpitu.';
            setError(message);
            toast.error(message);
        } finally { setSaving(false); }
    };

    return <Box>
        <Typography variant="h6" gutterBottom>Kolejność kafelków na pulpicie</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Przeciągnij kafelki lub użyj strzałek, a następnie zapisz. Układ dotyczy tylko Ciebie w firmie {tenant?.name}.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => setReload(value => value + 1)} disabled={saving}>Odśwież</Button>}>{error}</Alert>}
        {!layout ? !error && <CenteredSpinner minHeight={160} label="Ładowanie układu pulpitu" /> : <>
            {tiles.length === 0 && <Alert severity="info">Nie masz jeszcze dostępnych kafelków na pulpicie.</Alert>}
            <Stack component="ol" aria-label="Kolejność kafelków" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {tiles.map((tile, index) => <Paper
                    component="li" key={tile.id} variant="outlined" draggable={!saving}
                    aria-label={`Kafelek: ${tile.label}`}
                    onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tile.id); setDragged(tile.id); }}
                    onDragOver={event => { if (dragged && !saving) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(tile.id); } }}
                    onDrop={event => { event.preventDefault(); if (dragged) move(dragged, tile.id); setDragged(null); setOver(null); }}
                    onDragEnd={() => { setDragged(null); setOver(null); }}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, cursor: saving ? 'default' : 'grab', opacity: dragged === tile.id ? 0.5 : 1, borderColor: over === tile.id ? 'primary.main' : 'divider' }}
                >
                    <DragIndicator color="action" />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0, borderRadius: '50%', bgcolor: '#34495e', color: 'white', fontSize: 22 }}>{tile.icon}</Box>
                    <Typography sx={{ flex: 1 }}>{tile.label}</Typography>
                    <IconButton aria-label={`Przesuń w górę: ${tile.label}`} disabled={saving || index === 0} onClick={() => move(tile.id, tiles[index - 1].id)}><ArrowUpward /></IconButton>
                    <IconButton aria-label={`Przesuń w dół: ${tile.label}`} disabled={saving || index === tiles.length - 1} onClick={() => move(tile.id, tiles[index + 1].id)}><ArrowDownward /></IconButton>
                </Paper>)}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={save} disabled={saving || JSON.stringify(order) === JSON.stringify(layout.order)}>{saving ? 'Zapisywanie…' : 'Zapisz układ pulpitu'}</Button>
                <Button onClick={() => setOrder([])} disabled={saving || order.length === 0}>Przywróć domyślną kolejność</Button>
            </Stack>
        </>}
    </Box>;
}
