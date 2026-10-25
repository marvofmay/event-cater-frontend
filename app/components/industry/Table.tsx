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
import Industry from '@/app/types/Industry';
import CreateIndustryModal from '@/app/components/industry/modal/Create';
import EditIndustryModal from '@/app/components/industry/modal/Edit';
import PreviewIndustryModal from '@/app/components/industry/modal/Preview';
import ImportIndustriesFromXLSXModal from '@/app/components/industry/modal/ImportIndustriesFromXLSX';
import DeleteIndustryModal from '@/app/components/industry/modal/Delete';
import DeleteMultipleIndustriesModal from '@/app/components/industry/modal/DeleteMultiple';
import useIndustriesQuery from '@/app/hooks/industry/useIndustriesQuery';
import useAddIndustryMutation from '@/app/hooks/industry/useAddIndustryMutation';
import useUpdateIndustryMutation from '@/app/hooks/industry/useUpdateIndustryMutation';
import useDeleteIndustryMutation from '@/app/hooks/industry/useDeleteIndustryMutation';
import useDeleteMultipleIndustryMutation from '@/app/hooks/industry/useDeleteMultipleIndustryMutation';
import useImportIndustriesFromXLSXMutation from '@/app/hooks/industry/importIndustriesFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';

const IndustriesTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addIndustryMutate } = useAddIndustryMutation();
    const { mutate: updateIndustryMutate } = useUpdateIndustryMutation();
    const { mutate: deleteIndustryMutate } = useDeleteIndustryMutation();
    const { mutate: deleteMultipleIndustryMutate } = useDeleteMultipleIndustryMutation();
    const { mutate: importIndustriesFromXLSXMutate } = useImportIndustriesFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useIndustriesQuery(pageSize, page, sortBy, sortDirection, phrase);
    const { data: rawData, isLoading, error, refetch } = result;

    const industries: Industry[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? industries.length : rawData?.total || 0;

    const allSelected = selected.length === industries.length && industries.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, industry: Industry | null = null) => {
        setModalType(type);
        setSelectedIndustry(industry);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedIndustry(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newIndustry: Industry): Promise<void> => {
        return new Promise((resolve, reject) => {
            addIndustryMutate(newIndustry, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('industry.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (industryToDelete: Industry): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteIndustryMutate(industryToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('industry.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedIndustry: Industry): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateIndustryMutate(updatedIndustry, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('industry.update.error')); reject(error); },
            });
        });
    };

    const handleImportIndustriesFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importIndustriesFromXLSXMutate(file, {
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
        setSelected(allSelected ? [] : industries.map(industry => industry.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (industriesToDelete: Industry[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleIndustryMutate(industriesToDelete, {
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
                onError: (error: object) => { toast.error(t('industry.delete.error')); reject(error); },
            });
        });
    };

    return (
        <div>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                        variant="outlined"
                        placeholder={t('common.enterPhraseToSearch')}
                        size="small"
                        sx={{ width: '500px' }}
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

                <Box display="flex" alignItems="center" gap={1} ml="auto">
                    {hasPermission("industries.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('industry.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('industry.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("industries.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('industry.button.deleteChecked')} ({selected.length})
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
            ) : industries.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <div>{t('common.noData')}</div>
                </Box>
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
                                {hasPermission("industries.delete") && (
                                    <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                        <Checkbox
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
                                        {t('industry.table.column.name')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'description' ? sortDirection : false}
                                    onClick={() => handleSort('description')}
                                    sx={{ width: 750, padding: "4px 8px" }}
                                >
                                    <TableSortLabel active={sortBy === 'description'} direction={sortBy === 'description' ? sortDirection : 'asc'}>
                                        {t('industry.table.column.description')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('industry.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('industry.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('industry.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {industries.map((industry, index) => (
                                <TableRow key={industry.uuid}>
                                    {hasPermission("industries.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(industry.uuid)}
                                                onChange={() => toggleSelectRow(industry.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{industry.name}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{industry.description || '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(industry.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{industry.updatedAt ? moment(industry.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("industries.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', industry)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("industries.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', industry)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("industries.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', industry)}><Delete /></IconButton>
                                            </Tooltip>
                                        )}
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

            {hasPermission("industries.view") && modalType === 'preview' && <PreviewIndustryModal
                open={true}
                selectedIndustry={selectedIndustry}
                onClose={closeModal}
            />}
            {hasPermission("industries.create") && modalType === 'create' && <CreateIndustryModal
                open={true}
                onClose={closeModal}
                onAddIndustry={handleAdd}
            />}
            {hasPermission("industries.update") && modalType === 'edit' && <EditIndustryModal
                open={true}
                industry={selectedIndustry}
                onClose={closeModal}
                onSave={handleUpdate} />}
            {/* {modalType === 'permission' && <EditPermissionIndustryModal
                open={true}
                selectedIndustry={selectedIndustry}
                onClose={closeModal}
                onSave={handleUpdate}
                modules={modules}
                permissions={permissions}
            />} */}
            {hasPermission("industries.create") && modalType === 'importFromXLSX' && <ImportIndustriesFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportIndustriesFromXLSX={handleImportIndustriesFromXLSX}
                allowedTypes={["xlsx"]}
            />}
            {hasPermission("industries.delete") && modalType === 'delete' && <DeleteIndustryModal
                open={true}
                selectedIndustry={selectedIndustry}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}
            {hasPermission("industries.delete") && modalType === 'multipleDelete' && <DeleteMultipleIndustriesModal
                open={true}
                selectedIndustries={industries.filter(industry => selected.includes(industry.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default IndustriesTable;
