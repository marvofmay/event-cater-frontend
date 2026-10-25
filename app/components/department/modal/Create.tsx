import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    IconButton,
    Autocomplete
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Formik, Form, Field, FormikHelpers, getIn } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import Department from '@/app/types/Department';
import { getCountries } from '@/app/utils/countries';
import useParentDepartmentOptionsQuery from '@/app/hooks/department/useParentDepartmentOptionsQuery';
import useCompanySelectOptionsQuery from '@/app/hooks/company/useCompanySelectOptionsQuery';

interface AddDepartmentModalProps {
    open: boolean;
    onClose: () => void;
    onAddDepartment: (department: Department) => Promise<void>;
    departments?: Department[];
}

const AddDepartmentModal: React.FC<AddDepartmentModalProps> = ({
    open,
    onClose,
    onAddDepartment,
}) => {
    const { t } = useTranslation();
    const countries = getCountries(t);

    const MAX_FIELDS = 3;

    const initialValues: Department = {
        uuid: '',
        company: { uuid: '', fullName: '' },
        internalCode: '',
        parentDepartment: { uuid: '', name: '' },
        name: '',
        description: '',
        active: true,
        address: {
            country: '',
            city: '',
            postcode: '',
            street: '',
        },
        contacts: [],
        phones: [''],
        emails: [''],
        webs: [''],
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: '',
        deletedAt: '',
    };

    const {
        data: dataCompanies,
        isLoading: loadingCompanies,
        isError: isErrorCompanies,
    } = useCompanySelectOptionsQuery();

    const companies =
        dataCompanies?.data.map(company => ({
            uuid: company.uuid,
            fullName: company.fullName,
        })) ?? [];

    const [selectedCompanyUUID, setSelectedCompanyUUID] = useState<string | null>(null);

    const {
        data: dataDepartments,
        isLoading: loadingDepartments,
        isError: isErrorDepartments
    } = useParentDepartmentOptionsQuery(selectedCompanyUUID);

    const departments =
        dataDepartments?.data.map(department => ({
            uuid: department.uuid,
            name: department.name,
        })) ?? [];

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        internalCode: Yup.string().required(t('validation.fieldIsRequired')),
        company: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        address: Yup.object().shape({
            country: Yup.string().required(t('validation.fieldIsRequired')),
            city: Yup.string().required(t('validation.fieldIsRequired')),
            postcode: Yup.string().required(t('validation.fieldIsRequired')),
            street: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        emails: Yup.array()
            .of(
                Yup.string()
                    .trim()
                    .email(t('validation.invalidEmail'))
                    .nullable()
            )
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const submitting = useRef(false);

    const handleSubmit = async (
        values: Department,
        helpers: FormikHelpers<Department>
    ) => {
        if (submitting.current) return;
        submitting.current = true;
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            await onAddDepartment(values);
            helpers.resetForm();
            onClose();
        } catch (error: unknown) {
            const err = error as any;

            const message = err?.response?.data?.message ?? 'Wystąpił nieznany błąd';
            const errors = err?.response?.data?.errors ?? null;

            setErrorAPI(message);
            setErrorsAPI(errors);
        } finally {
            submitting.current = false;
        }
    };

    const capitalizeFirst = (value: string): string =>
        value.charAt(0).toUpperCase() + value.slice(1);

    const renderDynamicFields = (
        type: 'phones' | 'emails' | 'webs',
        values: Department,
        setFieldValue: FormikHelpers<Department>['setFieldValue']
    ) => (
        <>
            {values[type].map((_, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                    <Field
                        as={TextField}
                        name={`${type}[${index}]`}
                        label={`${t(`department.form.field.${type.slice(0, -1)}`)} ${index + 1}`}
                        type={
                            type === 'emails'
                                ? 'email'
                                : type === 'webs'
                                    ? 'url'
                                    : 'text'
                        }
                        fullWidth
                    />
                    {index > 0 && (
                        <IconButton
                            color="error"
                            onClick={() =>
                                setFieldValue(
                                    type,
                                    values[type].filter((_, i) => i !== index)
                                )
                            }
                        >
                            <RemoveCircleOutlineIcon />
                        </IconButton>
                    )}
                </Box>
            ))}

            {values[type].length < MAX_FIELDS && (
                <Box display="flex" alignItems="center">
                    <IconButton
                        color="primary"
                        onClick={() =>
                            setFieldValue(type, [...values[type], ''])
                        }
                    >
                        <AddCircleOutlineIcon />
                    </IconButton>
                    <Typography variant="body2" fontSize="12px">
                        {t(`common.addAnother${capitalizeFirst(type.slice(0, -1))}`)}
                    </Typography>
                </Box>
            )}
        </>
    );

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
            maxWidth="lg"
        >
            <DialogTitle
                sx={{
                    backgroundColor: '#34495e',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                }}
            >
                {t('department.modal.add.title')}
            </DialogTitle>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue, setFieldTouched, submitCount, isSubmitting }) => {

                    useEffect(() => {
                        setFieldValue('parentDepartment.uuid', '');
                    }, [values.company.uuid]);

                    return (
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
                                <Box
                                    display="grid"
                                    gridTemplateColumns="repeat(3, 1fr)"
                                    gap={2}
                                >
                                    {/* MAIN */}
                                    <Box sx={boxStyle}>
                                        <Typography>{t('department.form.box.mainData')}</Typography>

                                        <Field
                                            as={TextField}
                                            name="name"
                                            label={t('department.form.field.name')}
                                            fullWidth
                                            margin="normal"
                                            error={touched.name && Boolean(errors.name)}
                                            helperText={touched.name && errors.name}
                                            required
                                        />

                                        <Field
                                            as={TextField}
                                            name="internalCode"
                                            label={t('department.form.field.internalCode')}
                                            fullWidth
                                            margin="normal"
                                            error={touched.internalCode && Boolean(errors.internalCode)}
                                            helperText={touched.internalCode && errors.internalCode}
                                            required
                                        />

                                        <Field
                                            as={TextField}
                                            name="description"
                                            label={t('department.form.field.description')}
                                            fullWidth
                                            margin="normal"
                                            multiline
                                            rows={3}
                                        />
                                        <Autocomplete
                                            options={companies}
                                            loading={loadingCompanies}
                                            getOptionLabel={(option) => option.fullName ?? ''}
                                            isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                            value={
                                                companies.find(c => c.uuid === values.company?.uuid) ?? null
                                            }
                                            onChange={(_, value) => {
                                                const uuid = value?.uuid ?? '';
                                                setFieldValue('company.uuid', uuid);
                                                setSelectedCompanyUUID(uuid);
                                                setFieldValue('parentDepartment.uuid', null);
                                            }}
                                            noOptionsText={
                                                isErrorCompanies
                                                    ? t('company.list.loading.failed')
                                                    : t('common.noOptions')
                                            }
                                            loadingText={t('common.loading')}
                                            popupIcon={<ArrowDropDownIcon />}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    fullWidth
                                                    label={t('department.form.field.company')}
                                                    margin="dense"
                                                    name="company.uuid"
                                                    required
                                                    onBlur={() => setFieldTouched('company.uuid', true)}
                                                    error={isErrorCompanies || Boolean((getIn(touched, 'company.uuid') || submitCount > 0) && getIn(errors, 'company.uuid'))}
                                                    helperText={
                                                        isErrorCompanies
                                                            ? t('company.list.loading.failed')
                                                            : (getIn(touched, 'company.uuid') || submitCount > 0) ? getIn(errors, 'company.uuid') : undefined
                                                    }
                                                />
                                            )}
                                        />
                                        <Autocomplete
                                            options={departments}
                                            loading={loadingDepartments}
                                            getOptionLabel={(option) => option.name ?? ''}
                                            isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                            value={
                                                departments.find(d => d.uuid === values.parentDepartment?.uuid) ?? null
                                            }
                                            onChange={(_, value) => {
                                                setFieldValue(
                                                    'parentDepartment.uuid',
                                                    value?.uuid ?? null
                                                );
                                            }}
                                            disabled={!values.company?.uuid}
                                            noOptionsText={
                                                isErrorDepartments
                                                    ? t('department.list.loading.failed')
                                                    : t('common.noOptions')
                                            }
                                            loadingText={t('common.loading')}
                                            popupIcon={<ArrowDropDownIcon />}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    fullWidth
                                                    label={t('department.form.field.parentDepartment')}
                                                    margin="dense"
                                                    error={isErrorDepartments}
                                                    helperText={
                                                        !values.company?.uuid
                                                            ? t('department.form.selectCompanyFirst')
                                                            : isErrorDepartments
                                                                ? t('department.list.loading.failed')
                                                                : undefined
                                                    }
                                                />
                                            )}
                                        />
                                    </Box>

                                    {/* ADDRESS */}
                                    <Box sx={boxStyle}>
                                        <Typography>{t('department.form.box.addressData')}</Typography>
                                        <Autocomplete
                                            options={countries}
                                            getOptionLabel={(option) => option.label}
                                            value={countries.find(c => c.label === values.address?.country) || null}
                                            onChange={(_, value) => {
                                                setFieldValue('address.country', value ? value.label : '');
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label={t('department.form.field.country')}
                                                    variant="outlined"
                                                    margin="dense"
                                                    error={touched?.address?.country && Boolean(errors?.address?.country)}
                                                    helperText={touched?.address?.country && errors?.address?.country}
                                                    required
                                                    fullWidth
                                                />
                                            )}
                                        />
                                        <Field
                                            as={TextField}
                                            fullWidth
                                            name="address.city"
                                            label={t('department.form.field.city')}
                                            variant="outlined"
                                            margin="normal"
                                            error={touched?.address?.city && Boolean(errors?.address?.city)}
                                            helperText={touched?.address?.city && errors?.address?.city}
                                            required
                                        >
                                        </Field>
                                        <Field
                                            as={TextField}
                                            name="address.postcode"
                                            label={t('department.form.field.postcode')}
                                            fullWidth
                                            margin="normal"
                                            error={touched?.address?.postcode && Boolean(errors?.address?.postcode)}
                                            helperText={touched?.address?.postcode && errors?.address?.postcode}
                                            required
                                        />
                                        <Field
                                            as={TextField}
                                            name="address.street"
                                            label={t('department.form.field.street')}
                                            fullWidth
                                            margin="normal"
                                            error={touched?.address?.street && Boolean(errors?.address?.street)}
                                            helperText={touched?.address?.street && errors?.address?.street}
                                            required
                                        />
                                    </Box>

                                    {/* CONTACTS */}
                                    <Box sx={boxStyle}>
                                        <Typography>{t('department.form.box.additionalData')}</Typography>

                                        <Box mt={2}>
                                            {renderDynamicFields('phones', values, setFieldValue)}
                                        </Box>

                                        <Box mt={4}>
                                            {renderDynamicFields('emails', values, setFieldValue)}
                                        </Box>

                                        <Box mt={4}>
                                            {renderDynamicFields('webs', values, setFieldValue)}
                                        </Box>
                                    </Box>
                                </Box>
                                {/* SYSTEM */}
                                <Box
                                    display="grid"
                                    gridTemplateColumns="1fr"
                                    gap={2}
                                    sx={boxStyle}
                                >
                                    <Typography>{t('department.form.box.systemData')}</Typography>
                                    <Box
                                        display="grid"
                                        gridTemplateColumns="repeat(4, 1fr)"
                                        gap={2}
                                    >
                                        <Box>
                                            <FormControlLabel
                                                control={
                                                    <Field
                                                        as={Checkbox}
                                                        name="active"
                                                        color="primary"
                                                    />
                                                }
                                                label={t('department.form.field.active')}
                                                checked={values.active}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
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
                                    disabled={isSubmitting}
                                    variant="contained"
                                    sx={{
                                        backgroundColor: '#34495e',
                                        color: 'white',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {t('common.button.save')}
                                </Button>
                            </DialogActions>
                        </Form>
                    )
                }}
            </Formik>
        </Dialog>
    );
};

const boxStyle = {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '8px',
    transition: 'border-color 0.3s ease',
    '&:hover': {
        borderColor: '#34495e',
    },
    marginTop: '5px',
};

export default AddDepartmentModal;
