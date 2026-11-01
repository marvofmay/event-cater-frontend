import { Box, Checkbox, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import moment from 'moment';
import Note from '@/app/types/Note';
import { stickyNoteStyles } from '@/app/components/note/stickyNoteStyles';

interface StickyNotesProps {
    notes: Note[];
    selected: string[];
    canSelect: boolean;
    onSelect: (uuid: string) => void;
    renderActions: (note: Note) => ReactNode;
}

export default function StickyNotes({ notes, selected, canSelect, onSelect, renderActions }: StickyNotesProps) {
    const { t } = useTranslation();

    return <Box component="ul" aria-label={t('note.view.board')} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap: 3, p: 1.5, pt: 2.5, m: 0 }}>
        {notes.map(note => {
            const checked = selected.includes(note.uuid);
            return <Paper component="li" key={note.uuid} aria-label={note.title || t('note.view.untitled')} aria-description={t(`note.priority.${note.priority}`)} elevation={0}
                sx={{ ...stickyNoteStyles(note.priority), listStyle: 'none', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 290, p: 2.5, pb: 3,
                    outline: checked ? '2px solid' : 'none', outlineColor: 'primary.main',
                }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography component="h2" sx={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{note.title || t('note.view.untitled')}</Typography>
                    {canSelect && <Checkbox size="small" checked={checked} onChange={() => onSelect(note.uuid)} inputProps={{ 'aria-label': t('note.view.selectNote', { title: note.title || t('note.view.untitled') }) }} sx={{ p: 0.5, color: '#57534e' }} />}
                </Stack>
                <Typography component="div" tabIndex={0} aria-label={t('note.view.content', { title: note.title || t('note.view.untitled') })}
                    sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.65, flex: 1, maxHeight: 230, overflowY: 'auto', pr: 0.5, mb: 2 }}>
                    {note.content ?? ''}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 'auto', pt: 1, borderTop: '1px solid rgba(87,83,78,0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#57534e' }}>{moment(note.updatedAt || note.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
                    <Box sx={{ display: 'flex', '& button': { color: '#44403c' } }}>{renderActions(note)}</Box>
                </Stack>
            </Paper>;
        })}
    </Box>;
}
