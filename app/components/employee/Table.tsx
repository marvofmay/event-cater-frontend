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
import Employee from '@/app/types/Employee';
import CreateEmployeeModal from '@/app/components/employee/modal/Create';
//import EditEmployeeModal from '@/app/components/employee/modal/Edit';
import PreviewEmployeeModal from '@/app/components/employee/modal/Preview';
import ImportEmployeesFromXLSXModal from '@/app/components/employee/modal/ImportEmployeesFromXLSX';
import DeleteEmployeeModal from '@/app/components/employee/modal/Delete';
import DeleteMultipleEmployeesModal from '@/app/components/employee/modal/DeleteMultiple';
import useEmployeesQuery from '@/app/hooks/employee/useEmployeesQuery';
import useAddEmployeeMutation from '@/app/hooks/employee/useAddEmployeeMutation';
//import useUpdateEmployeeMutation from '@/app/hooks/employee/useUpdateEmployeeMutation';
import useDeleteEmployeeMutation from '@/app/hooks/employee/useDeleteEmployeeMutation';
import useDeleteMultipleEmployeeMutation from '@/app/hooks/employee/useDeleteMultipleEmployeeMutation';
import useImportEmployeesFromXLSXMutation from '@/app/hooks/employee/importEmployeesFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';
import EmployeePayload from '@/app/types/EmployeePayload';

const EmployeesTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addEmployeeMutate } = useAddEmployeeMutation();
    // const { mutate: updateEmployeeMutate } = useUpdateEmployeeMutation();
    const { mutate: deleteEmployeeMutate } = useDeleteEmployeeMutation();
    const { mutate: deleteMultipleEmployeeMutate } = useDeleteMultipleEmployeeMutation();
    const { mutate: importEmployeesFromXLSXMutate } = useImportEmployeesFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useEmployeesQuery(pageSize, page, sortBy, sortDirection, phrase, 'address,parentEmployee,contacts,department,company,role,position,contractType');
    const { data: rawData, isLoading, error, refetch } = result;

    const employees: Employee[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? employees.length : rawData?.total || 0;

    const allSelected = selected.length === employees.length && employees.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, employee: Employee | null = null) => {
        setModalType(type);
        setSelectedEmployee(employee);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedEmployee(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newEmployee: EmployeePayload): Promise<void> => {
        return new Promise((resolve, reject) => {
            addEmployeeMutate(newEmployee, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('employee.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (employeeToDelete: Employee): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteEmployeeMutate(employeeToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('employee.delete.error')); reject(error); },
            });
        });
    };

    // const handleUpdate = async (updatedEmployee: Employee): Promise<void> => {
    //     return new Promise((resolve, reject) => {
    //         updateEmployeeMutate(updatedEmployee, {
    //             onSuccess: (message: string) => {
    //                 toast.success(message);
    //                 refetch();
    //                 resolve();
    //             },
    //             onError: (error: object) => { toast.error(t('employee.update.error')); reject(error); },
    //         });
    //     });
    // };

    const handleImportEmployeesFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importEmployeesFromXLSXMutate(file, {
                onSuccess: (message: string) => {
                    toast.success(message);
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
        setSelected(allSelected ? [] : employees.map(employee => employee.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (employeesToDelete: Employee[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleEmployeeMutate(employeesToDelete, {
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
                onError: (error: object) => { toast.error(t('employee.delete.error')); reject(error); },
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
                    {hasPermission("employees.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('employee.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('employee.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("employees.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('employee.button.deleteChecked')} ({selected.length})
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
            ) : employees.length === 0 ? (
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
                                {hasPermission("employees.delete") && (
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
                                    sortDirection={sortBy === 'lastName' ? sortDirection : false}
                                    onClick={() => handleSort('lastName')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'lastName'} direction={sortBy === 'lastName' ? sortDirection : 'asc'}>
                                        {t('employee.table.column.lastName')}{t('employee.table.column.firstName')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    {t('employee.table.column.active')}
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('employee.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('employee.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('employee.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {employees.map((employee, index) => (
                                <TableRow key={employee.uuid}>
                                    {hasPermission("employees.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(employee.uuid)}
                                                onChange={() => toggleSelectRow(employee.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{employee.lastName} {employee.firstName}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}> {employee.active ? (<CheckCircleIcon color="success" fontSize="small" />) : (<CancelIcon color="error" fontSize="small" />)}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(employee.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{employee.updatedAt ? moment(employee.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("employees.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', employee)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {/* {hasPermission("employees.update") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', employee)}><Edit /></IconButton>
                                            </Tooltip>
                                        )} */}

                                        {hasPermission("employees.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', employee)}><Delete /></IconButton>
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

            {hasPermission("employees.create") && modalType === 'create' && <CreateEmployeeModal
                open={true}
                onClose={closeModal}
                onAddEmployee={handleAdd}
            />}

            {hasPermission("employees.create") && modalType === 'importFromXLSX' && <ImportEmployeesFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportEmployeesFromXLSX={handleImportEmployeesFromXLSX}
                allowedTypes={["xlsx"]}
            />}

            {hasPermission("employees.view") && modalType === 'preview' && <PreviewEmployeeModal
                open={true}
                selectedEmployee={selectedEmployee}
                onClose={closeModal}
            />}

            {hasPermission("employees.delete") && modalType === 'delete' && <DeleteEmployeeModal
                open={true}
                selectedEmployee={selectedEmployee}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}

            {/* {hasPermission("employees.update") && modalType === 'edit' && <EditEmployeeModal
                open={true}
                employee={selectedEmployee}
                onClose={closeModal}
                onSave={handleUpdate} />} */}

            {hasPermission("employees.delete") && modalType === 'multipleDelete' && <DeleteMultipleEmployeesModal
                open={true}
                selectedEmployees={employees.filter(employee => selected.includes(employee.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default EmployeesTable;
