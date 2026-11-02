"use client";

import { useRef, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useAction, useApi, useRemote } from '@/app/components/catering/api';
import { notifyMessagesChanged } from '@/app/hooks/messages/useUnreadMessagesCount';
import { useDebouncedText } from './useDebouncedText';

interface Recipient { uuid: string; name: string }
export interface ReplyContext { uuid: string; title: string; senderUuid: string; senderName: string }

export default function MessageComposer({ onClose, onSent, reply }: { onClose: () => void; onSent: () => void; reply?: ReplyContext | null }) {
    const api = useApi();
    const action = useAction();
    const requestUuid = useRef<string | null>(null);
    const [title, setTitle] = useState(reply ? (/^Re:/i.test(reply.title) ? reply.title : 'Re: ' + reply.title).slice(0, 200) : '');
    const [content, setContent] = useState('');
    const [recipients, setRecipients] = useState<Recipient[]>(reply ? [{ uuid: reply.senderUuid, name: reply.senderName }] : []);
    const [search, setSearch] = useState('');
    const query = useDebouncedText(search);
    const remote = useRemote<{ items: Recipient[] }>(reply ? null : '/messages/recipients?q=' + encodeURIComponent(query));
    return <Dialog open onClose={() => { if (!action.busy) onClose(); }} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={event => {
            event.preventDefault();
            action.run(async () => {
                requestUuid.current ??= crypto.randomUUID();
                await api('/messages', 'POST', { requestUuid: requestUuid.current, title, content, recipientUuids: recipients.map(recipient => recipient.uuid), ...(reply ? { replyToUuid: reply.uuid } : {}) });
                notifyMessagesChanged(); onSent(); onClose();
            }, 'Wysłano wiadomość.');
        }}>
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{reply ? 'Odpowiedź na wiadomość' : 'Nowa wiadomość'}</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    <Typography variant="body2" color="text.secondary">Wiadomość trafi do skrzynek wskazanych osób w tej firmie. Nie jest wysyłana jako SMS ani e-mail.</Typography>
                    {remote.error && <Alert severity="error" action={<Button color="inherit" onClick={remote.reload}>Ponów</Button>}>{remote.error}</Alert>}
                    {reply && <Alert severity="info">Odpowiadasz na „{reply.title}”. Odpowiedź otrzyma tylko nadawca: {reply.senderName}.</Alert>}
                    {reply && <TextField label="Odbiorca odpowiedzi" value={reply.senderName} fullWidth slotProps={{ input: { readOnly: true } }} />}
                    <Box hidden={Boolean(reply)}>
                    <Autocomplete multiple fullWidth options={remote.data?.items ?? []} value={recipients} inputValue={search} onInputChange={(_, value) => setSearch(value)} onChange={(_, values) => setRecipients(values)} getOptionLabel={option => option.name} isOptionEqualToValue={(left, right) => left.uuid === right.uuid} filterOptions={options => options} disabled={action.busy} loading={remote.loading} loadingText="Wczytywanie odbiorców…" noOptionsText="Brak odbiorców. Wpisz imię, nazwisko, login lub e-mail. Odbiorca musi mieć konto z dostępem do skrzynki." limitTags={3} sx={{ '& .MuiChip-root': { maxWidth: '100%' } }} renderInput={params => <TextField {...params} label="Odbiorcy" helperText={`${recipients.length}/100 osób. Możesz wybrać jednego lub wielu odbiorców.`} />} />
                    </Box>
                    <TextField label="Tytuł" required fullWidth value={title} disabled={action.busy} onChange={event => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} helperText={`${title.length}/200 znaków`} />
                    <TextField label="Treść" required multiline minRows={5} fullWidth value={content} disabled={action.busy} onChange={event => setContent(event.target.value)} slotProps={{ htmlInput: { maxLength: 10000 } }} helperText={`${content.length}/10 000 znaków`} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}><Button color="primary" variant="contained" disabled={action.busy} onClick={onClose}>Anuluj</Button><Button type="submit" variant="contained" disabled={action.busy || !title.trim() || !content.trim() || recipients.length < 1 || recipients.length > 100}>{action.busy ? 'Wysyłanie…' : 'Wyślij wiadomość'}</Button></DialogActions>
        </Box>
    </Dialog>;
}
