"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import CenteredSpinner, { BrandSpinner } from '@/app/components/common/BrandSpinner';
import { Add, DeleteOutline, PreviewOutlined, Refresh, Reply } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/userContext';
import { useAction, useApi, useRemote } from '@/app/components/catering/api';
import { MESSAGES_CHANGED, notifyMessagesChanged } from '@/app/hooks/messages/useUnreadMessagesCount';
import MessageComposer, { ReplyContext } from './MessageComposer';
import { useDebouncedText } from './useDebouncedText';

interface MessageRow extends ReplyContext { createdAt: string; preview: string; readAt: string | null; recipientCount: number; replyToUuid?: string | null }
interface MessageDetail extends MessageRow { content: string; isSender: boolean; isRecipient: boolean; recipients: { uuid: string; name: string; readAt: string | null }[] }
const dateText = (value: string) => new Date(value).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'medium', timeStyle: 'short' });

export default function MessagesPage() {
    const { token } = useUser();
    return <MessagesWorkspace key={token ?? 'anonymous'} />;
}

function MessagesWorkspace() {
    const { loading, isAuthenticated, hasPermission, user } = useUser();
    const router = useRouter();
    const api = useApi();
    const deletion = useAction();
    const canList = hasPermission('messages.list'), canView = hasPermission('messages.view'), canSend = hasPermission('messages.create'), canDelete = hasPermission('messages.delete');
    const [folder, setFolder] = useState('inbox');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [unread, setUnread] = useState(true);
    const [compose, setCompose] = useState(false);
    const [reply, setReply] = useState<ReplyContext | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null);
    const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
    const [readError, setReadError] = useState('');
    const query = useDebouncedText(search);
    const remote = useRemote<{ items: MessageRow[]; total: number }>(isAuthenticated && canList ? '/messages?folder=' + folder + '&page=' + page + '&limit=' + pageSize + '&unread=' + (folder === 'inbox' && unread) + '&q=' + encodeURIComponent(query) + '&sortBy=' + sortBy + '&sortDirection=' + sortDirection : null);
    const detail = useRemote<MessageDetail>(selectedUuid && canView ? '/messages/' + selectedUuid : null);
    const message = detail.data?.uuid === selectedUuid ? detail.data : null;
    const rows = remote.data?.items ?? [];
    const allSelected = rows.length > 0 && selected.length === rows.length;
    useEffect(() => { if (!loading && !isAuthenticated) router.replace('/login'); }, [loading, isAuthenticated, router]);
    useEffect(() => { setPage(1); }, [query]);
    useEffect(() => { setSelected([]); }, [folder, page, pageSize, query, unread, sortBy, sortDirection]);
    useEffect(() => { setSelected(current => current.filter(uuid => remote.data?.items.some(row => row.uuid === uuid))); }, [remote.data]);
    useEffect(() => {
        const refresh = () => remote.reload();
        window.addEventListener(MESSAGES_CHANGED, refresh);
        return () => window.removeEventListener(MESSAGES_CHANGED, refresh);
    }, [remote.reload]);
    useEffect(() => {
        setReadError('');
        if (!message?.isRecipient || message.readAt !== null) return;
        let current = true;
        api<MessageDetail>('/messages/' + message.uuid + '/read', 'PATCH').then(updated => {
            notifyMessagesChanged();
            if (current) detail.setData(updated);
        }).catch(error => { if (current) setReadError(error instanceof Error ? error.message : 'Nie udało się oznaczyć wiadomości jako przeczytanej.'); });
        return () => { current = false; };
    }, [message?.uuid, message?.readAt, api]);
    const openReply = (row: ReplyContext) => { setSelectedUuid(null); setReply(row); setCompose(true); };
    const sort = (field: string) => { setSortDirection(sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc'); setSortBy(field); setPage(1); };
    const header = (field: string, label: string) => <TableSortLabel active={sortBy === field} direction={sortBy === field ? sortDirection : 'asc'} onClick={() => sort(field)}>{label}</TableSortLabel>;
    if (loading) return <CenteredSpinner label="Wczytywanie wiadomości" />;
    if (!isAuthenticated) return null;
    if (!canList && !canSend) return <Alert severity="warning">Nie masz dostępu do wiadomości.</Alert>;
    return <Box sx={{ maxWidth: 1300, mx: 'auto', p: { xs: 1, sm: 3 }, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
            <Typography variant="h5">Wiadomości</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
                {canList && <Button startIcon={<Refresh />} onClick={() => { remote.reload(); notifyMessagesChanged(); }}>Odśwież</Button>}
                {canSend && <Button variant="contained" startIcon={<Add />} onClick={() => { setReply(null); setCompose(true); }}>Nowa wiadomość</Button>}
            </Stack>
        </Stack>
        {canList && <>
            <Tabs value={folder} onChange={(_, value) => { setFolder(value); setPage(1); }} aria-label="Skrzynka wiadomości" sx={{ mb: 2 }}><Tab value="inbox" label="Odebrane" /><Tab value="sent" label="Wysłane" /></Tabs>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2} alignItems={{ sm: 'center' }}>
                <TextField fullWidth size="small" label="Szukaj w tytule lub treści" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
                {folder === 'inbox' && <FormControlLabel sx={{ flexShrink: 0 }} control={<Switch checked={unread} onChange={(_, value) => { setUnread(value); setPage(1); }} />} label="Tylko nieprzeczytane" />}
            </Stack>
            {canDelete && <Stack direction="row" gap={2} alignItems="center" mb={2}><Button color="error" variant="outlined" startIcon={<DeleteOutline />} disabled={!selected.length || deletion.busy} onClick={() => setDeleteTargets([...selected])}>Usuń zaznaczone ({selected.length})</Button><Typography variant="caption" color="text.secondary">Zaznaczanie dotyczy bieżącej strony.</Typography></Stack>}
            {remote.error && <Alert severity="error" sx={{ mb: 2 }}>{remote.error}</Alert>}
            {remote.loading && <CenteredSpinner minHeight={48} size={22} label="Wczytywanie skrzynki" />}
            <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, minWidth: 0 }}>
                <TableContainer>
                    <Table size="small" aria-label="Lista wiadomości" sx={{ minWidth: 850, tableLayout: 'fixed', '& th': { bgcolor: 'action.hover', fontWeight: 600 }, '& td, & th': { py: 1, verticalAlign: 'middle' } }}>
                        <TableHead><TableRow>
                            {canDelete && <TableCell padding="checkbox" sx={{ width: 48 }}><Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onChange={(_, checked) => setSelected(checked ? rows.map(row => row.uuid) : [])} disabled={!rows.length} inputProps={{ 'aria-label': 'Zaznacz wszystkie wiadomości na stronie' }} /></TableCell>}
                            <TableCell>{header('title', 'tytuł')}</TableCell>
                            <TableCell sx={{ width: 170 }}>{folder === 'inbox' ? header('senderName', 'nadawca') : 'odbiorcy'}</TableCell>
                            <TableCell sx={{ width: 175 }}>{header('createdAt', 'data')}</TableCell>
                            <TableCell sx={{ width: 140 }}>status</TableCell>
                            <TableCell align="center" sx={{ width: 138 }}>akcje</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {!remote.loading && !rows.length && <TableRow><TableCell colSpan={canDelete ? 6 : 5} align="center" sx={{ py: 4 }}>{unread && folder === 'inbox' ? 'Brak nieprzeczytanych wiadomości.' : 'Brak wiadomości w tej skrzynce.'}</TableCell></TableRow>}
                            {rows.map(row => <TableRow key={row.uuid} hover selected={selected.includes(row.uuid)} sx={{ bgcolor: folder === 'inbox' && !row.readAt ? 'action.hover' : undefined }}>
                                {canDelete && <TableCell padding="checkbox"><Checkbox checked={selected.includes(row.uuid)} onChange={(_, checked) => setSelected(current => checked ? [...current, row.uuid] : current.filter(uuid => uuid !== row.uuid))} inputProps={{ 'aria-label': 'Zaznacz: ' + row.title }} /></TableCell>}
                                <TableCell><Tooltip title={row.title}><Typography variant="body2" noWrap fontWeight={folder === 'inbox' && !row.readAt ? 700 : 500}>{row.title}</Typography></Tooltip><Typography variant="caption" color="text.secondary" noWrap component="div">{row.replyToUuid ? 'Odpowiedź - ' : ''}{row.preview}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{folder === 'inbox' ? row.senderName : 'Odbiorcy: ' + row.recipientCount}</Typography></TableCell>
                                <TableCell><Typography variant="body2">{dateText(row.createdAt)}</Typography></TableCell>
                                <TableCell><Chip size="small" variant="outlined" color={folder === 'inbox' && !row.readAt ? 'primary' : 'default'} label={folder === 'sent' ? 'Wysłana' : row.readAt ? 'Przeczytana' : 'Nieprzeczytana'} /></TableCell>
                                <TableCell align="center"><Stack direction="row" justifyContent="center">
                                    {canView && <Tooltip title="Podgląd"><IconButton size="small" aria-label={'Podgląd: ' + row.title} onClick={() => setSelectedUuid(row.uuid)}><PreviewOutlined fontSize="small" /></IconButton></Tooltip>}
                                    {canSend && canView && folder === 'inbox' && row.senderUuid !== user?.uuid && <Tooltip title="Odpowiedz"><IconButton size="small" color="primary" aria-label={'Odpowiedz: ' + row.title} onClick={() => openReply(row)}><Reply fontSize="small" /></IconButton></Tooltip>}
                                    {canDelete && <Tooltip title="Usuń z mojej skrzynki"><IconButton size="small" color="error" aria-label={'Usuń: ' + row.title} onClick={() => setDeleteTargets([row.uuid])}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
                                </Stack></TableCell>
                            </TableRow>)}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={remote.data?.total ?? 0} page={page - 1} rowsPerPage={pageSize} rowsPerPageOptions={[5, 10, 20, 25, 50, 100]} onPageChange={(_, value) => setPage(value + 1)} onRowsPerPageChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} labelRowsPerPage="Na stronie:" labelDisplayedRows={({ from, to, count }) => from + '-' + to + ' z ' + count} sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', px: 1 } }} />
            </Paper>
        </>}
        {compose && <MessageComposer reply={reply} onClose={() => { setCompose(false); setReply(null); }} onSent={() => { setFolder('sent'); setUnread(false); setPage(1); setSearch(''); remote.reload(); }} />}
        <Dialog open={Boolean(selectedUuid)} onClose={() => setSelectedUuid(null)} fullWidth maxWidth="md">
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{message?.title ?? 'Wiadomość'}</DialogTitle>
            <DialogContent dividers>
                {detail.loading && <CenteredSpinner minHeight={80} size={24} label="Wczytywanie treści wiadomości" />}
                {detail.error && <Alert severity="error">{detail.error}</Alert>}
                {readError && <Alert severity="warning" action={<Button color="inherit" onClick={detail.reload}>Ponów</Button>}>{readError}</Alert>}
                {message && <Stack gap={2}><Typography variant="body2" color="text.secondary">Od: {message.senderName} - {dateText(message.createdAt)}</Typography>{message.replyToUuid && <Alert severity="info">Ta wiadomość jest odpowiedzią na wcześniejszą korespondencję.</Alert>}<Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Typography>{message.isSender && <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}><Typography variant="subtitle2" mb={1}>Odbiorcy i odczyty</Typography><Stack gap={1}>{message.recipients.map(recipient => <Stack key={recipient.uuid} direction="row" justifyContent="space-between" gap={1} flexWrap="wrap"><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{recipient.name}</Typography><Typography variant="caption" color="text.secondary">{recipient.readAt ? 'Przeczytano: ' + dateText(recipient.readAt) : 'Nieprzeczytana'}</Typography></Stack>)}</Stack></Box>}</Stack>}
            </DialogContent>
            <DialogActions>{message && canSend && message.isRecipient && !message.isSender && <Button color="primary" variant="contained" startIcon={<Reply />} onClick={() => openReply(message)}>Odpowiedz</Button>}<Button color="primary" variant="contained" onClick={() => setSelectedUuid(null)}>Zamknij</Button></DialogActions>
        </Dialog>
        <Dialog open={Boolean(deleteTargets)} onClose={() => { if (!deletion.busy) setDeleteTargets(null); }} fullWidth maxWidth="xs">
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{deleteTargets?.length === 1 ? 'Usunąć wiadomość?' : 'Usunąć zaznaczone wiadomości?'}</DialogTitle>
            <DialogContent><Typography>Wiadomości do usunięcia: {deleteTargets?.length ?? 0}. Znikną tylko z Twojej skrzynki. Kopie u pozostałych osób nie zostaną usunięte. Tej operacji nie można cofnąć w interfejsie.</Typography></DialogContent>
            <DialogActions><Button color="primary" variant="contained" disabled={deletion.busy} onClick={() => setDeleteTargets(null)}>Anuluj</Button><Button variant="contained" color="error" disabled={deletion.busy} onClick={() => deletion.run(async () => {
                if (!deleteTargets) return;
                const targets = [...deleteTargets];
                if (targets.length === 1) await api('/messages/' + targets[0] + '?folder=' + folder, 'DELETE');
                else await api('/messages/delete', 'POST', { folder, uuids: targets });
                if (selectedUuid && targets.includes(selectedUuid)) setSelectedUuid(null);
                setDeleteTargets(null); setSelected([]);
                setPage(current => Math.min(current, Math.max(1, Math.ceil(((remote.data?.total ?? targets.length) - targets.length) / pageSize))));
                remote.reload(); notifyMessagesChanged();
            }, 'Usunięto wiadomości z Twojej skrzynki.')}>Usuń</Button></DialogActions>
        </Dialog>
    </Box>;
}
