import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel, Checkbox, TextField, Collapse, IconButton, Box } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Role from '../../../types/Role';
import Permission from '../../../types/Permission';
import Module from '../../../types/Module';
import { useTranslation } from 'react-i18next';

interface EditPermissionRoleModalProps {
    open: boolean;
    onClose: () => void;
    selectedRole: Role | null;
    onSave: (updatedRole: Role) => void;
    modules: Module[];
    permissions: Permission[];
}

const EditPermissionRoleModal: React.FC<EditPermissionRoleModalProps> = ({ open, onClose, selectedRole, onSave, modules, permissions }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
        assignedPermissions: Yup.array().of(Yup.string()),
    });

    const [openModules, setOpenModules] = useState<{ [moduleName: string]: boolean }>({});

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl">
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t('permission.modal.edit.title')}
            </DialogTitle>
            <Formik
                initialValues={{
                    name: selectedRole?.name || '',
                    description: selectedRole?.description || '',
                    assignedPermissions: selectedRole?.permissions?.map(perm => perm.uuid) || [],
                }}
                validationSchema={validationSchema}
                onSubmit={values => {
                    if (selectedRole) {
                        const updatedRole = {
                            ...selectedRole,
                            permissions: permissions.filter(perm => values.assignedPermissions.includes(perm.uuid)),
                        };
                        onSave(updatedRole);
                        onClose();
                    }
                }}
            >
                {({ values, handleChange, setFieldValue }) => (
                    <Form>
                        <DialogContent>
                            <TextField
                                fullWidth
                                name="name"
                                label={t('permission.modal.field.name')}
                                value={values.name}
                                onChange={handleChange}
                                margin="normal"
                                disabled
                            />
                            <TextField
                                fullWidth
                                name="description"
                                label={t('permission.modal.field.description')}
                                value={values.description}
                                onChange={handleChange}
                                margin="normal"
                                multiline
                                rows={2}
                                disabled
                            />
                            <div>
                                <Box
                                    display="flex"
                                    flexWrap="wrap"
                                    gap={2}
                                >
                                    {modules.map((module) => {
                                        const isOpen = openModules[module.name] || false;

                                        return (
                                            <Box
                                                key={module.name}
                                                flexBasis="32%"
                                                sx={{
                                                    padding: '1rem',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                                                    marginBottom: '1rem',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h4
                                                        style={{
                                                            color: '#34495e',
                                                            fontSize: '1rem',
                                                            fontWeight: '600',
                                                            marginBottom: '0.5rem',
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {t(`module.${module.name}`)}
                                                    </h4>
                                                    <IconButton onClick={() => setOpenModules(prev => ({
                                                        ...prev,
                                                        [module.name]: !isOpen
                                                    }))}>
                                                        {isOpen ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                </div>

                                                <Collapse in={isOpen}>
                                                    {permissions
                                                        .filter(permission => permission.name.startsWith(module.name))
                                                        .map(permission => (
                                                            <FormControlLabel
                                                                key={permission.uuid}
                                                                control={
                                                                    <Checkbox
                                                                        name="assignedPermissions"
                                                                        value={permission.uuid}
                                                                        checked={values.assignedPermissions.includes(permission.uuid)}
                                                                        onChange={(event) => {
                                                                            const updatedPermissions = event.target.checked
                                                                                ? [...values.assignedPermissions, permission.uuid]
                                                                                : values.assignedPermissions.filter(p => p !== permission.uuid);
                                                                            setFieldValue('assignedPermissions', updatedPermissions);
                                                                        }}
                                                                        sx={{
                                                                            color: '#34495e',
                                                                            '&.Mui-checked': {
                                                                                color: '#2ecc71', // Zielony kolor dla zaznaczonego checkboxa
                                                                            },
                                                                        }}
                                                                    />
                                                                }
                                                                label={t(`permission.${permission.name}`)}
                                                                style={{
                                                                    display: 'inline',
                                                                    marginBottom: '0.5rem',
                                                                    fontSize: '0.9rem',
                                                                }}
                                                            />
                                                        ))}
                                                </Collapse>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <Button color="primary" onClick={onClose}  variant="contained">
                                {t('common.button.cancel')}
                            </Button>
                            <Button color="primary" type="submit" sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} variant="contained">
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default EditPermissionRoleModal;
