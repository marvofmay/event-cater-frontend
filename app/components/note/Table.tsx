import React, { useEffect, useState } from 'react';
import CenteredSpinner from '@/app/components/common/BrandSpinner';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TablePagination,
    IconButton,
    Button,
    Box,
    TextField,
    Checkbox,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import Tooltip from "@mui/material/Tooltip";
import { Preview, Edit, Delete, Add, Search, TableRowsOutlined, StickyNote2Outlined, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import Note from '@/app/types/Note';
import CreateNoteModal from '@/app/components/note/modal/Create';
import EditNoteModal from '@/app/components/note/modal/Edit';
import PreviewNoteModal from '@/app/components/note/modal/Preview';
import DeleteNoteModal from '@/app/components/note/modal/Delete';
import DeleteMultipleNotesModal from '@/app/components/note/modal/DeleteMultiple';
import useNotesQuery from '@/app/hooks/note/useNotesQuery';
import useAddNoteMutation from '@/app/hooks/note/useAddNoteMutation';
import useUpdateNoteMutation from '@/app/hooks/note/useUpdateNoteMutation';
import useDeleteNoteMutation from '@/app/hooks/note/useDeleteNoteMutation';
import useDeleteMultipleNoteMutation from '@/app/hooks/note/useDeleteMultipleNoteMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';
import NotePayload from '@/app/types/NotePayload';
import { renderNotePriority } from '@/app/components/note/renderNotePriority';
import StickyNotes from '@/app/components/note/StickyNotes';

const NotesTable = () => {
    const [view, setView] = useState<'table' | 'board'>('board');
    useEffect(() => {
        try {
            if (localStorage.getItem('notes:view') === 'table') setView('table');
        } catch {}
    }, []);
    const handleViewChange = (_event: React.MouseEvent<HTMLElement>, nextView: 'table' | 'board' | null) => {
        if (!nextView) return;
        setView(nextView);
        try { localStorage.setItem('notes:view', nextView); } catch {}
    };
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('priority');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addNoteMutate } = useAddNoteMutation();
    const { mutate: updateNoteMutate } = useUpdateNoteMutation();
    const { mutate: deleteNoteMutate } = useDeleteNoteMutation();
    const { mutate: deleteMultipleNoteMutate } = useDeleteMultipleNoteMutation();
    const { t } = useTranslation();
    const { hasPermission, user } = useUser();

    const result = useNotesQuery(pageSize, page, sortBy, sortDirection, phrase, '', { 'userUUID': user?.uuid });
    const { data: rawData, isLoading, error, refetch } = result;

    const notes: Note[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? notes.length : rawData?.total || 0;

    const allSelected = selected.length === notes.length && notes.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
        setSelected([]);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
        setPage(1);
        setSelected([]);
    };

    const openModal = (type: string, note: Note | null = null) => {
        setModalType(type);
        setSelectedNote(note);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedNote(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newNote: NotePayload): Promise<void> => {
        return new Promise((resolve, reject) => {
            addNoteMutate(newNote, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('note.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (noteToDelete: Note): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteNoteMutate(noteToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('note.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedNote: NotePayload): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateNoteMutate(updatedNote, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('note.update.error')); reject(error); },
            });
        });
    };


    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : notes.map(note => note.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (notesToDelete: Note[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleNoteMutate(notesToDelete, {
                onSuccess: (message: string) => {
                    setSelected([]);
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('note.delete.error')); reject(error); },
            });
        });
    };

    const renderActions = (note: Note) => <>
        {hasPermission('notes.view') && <Tooltip title={t('common.view')} placement="top"><IconButton aria-label={`${t('common.view')}: ${note.title || ''}`} onClick={() => openModal('preview', note)}><Preview fontSize="small" /></IconButton></Tooltip>}
        {hasPermission('notes.update') && <Tooltip title={t('common.edit')} placement="top"><IconButton aria-label={`${t('common.edit')}: ${note.title || ''}`} onClick={() => openModal('edit', note)}><Edit fontSize="small" /></IconButton></Tooltip>}
        {hasPermission('notes.delete') && <Tooltip title={t('common.delete')} placement="top"><IconButton aria-label={`${t('common.delete')}: ${note.title || ''}`} onClick={() => openModal('delete', note)}><Delete fontSize="small" /></IconButton></Tooltip>}
    </>;

    return (
        <div>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2} gap={2} flexWrap="wrap">
                <Box component="form" onSubmit={event => { event.preventDefault(); handleSearch(); }} display="flex" alignItems="center" gap={1} sx={{ flex: '1 1 300px', minWidth: 0 }}>
                    <TextField
                        variant="outlined"
                        placeholder={t('common.enterPhraseToSearch')}
                        size="small"
                        sx={{ flex: 1, maxWidth: 500 }}
                        value={searchPhrase}
                        inputProps={{ 'aria-label': t('note.view.search') }}
                        onChange={(e) => setSearchPhrase(e.target.value)}
                    />
                    <Button
                        startIcon={<Search />}
                        variant="contained"
                        color="primary"
                        type="submit"
                    >
                        {t('common.button.search')}
                    </Button>
                </Box>

                <Box display="flex" alignItems="center" gap={1} ml="auto" flexWrap="wrap">
                    <ToggleButtonGroup value={view} exclusive onChange={handleViewChange} size="small" aria-label={t('note.view.mode')}>
                        <ToggleButton value="table" aria-label={t('note.view.table')} sx={{ gap: 0.75 }}><TableRowsOutlined fontSize="small" />{t('note.view.table')}</ToggleButton>
                        <ToggleButton value="board" aria-label={t('note.view.board')} sx={{ gap: 0.75 }}><StickyNote2Outlined fontSize="small" />{t('note.view.board')}</ToggleButton>
                    </ToggleButtonGroup>
                    {hasPermission("notes.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('note.button.add')}
                            </Button>
                        </>
                    )}
                    {hasPermission("notes.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('note.button.deleteChecked')} ({selected.length})
                        </Button>
                    )}
                </Box>
            </Box>

            {view === 'board' && <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <TextField select size="small" label={t('note.view.sortBy')} value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(1); setSelected([]); }} sx={{ minWidth: 180 }}>
                    {['priority', 'title', 'createdAt', 'updatedAt'].map(column => <MenuItem key={column} value={column}>{t(`note.table.column.${column}`)}</MenuItem>)}
                </TextField>
                <Tooltip title={t(sortDirection === 'asc' ? 'note.view.ascending' : 'note.view.descending')}><IconButton aria-label={t('note.view.changeDirection')} onClick={() => { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); setPage(1); setSelected([]); }}>{sortDirection === 'asc' ? <ArrowUpward /> : <ArrowDownward />}</IconButton></Tooltip>
                {hasPermission('notes.delete') && notes.length > 0 && <Box component="label" sx={{ display: 'flex', alignItems: 'center', ml: 'auto', fontSize: 13 }}><Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onChange={toggleSelectAll} inputProps={{ 'aria-label': t('note.view.selectPage') }} />{t('note.view.selectPage')}</Box>}
            </Box>}

            {isLoading ? (
                <CenteredSpinner minHeight={300} />
            ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <div>{t('common.message.somethingWentWrong')} :(</div>
                </Box>
            ) : notes.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <div>{t('common.noData')}</div>
                </Box>
            ) : view === 'board' ? (
                <StickyNotes notes={notes} selected={selected} canSelect={hasPermission('notes.delete')} onSelect={toggleSelectRow} renderActions={renderActions} />
            ) : (
                <TableContainer
                    sx={{
                        maxHeight: '65vh',
                        overflowY: 'auto',
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow>
                                {hasPermission("notes.delete") && (
                                    <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                        <Checkbox
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableCell>
                                )}
                                <TableCell sx={{ padding: '4px 8px' }}>#</TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'title' ? sortDirection : false}
                                    onClick={() => handleSort('title')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'title'} direction={sortBy === 'title' ? sortDirection : 'asc'}>
                                        {t('note.table.column.title')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'priority' ? sortDirection : false}
                                    onClick={() => handleSort('priority')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'priority'} direction={sortBy === 'priority' ? sortDirection : 'asc'}>
                                        {t('note.table.column.priority')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('note.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('note.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('note.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {notes.map((note, index) => (
                                <TableRow key={note.uuid}>
                                    {hasPermission("notes.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(note.uuid)}
                                                onChange={() => toggleSelectRow(note.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{note.title}</TableCell>

                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {renderNotePriority(t, note?.priority, 'N/D')}
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(note.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{note.updatedAt ? moment(note.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {renderActions(note)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {totalCount > 0 && (
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={pageSize}
                    page={page - 1}
                    onPageChange={(_, newPage) => { setPage(newPage + 1); setSelected([]); }}
                    onRowsPerPageChange={handlePageSizeChange}
                    labelRowsPerPage={t('common.rowPerPage')}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('common.of')} ${count}`}
                />
            )}

            {hasPermission("notes.create") && modalType === 'create' && <CreateNoteModal
                open={true}
                onClose={closeModal}
                onAddNote={handleAdd}
            />}

            {hasPermission("notes.view") && modalType === 'preview' && <PreviewNoteModal
                open={true}
                view={view}
                selectedNote={selectedNote}
                onClose={closeModal}
            />}

            {hasPermission("notes.update") && modalType === 'edit' && <EditNoteModal
                open={true}
                note={selectedNote}
                onClose={closeModal}
                onSave={handleUpdate} />}

            {hasPermission("notes.delete") && modalType === 'delete' && <DeleteNoteModal
                open={true}
                selectedNote={selectedNote}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}

            {hasPermission("notes.delete") && modalType === 'multipleDelete' && <DeleteMultipleNotesModal
                open={true}
                selectedNotes={notes.filter(note => selected.includes(note.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default NotesTable;
