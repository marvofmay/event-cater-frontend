import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Role from '../../../types/Role';
import { useTranslation } from 'react-i18next';

interface EditRoleModalProps {
    open: boolean;
    role: Role | null;
    onSave: (updatedRole: Role) => Promise<void>;
    onClose: () => void;
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({ open, role, onSave, onClose }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Role) => {
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            if (role) {
                await onSave({ ...role, ...values });
                onClose();
            }
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
                {t('role.modal.edit.title')}
            </DialogTitle>

            <Formik
                initialValues={{
                    uuid: role?.uuid ?? '',
                    name: role?.name ?? '',
                    description: role?.description ?? '',
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize={true}
            >
                {({ errors, touched }) => (
                    <Form>
                        <DialogContent>
                            {errorAPI && (
                                <div style={{ color: 'red', marginBottom: '1rem' }}>
                                    {errorAPI}
                                </div>
                            )}

                            {errorsAPI && (
                                <ul style={{ color: 'red', marginBottom: '1rem' }}>
                                    {Object.entries(errorsAPI).map(([field, message]) => (
                                        <li key={field}>
                                            <strong>{field}:</strong> {message}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <Field
                                as={TextField}
                                fullWidth
                                name="name"
                                label={t('role.form.field.name')}
                                variant="outlined"
                                margin="dense"
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                                required
                            />

                            <Field
                                as={TextField}
                                fullWidth
                                name="description"
                                label={t('role.form.field.description')}
                                variant="outlined"
                                margin="dense"
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
                                sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}
                                variant="contained"
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

export default EditRoleModal;
