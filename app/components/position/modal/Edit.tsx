import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, Box, Typography, FormControlLabel, Checkbox } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Position from '../../../types/Position';
import Department from '@/app/types/Department';
import DepartmentOption from '@/app/types/DepartmentOption';
import { useTranslation } from 'react-i18next';
import useDepartmentsQuery from '@/app/hooks/department/useDepartmentsQuery';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PositionPayload from '@/app/types/PositionPayload';

interface EditPositionModalProps {
    open: boolean;
    onClose: () => void;
    position: Position | null;
    onSave: (updatedPosition: PositionPayload) => Promise<void>;
}

const EditPositionModal: React.FC<EditPositionModalProps> = ({ open, onClose, position, onSave }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    const result = useDepartmentsQuery(1000, 1, 'name', 'asc');
    const { data: rawData, isLoading: isLoadingDepartments, error: isErrorDepartments } = result;
    const departments: Department[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
    const departmentsOptions: DepartmentOption[] = departments.map(d => ({
        uuid: d.uuid,
        name: d.name ?? '',
    }));

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Position & { departmentsUUIDs: string[] }) => {
        const payload: PositionPayload = {
            uuid: position?.uuid,
            name: values.name,
            description: values.description || undefined,
            departmentsUUIDs: values.departmentsUUIDs.length ? values.departmentsUUIDs : undefined,
            active: values.active
        };

        console.log('payload', payload);

        try {
            await onSave(payload);
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
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
                onClose();
            }}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t('position.modal.edit.title')}
            </DialogTitle>

            <Formik
                enableReinitialize
                initialValues={{
                    uuid: position?.uuid ?? '',
                    name: position?.name ?? '',
                    description: position?.description ?? '',
                    departmentsUUIDs: position?.departmentsUUIDs ?? [],
                    active: position?.active ?? false
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue, handleChange }) => (
                    <Form noValidate>
                        <DialogContent>
                            {errorAPI && <div style={{ color: 'red', marginBottom: '1rem' }}>{errorAPI}</div>}
                            {errorsAPI && (
                                <ul style={{ color: 'red', marginBottom: '1rem' }}>
                                    {Object.entries(errorsAPI).map(([field, message]) => (
                                        <li key={field}><strong>{field}:</strong> {message}</li>
                                    ))}
                                </ul>
                            )}

                            <Field
                                as={TextField}
                                fullWidth
                                name="name"
                                label={t('position.form.field.name')}
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
                                label={t('position.form.field.description')}
                                variant="outlined"
                                margin="dense"
                                onChange={handleChange}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />

                            {/* Select All / Clear All for departments */}
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={1}>
                                <Typography>{t('position.form.field.assignToDepartment')}</Typography>
                                <Box>
                                    <Button
                                        size="small"
                                        onClick={() => setFieldValue('departmentsUUIDs', departmentsOptions.map(d => d.uuid))}
                                    >
                                        {t('common.selectAll')}
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => setFieldValue('departmentsUUIDs', [])}
                                    >
                                        {t('common.clearAll')}
                                    </Button>
                                </Box>
                            </Box>

                            <Autocomplete
                                multiple
                                options={departmentsOptions}
                                loading={isLoadingDepartments}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                value={departmentsOptions.filter(d => values.departmentsUUIDs.includes(d.uuid))}
                                onChange={(_, value) => setFieldValue('departmentsUUIDs', value.map(d => d.uuid))}
                                noOptionsText={isErrorDepartments ? t('department.list.loading.failed') : t('common.noOptions')}
                                loadingText={t('common.loading')}
                                popupIcon={<ArrowDropDownIcon />}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        margin="dense"
                                        error={Boolean(isErrorDepartments)}
                                        helperText={isErrorDepartments ? t('department.list.loading.failed') : undefined}
                                    />
                                )}
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={values.active}
                                        onChange={(e) => setFieldValue('active', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={t('position.form.field.active')}
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

export default EditPositionModal;
