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
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import Department from '@/app/types/Department';
import CreateDepartmentModal from '@/app/components/department/modal/Create';
import EditDepartmentModal from '@/app/components/department/modal/Edit';
import PreviewDepartmentModal from '@/app/components/department/modal/Preview';
import ImportDepartmentsFromXLSXModal from '@/app/components/department/modal/ImportDepartmentsFromXLSX';
import DeleteDepartmentModal from '@/app/components/department/modal/Delete';
import DeleteMultipleDepartmentsModal from '@/app/components/department/modal/DeleteMultiple';
import useDepartmentsQuery from '@/app/hooks/department/useDepartmentsQuery';
import useAddDepartmentMutation from '@/app/hooks/department/useAddDepartmentMutation';
import useUpdateDepartmentMutation from '@/app/hooks/department/useUpdateDepartmentMutation';
import useDeleteDepartmentMutation from '@/app/hooks/department/useDeleteDepartmentMutation';
import useDeleteMultipleDepartmentMutation from '@/app/hooks/department/useDeleteMultipleDepartmentMutation';
import useImportDepartmentsFromXLSXMutation from '@/app/hooks/department/importDepartmentsFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';

const DepartmentsTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addDepartmentMutate } = useAddDepartmentMutation();
    const { mutate: updateDepartmentMutate } = useUpdateDepartmentMutation();
    const { mutate: deleteDepartmentMutate } = useDeleteDepartmentMutation();
    const { mutate: deleteMultipleDepartmentMutate } = useDeleteMultipleDepartmentMutation();
    const { mutate: importDepartmentsFromXLSXMutate } = useImportDepartmentsFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useDepartmentsQuery(pageSize, page, sortBy, sortDirection, phrase, 'address,parentDepartment,contacts,company', { active: true });
    const { data: rawData, isLoading, error, refetch } = result;

    const departments: Department[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? departments.length : rawData?.total || 0;

    const allSelected = selected.length === departments.length && departments.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, department: Department | null = null) => {
        setModalType(type);
        setSelectedDepartment(department);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedDepartment(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newDepartment: Department): Promise<void> => {
        return new Promise((resolve, reject) => {
            addDepartmentMutate(newDepartment, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('department.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (departmentToDelete: Department): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteDepartmentMutate(departmentToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('department.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedDepartment: Department): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateDepartmentMutate(updatedDepartment, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('department.update.error')); reject(error); },
            });
        });
    };

    const handleImportDepartmentsFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importDepartmentsFromXLSXMutate(file, {
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
        setSelected(allSelected ? [] : departments.map(department => department.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (departmentsToDelete: Department[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleDepartmentMutate(departmentsToDelete, {
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
                onError: (error: object) => { toast.error(t('department.delete.error')); reject(error); },
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
                    {hasPermission("departments.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('department.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('department.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("departments.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('department.button.deleteChecked')} ({selected.length})
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
            ) : departments.length === 0 ? (
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
                                {hasPermission("departments.delete") && (
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
                                        {t('department.table.column.name')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sx={{ padding: '4px 8px' }}
                                >
                                    {t('department.table.column.companyName')}
                                </TableCell>
                                <TableCell>
                                    {t('department.table.column.active')}
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('department.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('department.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('department.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {departments.map((department, index) => (
                                <TableRow key={department.uuid}>
                                    {hasPermission("departments.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(department.uuid)}
                                                onChange={() => toggleSelectRow(department.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{department.name}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{department.company.fullName}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}> {department.active ? (<CheckCircleIcon color="success" fontSize="small" />) : (<CancelIcon color="error" fontSize="small" />)}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(department.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{department.updatedAt ? moment(department.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("departments.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', department)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("departments.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', department)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("departments.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', department)}><Delete /></IconButton>
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

            {hasPermission("departments.create") && modalType === 'create' && <CreateDepartmentModal
                open={true}
                onClose={closeModal}
                onAddDepartment={handleAdd}
            />}

            {hasPermission("departments.create") && modalType === 'importFromXLSX' && <ImportDepartmentsFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportDepartmentsFromXLSX={handleImportDepartmentsFromXLSX}
                allowedTypes={["xlsx"]}
            />}

            {hasPermission("departments.view") && modalType === 'preview' && <PreviewDepartmentModal
                open={true}
                selectedDepartment={selectedDepartment}
                onClose={closeModal}
            />}

            {hasPermission("departments.delete") && modalType === 'delete' && <DeleteDepartmentModal
                open={true}
                selectedDepartment={selectedDepartment}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}

            {hasPermission("departments.update") && modalType === 'edit' && <EditDepartmentModal
                open={true}
                department={selectedDepartment}
                onClose={closeModal}
                onSave={handleUpdate} />}

            {hasPermission("departments.delete") && modalType === 'multipleDelete' && <DeleteMultipleDepartmentsModal
                open={true}
                selectedDepartments={departments.filter(department => selected.includes(department.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default DepartmentsTable;
