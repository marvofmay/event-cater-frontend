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
    Checkbox,
} from '@mui/material';
import Tooltip from "@mui/material/Tooltip";
import { Preview, Edit, Delete, Add, Key, Search } from '@mui/icons-material';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import Company from '@/app/types/Company';
import CreateCompanyModal from '@/app/components/company/modal/Create';
import EditCompanyModal from '@/app/components/company/modal/Edit';
import PreviewCompanyModal from '@/app/components/company/modal/Preview';
import ImportCompaniesFromXLSXModal from '@/app/components/company/modal/ImportCompaniesFromXLSX';
import DeleteCompanyModal from '@/app/components/company/modal/Delete';
import DeleteMultipleCompaniesModal from '@/app/components/company/modal/DeleteMultiple';
import useCompaniesQuery from '@/app/hooks/company/useCompaniesQuery';
import useAddCompanyMutation from '@/app/hooks/company/useAddCompanyMutation';
import useUpdateCompanyMutation from '@/app/hooks/company/useUpdateCompanyMutation';
import useDeleteCompanyMutation from '@/app/hooks/company/useDeleteCompanyMutation';
import useDeleteMultipleCompanyMutation from '@/app/hooks/company/useDeleteMultipleCompanyMutation';
import useImportCompaniesFromXLSXMutation from '@/app/hooks/company/importCompaniesFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';

const CompaniesTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addCompanyMutate } = useAddCompanyMutation();
    const { mutate: updateCompanyMutate } = useUpdateCompanyMutation();
    const { mutate: deleteCompanyMutate } = useDeleteCompanyMutation();
    const { mutate: deleteMultipleCompanyMutate } = useDeleteMultipleCompanyMutation();
    const { mutate: importCompaniesFromXLSXMutate } = useImportCompaniesFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useCompaniesQuery(pageSize, page, sortBy, sortDirection, phrase, 'address,industry,parentCompany,contacts');
    const { data: rawData, isLoading, error, refetch } = result;

    const companies: Company[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? companies.length : rawData?.total || 0;

    const allSelected = selected.length === companies.length && companies.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, company: Company | null = null) => {
        setModalType(type);
        setSelectedCompany(company);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedCompany(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newCompany: Company): Promise<void> => {
        return new Promise((resolve, reject) => {
            addCompanyMutate(newCompany, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('company.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (companyToDelete: Company): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteCompanyMutate(companyToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('company.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedCompany: Company): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateCompanyMutate(updatedCompany, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('company.update.error')); reject(error); },
            });
        });
    };

    const handleImportCompaniesFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importCompaniesFromXLSXMutate(file, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => {
                    toast.error(t('common.message.somethingWentWrong'));
                    reject(error);
                },
            });
        });
    };

    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : companies.map(company => company.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (companiesToDelete: Company[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleCompanyMutate(companiesToDelete, {
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
                onError: (error: object) => { toast.error(t('company.delete.error')); reject(error); },
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
                    {hasPermission("companies.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('company.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('company.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("companies.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('company.button.deleteChecked')} ({selected.length})
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
            ) : companies.length === 0 ? (
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
                                {hasPermission("companies.delete") && (
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
                                    sortDirection={sortBy === 'fullName' ? sortDirection : false}
                                    onClick={() => handleSort('fullName')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'fullName'} direction={sortBy === 'fullName' ? sortDirection : 'asc'}>
                                        {t('company.table.column.fullName')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'shortName' ? sortDirection : false}
                                    onClick={() => handleSort('shortName')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'shortName'} direction={sortBy === 'shortName' ? sortDirection : 'asc'}>
                                        {t('company.table.column.shortName')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'nip' ? sortDirection : false}
                                    onClick={() => handleSort('nip')}
                                    sx={{ padding: "4px 8px" }}
                                >
                                    <TableSortLabel active={sortBy === 'nip'} direction={sortBy === 'nip' ? sortDirection : 'asc'}>
                                        {t('company.table.column.nip')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'regon' ? sortDirection : false}
                                    onClick={() => handleSort('regon')}
                                    sx={{ padding: "4px 8px" }}
                                >
                                    <TableSortLabel active={sortBy === 'regon'} direction={sortBy === 'regon' ? sortDirection : 'asc'}>
                                        {t('company.table.column.regon')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    {t('company.table.column.active')}
                                </TableCell>
                                <TableCell>
                                    {t('company.table.column.parentCompany')}
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('company.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('company.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('company.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {companies.map((company, index) => (
                                <TableRow key={company.uuid}>
                                    {hasPermission("companies.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(company.uuid)}
                                                onChange={() => toggleSelectRow(company.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.fullName}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.shortName}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.nip}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.regon}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}> {company.active ? (<CheckCircleIcon color="success" fontSize="small" />) : (<CancelIcon color="error" fontSize="small" />)}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.parentCompany?.fullName ?? '---'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(company.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{company.updatedAt ? moment(company.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("companies.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', company)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("companies.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', company)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("companies.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', company)}><Delete /></IconButton>
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

            {hasPermission("companies.create") && modalType === 'create' && <CreateCompanyModal
                open={true}
                onClose={closeModal}
                onAddCompany={handleAdd}
            />}
            {hasPermission("companies.view") && modalType === 'preview' && <PreviewCompanyModal
                open={true}
                selectedCompany={selectedCompany}
                onClose={closeModal}
            />}
            {hasPermission("companies.update") && modalType === 'edit' && <EditCompanyModal
                open={true}
                company={selectedCompany}
                onClose={closeModal}
                onSave={handleUpdate} />}
            {hasPermission("companies.create") && modalType === 'importFromXLSX' && <ImportCompaniesFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportCompaniesFromXLSX={handleImportCompaniesFromXLSX}
                allowedTypes={["xlsx"]}
            />}
            {hasPermission("companies.delete") && modalType === 'delete' && <DeleteCompanyModal
                open={true}
                selectedCompany={selectedCompany}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}
            {hasPermission("companies.delete") && modalType === 'multipleDelete' && <DeleteMultipleCompaniesModal
                open={true}
                selectedCompanies={companies.filter(company => selected.includes(company.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default CompaniesTable;
