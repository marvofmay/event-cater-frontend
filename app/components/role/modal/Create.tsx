"use client";

import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Role from '../../../types/Role';
import { useTranslation } from 'react-i18next';
import CloseIcon from "@mui/icons-material/Close";

interface AddRoleModalProps {
    open: boolean;
    onClose: () => void;
    onAddRole: (newRole: Role) => Promise<void>;
}

const AddRoleModal: React.FC<AddRoleModalProps> = ({ open, onClose, onAddRole }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const initialValues: Role = {
        uuid: '',
        name: '',
        description: '',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    };

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Role) => {
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            await onAddRole(values);
            onClose();
        } catch (error: unknown) {
            const err = error as any;

            const message = err?.response?.data?.message ?? 'Wystąpił nieznany błąd';
            const errors = err?.response?.data?.errors ?? null;

            setErrorAPI(message);
            setErrorsAPI(errors);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={(_, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    return;
                }
                onClose();
            }}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t('role.modal.add.title')}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: '#ffffff', position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ errors, touched }) => (
                    <Form noValidate>
                        <DialogContent>
                            {errorAPI && (
                                <div style={{ color: 'red', marginBottom: '1rem' }}>
                                    {errorAPI}
                                </div>
                            )}

                            {errorsAPI && (
                                <ul style={{ color: 'red', marginBottom: '1rem' }}>
                                    {Object.entries(errorsAPI).map(([field, msg]) => (
                                        <li key={field}>
                                            <strong>{field}:</strong> {msg}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <Field
                                as={TextField}
                                name="name"
                                label={t('role.form.field.name')}
                                fullWidth
                                margin="normal"
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                                required
                            />

                            <Field
                                as={TextField}
                                name="description"
                                label={t('role.form.field.description')}
                                fullWidth
                                margin="normal"
                                multiline
                                rows={3}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />
                        </DialogContent>

                        <DialogActions>
                            <Button color="primary"
                                onClick={onClose}
                                variant="contained"
                            >
                                {t('common.button.cancel')}
                            </Button>

                            <Button color="primary"
                                type="submit"
                                variant="contained"
                                sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}
                            >
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default AddRoleModal;
