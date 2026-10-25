import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Industry from '../../../types/Industry';
import { useTranslation } from 'react-i18next';

interface EditIndustryModalProps {
    open: boolean;
    onClose: () => void;
    industry: Industry | null;
    onSave: (updatedIndustry: Industry) => Promise<void>;
}

const EditIndustryModal: React.FC<EditIndustryModalProps> = ({ open, onClose, industry, onSave }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Industry) => {
        try {
            if (industry) {
                await onSave({ ...industry, ...values });
                onClose();
            }
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
                {t('industry.modal.edit.title')}
            </DialogTitle>

            <Formik
                enableReinitialize
                initialValues={{
                    uuid: industry?.uuid || '',
                    name: industry?.name || '',
                    description: industry?.description || '',
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ errors, touched, handleChange }) => (
                    <Form>
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
                                fullWidth
                                name="name"
                                label={t('industry.form.field.name')}
                                variant="outlined"
                                margin="dense"
                                onChange={handleChange}
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                                required
                            />

                            <Field
                                as={TextField}
                                fullWidth
                                name="description"
                                label={t('industry.form.field.description')}
                                variant="outlined"
                                margin="dense"
                                onChange={handleChange}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />
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

export default EditIndustryModal;
