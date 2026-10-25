import React, { useState } from 'react';
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import ContractType from '../../../types/ContractType';
import { useTranslation } from 'react-i18next';

interface AddContractTypeModalProps {
    open: boolean;
    onClose: () => void;
    onAddContractType: (newContractType: ContractType) => Promise<void>;
}

const AddContractTypeModal: React.FC<AddContractTypeModalProps> = ({ open, onClose, onAddContractType }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const initialValues: ContractType = {
        uuid: '',
        name: '',
        active: true,
        description: '',
        createdAt: '',
        updatedAt: '',
        deletedAt: null
    };

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: ContractType) => {
        setErrorAPI(null);
        setErrorsAPI(null);
        try {
            await onAddContractType(values);
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
                {t('contractType.modal.add.title')}
            </DialogTitle>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue }) => (
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
                                label={t('contractType.form.field.name')}
                                fullWidth
                                margin="normal"
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                                required
                            />
                            <Field
                                as={TextField}
                                name="description"
                                label={t('contractType.form.field.description')}
                                fullWidth
                                margin="normal"
                                multiline
                                rows={3}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={values.active}
                                        onChange={(e) => setFieldValue('active', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={t('contractType.form.field.active')}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button color="primary" onClick={onClose} variant="contained" >
                                {t('common.button.cancel')}
                            </Button>
                            <Button color="primary" type="submit" variant="contained" sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}>
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default AddContractTypeModal;
