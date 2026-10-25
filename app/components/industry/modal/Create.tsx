import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Industry from '../../../types/Industry';
import { useTranslation } from 'react-i18next';

interface AddIndustryModalProps {
    open: boolean;
    onClose: () => void;
    onAddIndustry: (newIndustry: Industry) => Promise<void>;
}

const AddIndustryModal: React.FC<AddIndustryModalProps> = ({ open, onClose, onAddIndustry }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const initialValues: Industry = {
        uuid: '',
        name: '',
        description: '',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    };

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Industry) => {
        setErrorAPI(null);
        setErrorsAPI(null);
        try {
            await onAddIndustry(values);
            onClose();
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                (error as any).response?.data?.message
            ) {
                setErrorAPI((error as any).response.data.message);
                setErrorsAPI((error as any).response.data.errors as Record<string, string>);
            } else {
                setErrorAPI('Wystąpił nieznany błąd');
                setErrorsAPI(null);
            }
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
                {t('industry.modal.add.title')}
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
                                    {errorAPI}.
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
                                name="name"
                                label={t('industry.form.field.name')}
                                fullWidth
                                margin="normal"
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                                required
                            />
                            <Field
                                as={TextField}
                                name="description"
                                label={t('industry.form.field.description')}
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

export default AddIndustryModal;
