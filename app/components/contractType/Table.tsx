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
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import Tooltip from "@mui/material/Tooltip";
import { Preview, Edit, Delete, Add, Key, Search } from '@mui/icons-material';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import ContractType from '@/app/types/ContractType';
import CreateContractTypeModal from '@/app/components/contractType/modal/Create';
import EditContractTypeModal from '@/app/components/contractType/modal/Edit';
import PreviewContractTypeModal from '@/app/components/contractType/modal/Preview';
import ImportContractTypesFromXLSXModal from '@/app/components/contractType/modal/ImportContractTypesFromXLSX';
import DeleteContractTypeModal from '@/app/components/contractType/modal/Delete';
import DeleteMultipleContractTypesModal from '@/app/components/contractType/modal/DeleteMultiple';
import useContractTypesQuery from '@/app/hooks/contractType/useContractTypesQuery';
import useAddContractTypeMutation from '@/app/hooks/contractType/useAddContractTypeMutation';
import useUpdateContractTypeMutation from '@/app/hooks/contractType/useUpdateContractTypeMutation';
import useDeleteContractTypeMutation from '@/app/hooks/contractType/useDeleteContractTypeMutation';
import useDeleteMultipleContractTypeMutation from '@/app/hooks/contractType/useDeleteMultipleContractTypeMutation';
import useImportContractTypesFromXLSXMutation from '@/app/hooks/contractType/importContractTypesFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";

import { SortDirection } from '@/app/types/SortDirection';

const ContractTypesTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedContractType, setSelectedContractType] = useState<ContractType | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addContractTypeMutate } = useAddContractTypeMutation();
    const { mutate: updateContractTypeMutate } = useUpdateContractTypeMutation();
    const { mutate: deleteContractTypeMutate } = useDeleteContractTypeMutation();
    const { mutate: deleteMultipleContractTypeMutate } = useDeleteMultipleContractTypeMutation();
    const { mutate: importContractTypesFromXLSXMutate } = useImportContractTypesFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useContractTypesQuery(pageSize, page, sortBy, sortDirection, phrase);
    const { data: rawData, isLoading, error, refetch } = result;

    const contractTypes: ContractType[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? contractTypes.length : rawData?.total || 0;

    const allSelected = selected.length === contractTypes.length && contractTypes.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, contractType: ContractType | null = null) => {
        setModalType(type);
        setSelectedContractType(contractType);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedContractType(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newContractType: ContractType): Promise<void> => {
        return new Promise((resolve, reject) => {
            addContractTypeMutate(newContractType, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('contractType.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (contractTypeToDelete: ContractType): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteContractTypeMutate(contractTypeToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('contractType.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedContractType: ContractType): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateContractTypeMutate(updatedContractType, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('contractType.update.error')); reject(error); },
            });
        });
    };

    const handleImportContractTypesFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importContractTypesFromXLSXMutate(file, {
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
        setSelected(allSelected ? [] : contractTypes.map(contractType => contractType.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (contractTypesToDelete: ContractType[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleContractTypeMutate(contractTypesToDelete, {
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
                onError: (error: object) => { toast.error(t('contractType.delete.error')); reject(error); },
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
                    {hasPermission("contract_types.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('contractType.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('contractType.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("contract_types.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('contractType.button.deleteChecked')} ({selected.length})
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
            ) : contractTypes.length === 0 ? (
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
                                {hasPermission("contract_types.delete") && (
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
                                        {t('contractType.table.column.name')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'description' ? sortDirection : false}
                                    onClick={() => handleSort('description')}
                                    sx={{ width: 750, padding: "4px 8px" }}
                                >
                                    <TableSortLabel active={sortBy === 'description'} direction={sortBy === 'description' ? sortDirection : 'asc'}>
                                        {t('contractType.table.column.description')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'active' ? sortDirection : false}
                                    onClick={() => handleSort('active')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'active'} direction={sortBy === 'active' ? sortDirection : 'asc'}>
                                        {t('contractType.table.column.active')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('contractType.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('contractType.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('contractType.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('contractType.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contractTypes.map((contractType, index) => (
                                <TableRow key={contractType.uuid}>
                                    {hasPermission("contract_types.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(contractType.uuid)}
                                                onChange={() => toggleSelectRow(contractType.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{contractType.name}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{contractType.description || '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}> {contractType.active ? (<CheckCircleIcon color="success" fontSize="small" />) : (<CancelIcon color="error" fontSize="small" />)}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(contractType.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{contractType.updatedAt ? moment(contractType.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("contract_types.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', contractType)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("contract_types.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', contractType)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("contract_types.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', contractType)}><Delete /></IconButton>
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

            {hasPermission("contract_types.view") && modalType === 'preview' && <PreviewContractTypeModal
                open={true}
                selectedContractType={selectedContractType}
                onClose={closeModal}
            />}
            {hasPermission("contract_types.create") && modalType === 'create' && <CreateContractTypeModal
                open={true}
                onClose={closeModal}
                onAddContractType={handleAdd}
            />}
            {hasPermission("contract_types.update") && modalType === 'edit' && <EditContractTypeModal
                open={true}
                contractType={selectedContractType}
                onClose={closeModal}
                onSave={handleUpdate} />}
            {hasPermission("contract_types.create") && modalType === 'importFromXLSX' && <ImportContractTypesFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportContractTypesFromXLSX={handleImportContractTypesFromXLSX}
                allowedTypes={["xlsx"]}
            />}
            {hasPermission("contract_types.delete") && modalType === 'delete' && <DeleteContractTypeModal
                open={true}
                selectedContractType={selectedContractType}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}
            {hasPermission("contract_types.delete") && modalType === 'multipleDelete' && <DeleteMultipleContractTypesModal
                open={true}
                selectedContractTypes={contractTypes.filter(contractType => selected.includes(contractType.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default ContractTypesTable;
