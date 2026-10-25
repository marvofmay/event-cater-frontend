import React, { useState } from 'react';
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
    CircularProgress,
    TextField,
    Checkbox
} from '@mui/material';
import Tooltip from "@mui/material/Tooltip";
import { Preview, Edit, Delete, Add, Key, Search } from '@mui/icons-material';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import Position from '@/app/types/Position';
import CreatePositionModal from '@/app/components/position/modal/Create';
import EditPositionModal from '@/app/components/position/modal/Edit';
import PreviewPositionModal from '@/app/components/position/modal/Preview';
import ImportPositionsFromXLSXModal from '@/app/components/position/modal/ImportPositionsFromXLSX';
import DeletePositionModal from '@/app/components/position/modal/Delete';
import DeleteMultiplePositionsModal from '@/app/components/position/modal/DeleteMultiple';
import usePositionsQuery from '@/app/hooks/position/usePositionsQuery';
import useAddPositionMutation from '@/app/hooks/position/useAddPositionMutation';
import useUpdatePositionMutation from '@/app/hooks/position/useUpdatePositionMutation';
import useDeletePositionMutation from '@/app/hooks/position/useDeletePositionMutation';
import useDeleteMultiplePositionMutation from '@/app/hooks/position/useDeleteMultiplePositionMutation';
import useImportPositionsFromXLSXMutation from '@/app/hooks/position/importPositionsFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import PositionPayload from '@/app/types/PositionPayload';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import { SortDirection } from '@/app/types/SortDirection';
import PositionApi from "@/app/types/PositionApi";
import useDepartmentsQuery from '@/app/hooks/department/useDepartmentsQuery';
import mapPositionToPreview from '@/app/mappers/mapPositionToPreview';
import { PositionPreview } from '@/app/types/PositionPreview';

const PositionsTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addPositionMutate } = useAddPositionMutation();
    const { mutate: updatePositionMutate } = useUpdatePositionMutation();
    const { mutate: deletePositionMutate } = useDeletePositionMutation();
    const { mutate: deleteMultiplePositionMutate } = useDeleteMultiplePositionMutation();
    const { mutate: importPositionsFromXLSXMutate } = useImportPositionsFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const mapPositionApiToPosition = (api: PositionApi): Position => ({
        uuid: api.uuid,
        name: api.name,
        description: api.description,
        active: api.active,
        createdAt: api.createdAt,
        updatedAt: api.updatedAt || '',
        deletedAt: api.deletedAt || '',
        departmentsUUIDs: api.positionDepartments?.map(d => d.uuid) ?? [],
        departments: api.positionDepartments?.map(department => ({ uuid: department.uuid, name: department.name ?? '' })) ?? [],
    });

    const { data: departments } = useDepartmentsQuery(1000, 1, 'name', 'desc');

    const departmentsDict = React.useMemo(() => {
        if (!departments?.items) return {};

        return Object.fromEntries(
            departments.items.map(d => [
                d.uuid,
                {
                    uuid: d.uuid,
                    name: d.name ?? '',
                    active: d.active
                }
            ])
        ) as Record<string, { uuid: string; name: string; active?: boolean }>;
    }, [departments]);

    const result = usePositionsQuery(pageSize, page, sortBy, sortDirection, phrase, 'positionDepartments');
    const { data: rawData, isLoading, error, refetch } = result;

    const positions: Position[] = (
        Array.isArray(rawData) ? rawData : rawData?.items || []
    ).map((p: PositionApi) => mapPositionApiToPosition(p));

    const totalCount: number = Array.isArray(rawData) ? positions.length : rawData?.total || 0;

    const allSelected = selected.length === positions.length && positions.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const [previewPosition, setPreviewPosition] = useState<PositionPreview | null>(null);

    const openModal = (type: string, position: Position | null = null) => {
        setModalType(type);
        setSelectedPosition(position);

        if (type === 'preview' && position) {
            const mapped = mapPositionToPreview(position, departmentsDict);
            setPreviewPosition(mapped);
        } else {
            setSelectedPosition(position);
        }
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedPosition(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newPosition: PositionPayload): Promise<void> => {
        return new Promise((resolve, reject) => {
            addPositionMutate(newPosition, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('position.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (positionToDelete: Position): Promise<void> => {
        return new Promise((resolve, reject) => {
            deletePositionMutate(positionToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('position.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedPosition: PositionPayload): Promise<void> => {
        return new Promise((resolve, reject) => {
            updatePositionMutate(updatedPosition, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('position.update.error')); reject(error); },
            });
        });
    };

    const handleImportPositionsFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importPositionsFromXLSXMutate(file, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => {
                    toast.error(t('common.message.somethingWentWrong'));
                    console.log(error);
                    reject(error);
                },
            });
        });
    };

    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : positions.map(position => position.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (rolesToDelete: Position[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultiplePositionMutate(rolesToDelete, {
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
                onError: (error: object) => { toast.error(t('rposition.delete.error')); reject(error); },
            });
        });
    };

    return (
        <div>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} marginBottom={2}>
                <Box display="flex" alignItems="center" gap={1} sx={{ flex: '1 1 320px', maxWidth: 560, minWidth: 0 }}>
                    <TextField
                        variant="outlined"
                        placeholder={t('common.enterPhraseToSearch')}
                        size="small"
                        sx={{ flex: 1, minWidth: 0 }}
                        onChange={(e) => setSearchPhrase(e.target.value)}
                    />
                    <Button
                        startIcon={<Search />}
                        variant="contained"
                        color="primary"
                        onClick={handleSearch}
                    >
                        {t('common.button.search')}
                    </Button>
                </Box>

                <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} ml="auto" sx={{ width: { xs: '100%', sm: 'auto' }, '& .MuiButton-root': { whiteSpace: { xs: 'normal', sm: 'nowrap' }, maxWidth: '100%' } }}>
                    {hasPermission("positions.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('position.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('position.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("positions.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('position.button.deleteChecked')} ({selected.length})
                        </Button>
                    )}
                </Box>
            </Box>

            {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <div>{t('common.message.somethingWentWrong')} :(</div>
                </Box>
            ) : positions.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <div>{t('common.noData')}</div>
                </Box>
            ) : (
                <TableContainer
                    sx={{
                        maxHeight: '65vh',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                    }}
                >
                    <Table size="small" stickyHeader sx={{
                        tableLayout: 'fixed',
                        minWidth: 1040,
                        '& .MuiTableCell-root': { px: 1.5, py: 1, verticalAlign: 'middle', fontSize: '0.8125rem', lineHeight: 1.4, borderColor: 'divider' },
                        '& .MuiTableCell-head': { height: 44, fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'nowrap' },
                        '& .MuiTableRow-root:last-child .MuiTableCell-body': { borderBottom: 0 },
                        '& .MuiTableSortLabel-root': { maxWidth: '100%' },
                    }}>
                        <colgroup>
                            {hasPermission("positions.delete") && <col style={{ width: 44 }} />}
                            <col style={{ width: 44 }} />
                            <col />
                            <col style={{ width: 220 }} />
                            <col style={{ width: 96 }} />
                            <col style={{ width: 130 }} />
                            <col style={{ width: 150 }} />
                            <col style={{ width: 128 }} />
                        </colgroup>
                        <TableHead>
                            <TableRow>
                                {hasPermission("positions.delete") && (
                                    <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                        <Checkbox
                                            size="small"
                                            sx={{ p: 0.5 }}
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableCell>
                                )}
                                <TableCell
                                    sortDirection={sortBy === 'id' ? sortDirection : false}
                                    onClick={() => handleSort('id')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'id'} direction={sortBy === 'id' ? sortDirection : 'asc'}>
                                        #
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'name' ? sortDirection : false}
                                    onClick={() => handleSort('name')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'name'} direction={sortBy === 'name' ? sortDirection : 'asc'}>
                                        {t('position.table.column.name')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'departments' ? sortDirection : false}
                                    onClick={() => handleSort('departments')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'departments'} direction={sortBy === 'departments' ? sortDirection : 'asc'}>
                                        {t('position.table.column.departments')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'active' ? sortDirection : false}
                                    onClick={() => handleSort('active')}
                                    align="center"
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'active'} direction={sortBy === 'active' ? sortDirection : 'asc'}>
                                        {t('position.table.column.active')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('position.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('position.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="right" sx={{ padding: '4px 8px' }}>{t('position.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {positions.map((position, index) => (
                                <TableRow key={position.uuid} hover selected={selected.includes(position.uuid)} sx={{ height: 60 }}>
                                    {hasPermission("positions.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                size="small"
                                                sx={{ p: 0.5 }}
                                                checked={selected.includes(position.uuid)}
                                                onChange={() => toggleSelectRow(position.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        <Tooltip title={position.name}>
                                            <Box sx={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{position.name}</Box>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        <Tooltip title={position.departments?.map(department => department.name).sort((first, second) => first.localeCompare(second, 'pl')).join(', ') || ''}>
                                            <Box sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                                                {position.departments?.map(department => department.name).sort((first, second) => first.localeCompare(second, 'pl')).join(', ') || '-'}
                                            </Box>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center" sx={{ padding: '4px 8px' }}> {position.active ? (<CheckCircleIcon color="success" fontSize="small" />) : (<CancelIcon color="error" fontSize="small" />)}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                        <Box>{moment(position.createdAt).format('YYYY-MM-DD')}</Box>
                                        <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{moment(position.createdAt).format('HH:mm:ss')}</Box>
                                    </TableCell>
                                    <TableCell sx={{ padding: '4px 8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                        {position.updatedAt ? <>
                                            <Box>{moment(position.updatedAt).format('YYYY-MM-DD')}</Box>
                                            <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{moment(position.updatedAt).format('HH:mm:ss')}</Box>
                                        </> : '-'}
                                    </TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, '& .MuiIconButton-root': { p: 0.75 }, '& .MuiSvgIcon-root': { fontSize: 20 } }}>
                                        {hasPermission("positions.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', position)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("positions.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', position)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("positions.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', position)}><Delete /></IconButton>
                                            </Tooltip>
                                        )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {totalCount > 0 && (
                <TablePagination
                    sx={{
                        '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', px: { xs: 0, sm: 2 }, rowGap: 1 },
                        '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } },
                        '& .MuiTablePagination-actions': { ml: { xs: 0, sm: 2 } },
                    }}
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

            {hasPermission("positions.view") && modalType === 'preview' && <PreviewPositionModal
                open={true}
                selectedPosition={previewPosition}
                onClose={closeModal}
            />}

            {hasPermission("positions.create") && modalType === 'create' && <CreatePositionModal
                open={true}
                onClose={closeModal}
                onAddPosition={handleAdd}
            />}

            {hasPermission("positions.update") && modalType === 'edit' && <EditPositionModal
                open={true}
                position={selectedPosition}
                onClose={closeModal}
                onSave={handleUpdate} />}


            {hasPermission("positions.create") && modalType === 'importFromXLSX' && <ImportPositionsFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportPositionsFromXLSX={handleImportPositionsFromXLSX}
                allowedTypes={["xlsx"]}
            />}

            {hasPermission("positions.delete") && modalType === 'delete' && <DeletePositionModal
                open={true}
                selectedPosition={selectedPosition}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}

            {hasPermission("positions.delete") && modalType === 'multipleDelete' && <DeleteMultiplePositionsModal
                open={true}
                selectedPositions={positions.filter(position => selected.includes(position.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}

        </div>
    );
};

export default PositionsTable;
