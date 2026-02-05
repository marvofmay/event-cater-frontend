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
import Role from '@/app/types/Role';
import CreateRoleModal from '@/app/components/role/modal/Create';
import EditRoleModal from '@/app/components/role/modal/Edit';
import PreviewRoleModal from '@/app/components/role/modal/Preview';
import ImportRolesFromXLSXModal from '@/app/components/role/modal/ImportRolesFromXLSX';
import DeleteRoleModal from '@/app/components/role/modal/Delete';
import DeleteMultipleRolesModal from '@/app/components/role/modal/DeleteMultiple';
import EditPermissionRoleModal from '@/app/components/permission/modal/EditPermissionRole';
import useRolesQuery from '@/app/hooks/role/useRolesQuery';
import useAddRoleMutation from '@/app/hooks/role/useAddRoleMutation';
import useUpdateRoleMutation from '@/app/hooks/role/useUpdateRoleMutation';
import useDeleteRoleMutation from '@/app/hooks/role/useDeleteRoleMutation';
import useDeleteMultipleRoleMutation from '@/app/hooks/role/useDeleteMultipleRoleMutation';
import useImportRolesFromXLSXMutation from '@/app/hooks/role/importRolesFromXLSXMutation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useUser } from "@/app/context/userContext";
import { SortDirection } from '@/app/types/SortDirection';

const RolesTable = () => {
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [phrase, setPhrase] = useState<string>('');
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    const { mutate: addRoleMutate } = useAddRoleMutation();
    const { mutate: updateRoleMutate } = useUpdateRoleMutation();
    const { mutate: deleteRoleMutate } = useDeleteRoleMutation();
    const { mutate: deleteMultipleRoleMutate } = useDeleteMultipleRoleMutation();
    const { mutate: importRolesFromXLSXMutate } = useImportRolesFromXLSXMutation();
    const { t } = useTranslation();
    const { hasPermission } = useUser();

    const result = useRolesQuery(pageSize, page, sortBy, sortDirection, phrase);
    const { data: rawData, isLoading, error, refetch } = result;

    const roles: Role[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const totalCount: number = Array.isArray(rawData) ? roles.length : rawData?.total || 0;

    const allSelected = selected.length === roles.length && roles.length > 0;

    const handleSearch = () => {
        setPhrase(searchPhrase);
        setPage(1);
    };

    const handleSort = (column: string) => {
        const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDirection(direction);
    };

    const openModal = (type: string, role: Role | null = null) => {
        setModalType(type);
        setSelectedRole(role);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedRole(null);
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
        setPageSize(Number(event.target.value));
        setSelected([]);
    };

    const handleAdd = async (newRole: Role): Promise<void> => {
        return new Promise((resolve, reject) => {
            addRoleMutate(newRole, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('role.add.error')); reject(error); },
            });
        });
    };

    const handleDelete = (roleToDelete: Role): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteRoleMutate(roleToDelete, {
                onSuccess: (message: string) => {
                    toast.success(message);

                    refetch().then((freshData) => {
                        if (!freshData.data?.items?.length && page > 1) {
                            setPage(page - 1);
                        }
                    });

                    resolve();
                },
                onError: (error: object) => { toast.error(t('role.delete.error')); reject(error); },
            });
        });
    };

    const handleUpdate = async (updatedRole: Role): Promise<void> => {
        return new Promise((resolve, reject) => {
            updateRoleMutate(updatedRole, {
                onSuccess: (message: string) => {
                    toast.success(message);
                    refetch();
                    resolve();
                },
                onError: (error: object) => { toast.error(t('role.update.error')); reject(error); },
            });
        });
    };

    const handleImportRolesFromXLSX = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            importRolesFromXLSXMutate(file, {
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
        setSelected(allSelected ? [] : roles.map(role => role.uuid));
    };

    const toggleSelectRow = (uuid: string) => {
        setSelected(prev => prev.includes(uuid) ? prev.filter(item => item !== uuid) : [...prev, uuid]);
    };

    const handleDeleteMultiple = (rolesToDelete: Role[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            deleteMultipleRoleMutate(rolesToDelete, {
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
                onError: (error: object) => { toast.error(t('role.delete.error')); reject(error); },
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
                    {hasPermission("roles.create") && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Add />}
                                onClick={() => openModal('create')}
                            >
                                {t('role.button.add')}
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<FileUploadOutlinedIcon />}
                                onClick={() => openModal('importFromXLSX')}
                            >
                                {t('role.button.importFromXLSX')}
                            </Button>
                        </>
                    )}
                    {hasPermission("roles.delete") && selected.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openModal('multipleDelete')}
                        >
                            {t('role.button.deleteChecked')} ({selected.length})
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
            ) : roles.length === 0 ? (
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
                                {hasPermission("roles.delete") && (
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
                                        {t('role.table.column.name')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'description' ? sortDirection : false}
                                    onClick={() => handleSort('description')}
                                    sx={{ width: 750, padding: "4px 8px" }}
                                >
                                    <TableSortLabel active={sortBy === 'description'} direction={sortBy === 'description' ? sortDirection : 'asc'}>
                                        {t('role.table.column.description')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'createdAt' ? sortDirection : false}
                                    onClick={() => handleSort('createdAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'createdAt'} direction={sortBy === 'createdAt' ? sortDirection : 'asc'}>
                                        {t('role.table.column.createdAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    sortDirection={sortBy === 'updatedAt' ? sortDirection : false}
                                    onClick={() => handleSort('updatedAt')}
                                    sx={{ padding: '4px 8px' }}
                                >
                                    <TableSortLabel active={sortBy === 'updatedAt'} direction={sortBy === 'updatedAt' ? sortDirection : 'asc'}>
                                        {t('role.table.column.updatedAt')}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ padding: '4px 8px' }}>{t('role.table.column.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.map((role, index) => (
                                <TableRow key={role.uuid}>
                                    {hasPermission("roles.delete") && (
                                        <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                                            <Checkbox
                                                checked={selected.includes(role.uuid)}
                                                onChange={() => toggleSelectRow(role.uuid)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ padding: '4px 8px' }}>{(page - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{role.name}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{role.description || '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{moment(role.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>{role.updatedAt ? moment(role.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</TableCell>
                                    <TableCell sx={{ padding: '4px 8px' }}>
                                        {hasPermission("roles.view") && (
                                            <Tooltip title={t('common.view')} placement="top">
                                                <IconButton onClick={() => openModal('preview', role)}><Preview /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("roles.edit") && (
                                            <Tooltip title={t('common.edit')} placement="top">
                                                <IconButton onClick={() => openModal('edit', role)}><Edit /></IconButton>
                                            </Tooltip>
                                        )}

                                        {hasPermission("roles.assign_permission_to_access_role") && (
                                            <Tooltip title={t('common.assignDepartmentsToPosition')} placement="top">
                                                <IconButton onClick={() => openModal('permission', role)}><Key /> </IconButton>
                                            </Tooltip>
                                        )}
                                        {hasPermission("roles.delete") && (
                                            <Tooltip title={t('common.delete')} placement="top">
                                                <IconButton onClick={() => openModal('delete', role)}><Delete /></IconButton>
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

            {hasPermission("roles.preview") && modalType === 'preview' && <PreviewRoleModal
                open={true}
                selectedRole={selectedRole}
                onClose={closeModal}
            />}
            {hasPermission("roles.create") && modalType === 'create' && <CreateRoleModal
                open={true}
                onClose={closeModal}
                onAddRole={handleAdd}
            />}
            {hasPermission("roles.edit") && modalType === 'edit' && <EditRoleModal
                open={true}
                role={selectedRole}
                onClose={closeModal}
                onSave={handleUpdate} />}
            {/* {modalType === 'permission' && <EditPermissionRoleModal
                open={true}
                selectedRole={selectedRole}
                onClose={closeModal}
                onSave={handleUpdate}
                modules={modules}
                permissions={permissions}
            />} */}
            {hasPermission("roles.create") && modalType === 'importFromXLSX' && <ImportRolesFromXLSXModal
                open={true}
                onClose={closeModal}
                onImportRolesFromXLSX={handleImportRolesFromXLSX}
                allowedTypes={["xlsx"]}
            />}
            {hasPermission("roles.delete") && modalType === 'delete' && <DeleteRoleModal
                open={true}
                selectedRole={selectedRole}
                onClose={closeModal}
                onDeleteConfirm={handleDelete} />}
            {hasPermission("roles.delete") && modalType === 'multipleDelete' && <DeleteMultipleRolesModal
                open={true}
                selectedRoles={roles.filter(role => selected.includes(role.uuid))}
                onClose={closeModal}
                onDeleteMultipleConfirm={handleDeleteMultiple}
            />}
        </div>
    );
};

export default RolesTable;
