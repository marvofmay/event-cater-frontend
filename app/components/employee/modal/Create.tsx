import axios from 'axios';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';
import React, { useState, useRef } from 'react';
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
    Autocomplete,
    MenuItem
} from '@mui/material';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Employee from '../../../types/Employee';
import { useTranslation } from 'react-i18next';
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { FormikHelpers } from 'formik';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import usePositionsQuery from '@/app/hooks/position/usePositionsQuery';
import useContractTypesQuery from '@/app/hooks/contractType/useContractTypesQuery';
import useRolesQuery from '@/app/hooks/role/useRolesQuery';
import useParentEmployeeOptions from '@/app/hooks/employee/useParentEmployeeOptions';
import useCompaniesQuery from '@/app/hooks/company/useCompaniesQuery';
import useDepartmentsQuery from '@/app/hooks/department/useDepartmentsQuery';
import EmployeePayload from '@/app/types/EmployeePayload';

interface AddEmployeeModalProps {
    open: boolean;
    onClose: () => void;
    onAddEmployee: (newEmployee: EmployeePayload) => Promise<void>;
    employee?: Employee | null;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ open, onClose, onAddEmployee, employee }) => {
    const { t } = useTranslation();

    const MAX_PHONE_FIELDS = 3;
    const [generatingPesel, setGeneratingPesel] = useState(false);

    const initialValues: EmployeePayload = {
        uuid: employee?.uuid,
        firstName: employee?.firstName ?? '',
        lastName: employee?.lastName ?? '',
        pesel: employee?.pesel ?? '',
        isPeselFake: employee?.isPeselFake ?? false,
        internalCode: employee?.internalCode ?? '',
        externalCode: employee?.externalCode ?? '',
        companyUUID: employee?.company?.uuid ?? '',
        departmentUUID: employee?.department?.uuid ?? '',
        parentEmployeeUUID: employee?.parentEmployee?.uuid ?? '',
        positionUUID: employee?.position?.uuid ?? '',
        contractTypeUUID: employee?.contractType?.uuid ?? '',
        roleUUID: employee?.role?.uuid ?? '',
        contacts: employee?.contacts ?? [],
        email: employee?.contacts?.find(contact => contact.type === 'email')?.data ?? employee?.email ?? '',
        phones: employee?.contacts?.some(contact => contact.type === 'phone') ? employee.contacts.filter(contact => contact.type === 'phone').map(contact => contact.data) : employee?.phones?.length ? employee.phones : [''],
        webs: employee?.contacts?.filter(contact => contact.type === 'website').map(contact => contact.data) ?? [''],
        employmentFrom: employee?.employmentFrom ?? '',
        active: employee?.active ?? true,
        address: {
            country: employee?.address?.country ?? '',
            city: employee?.address?.city ?? '',
            postcode: employee?.address?.postcode ?? '',
            street: employee?.address?.street ?? '',
        },
        employmentTo: employee?.employmentTo ?? '',
        createdAt: '',
        updatedAt: '',
        deletedAt: ''
    };

    const validationSchema = Yup.object({
        firstName: Yup.string().required(t('validation.fieldIsRequired')),
        lastName: Yup.string().trim().test('length', 'Nazwisko musi mieć od 3 do 50 znaków.', value => !value || (value.length >= 3 && value.length <= 50)),
        pesel: Yup.string()
            .required(t('validation.fieldIsRequired'))
            .matches(/^\d{11}$/, t('validation.peselMustHave11Digits')),
        email: Yup
            .string()
            .trim()
            .required(t('validation.fieldIsRequired'))
            .max(100, 'Adres e-mail może mieć maksymalnie 100 znaków.')
            .email(t('validation.invalidEmail')),
        employmentFrom: Yup.string().nullable(),
        companyUUID: Yup.string().required(t('validation.fieldIsRequired')),
        departmentUUID: Yup.string().required(t('validation.fieldIsRequired')),
        contractTypeUUID: Yup.string().nullable(),
        positionUUID: Yup.string().required(t('validation.fieldIsRequired')),
        roleUUID: Yup.string().required(t('validation.fieldIsRequired')),
        address: Yup.object().shape({
            country: Yup.string(),
            city: Yup.string(),
            postcode: Yup.string(),
            street: Yup.string(),
        }),
        phones: Yup.array()
            .of(Yup.string().trim())
            .compact(value => !value || !value.trim())
            .min(1, t('validation.atLeastOnePhoneIsRequired'))
            .test('login-phone', 'Podaj prawidłowy telefon logowania: 9 cyfr lub numer z kodem kraju.', values => {
                const phone = values?.[0]?.trim() ?? '';
                if (!phone) return true;
                if (!/^\+?[0-9 ().-]+$/.test(phone)) return false;
                const digits = phone.replace(/[^0-9]/g, '').replace(/^00/, '');
                return /^[1-9][0-9]{8,14}$/.test(digits);
            }),
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const submitting = useRef(false);

    const handleSubmit = async (values: EmployeePayload, formikHelpers: FormikHelpers<EmployeePayload>) => {
        const employeeData = {
            ...values,
            employmentFrom: values.employmentFrom || null,
            contractTypeUUID: values.contractTypeUUID || null,
            email: values.email?.trim() || null,
        };

        if (submitting.current) return;
        submitting.current = true;
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            await onAddEmployee(employeeData);
            formikHelpers.resetForm();
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

    // ToDo:: change to useCompaniesSelectOptionsQuery()
    const {
        data: dataCompanies,
        isLoading: loadingCompanies,
        isError: isErrorCompanies
    } = useCompaniesQuery(
        1000,
        1,
        'fullName',
        'asc'
    );

    const companies = dataCompanies?.items.map(({ uuid, fullName }) => ({
        uuid,
        fullName,
    })) ?? [];

    const {
        data: dataDepartments,
        isLoading: loadingDepartments,
        isError: isErrorDepartments
    } = useDepartmentsQuery(
        1000,
        1,
        'name',
        'asc'
    );

    const [selectedCompanyUUID, setSelectedCompanyUUID] = useState<string | null>(employee?.company?.uuid ?? null);

    const departments = dataDepartments?.items.map(({ uuid, name }) => ({
        uuid,
        name,
    })) ?? [];


    const {
        data: dataPositions,
        isLoading: loadingPositions,
        isError: isErrorPositions
    } = usePositionsQuery(
        1000,
        1,
        'name',
        'asc'
    );

    const positions = dataPositions?.items.map(({ uuid, name }) => ({
        uuid,
        name,
    })) ?? [];

    const {
        data: dataContractTypes,
        isLoading: loadingContractTypes,
        isError: isErrorContractTypes
    } = useContractTypesQuery(
        1000,
        1,
        'name',
        'asc'
    );

    const contractTypes = dataContractTypes?.items.map(({ uuid, name }) => ({
        uuid,
        name,
    })) ?? [];

    const {
        data: dataRoles,
        isLoading: loadingRoles,
        isError: isErrorRoles
    } = useRolesQuery(
        1000,
        1,
        'name',
        'asc'
    );

    const roles = dataRoles?.items.map(({ uuid, name }) => ({
        uuid,
        name,
    })) ?? [];

    const { data: supervisors = [], isLoading: loadingSupervisors, isError: supervisorError } = useParentEmployeeOptions(selectedCompanyUUID, employee?.uuid);


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
            maxWidth="xl"
        >
            <DialogTitle sx={{ backgroundColor: '#171717', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t(employee ? 'employee.modal.edit.title' : 'employee.modal.add.title')}
            </DialogTitle>
            <Formik<EmployeePayload>
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue, setFieldTouched, submitCount, isSubmitting }) => (
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
                                gridTemplateColumns="repeat(4, 1fr)"
                                gap={2}
                            >
                                {/* Kolumna 1 */}
                                <Box sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#34495e',
                                    },
                                }}
                                >
                                    <Typography sx={{ marginBottom: 1 }}>{t('employee.form.box.personalData')}</Typography>
                                    <Field
                                        as={TextField}
                                        name="firstName"
                                        label={t('employee.form.field.firstName')}
                                        fullWidth
                                        margin="normal"
                                        error={touched.firstName && Boolean(errors.firstName)}
                                        helperText={touched.firstName && errors.firstName}
                                        required
                                    />
                                    <Field
                                        as={TextField}
                                        name="lastName"
                                        label={t('employee.form.field.lastName')}
                                        fullWidth
                                        margin="normal"
                                        error={touched.lastName && Boolean(errors.lastName)}
                                        helperText={touched.lastName && errors.lastName}
                                    />
                                    <Field
                                        as={TextField}
                                        name="pesel"
                                        label={t('employee.form.field.pesel')}
                                        multiline
                                        fullWidth
                                        margin="normal"
                                        error={touched.pesel && Boolean(errors.pesel)}
                                        helperText={touched.pesel && errors.pesel}
                                        required
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                name="isPeselFake"
                                                checked={values.isPeselFake ?? false}
                                                disabled={generatingPesel}
                                                onChange={async event => {
                                                    if (!event.target.checked) {
                                                        setFieldValue('isPeselFake', false);
                                                        setFieldValue('pesel', '');
                                                        return;
                                                    }
                                                    setFieldValue('isPeselFake', true);
                                                    setGeneratingPesel(true);
                                                    setErrorAPI(null);
                                                    try {
                                                        const token = localStorage.getItem('auth_token');
                                                        const response = await axios.post(
                                                            `${SERVICE_COMPANY_URL}/api/employees/generate-fake-pesel`,
                                                            {},
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        setFieldValue('pesel', response.data.pesel);
                                                        setFieldValue('isPeselFake', true);
                                                    } catch {
                                                        setFieldValue('isPeselFake', false);
                                                        setErrorAPI('Nie udało się wygenerować fikcyjnego PESEL-u. Spróbuj ponownie.');
                                                    } finally {
                                                        setGeneratingPesel(false);
                                                    }
                                                }}
                                            />
                                        }
                                        label="Fikcyjny PESEL"
                                    />
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Po zaznaczeniu wygenerujemy numer zgodny z formatem i sumą kontrolną PESEL. Pozostanie oznaczony jako fikcyjny. Używaj go w kolejnych importach XLSX.
                                    </Typography>
                                    <Field
                                        as={TextField}
                                        name="internalCode"
                                        label={t('employee.form.field.internalCode')}
                                        multiline
                                        fullWidth
                                        margin="normal"
                                        error={touched.internalCode && Boolean(errors.internalCode)}
                                        helperText={touched.internalCode && errors.internalCode}
                                    />
                                    <Field
                                        as={TextField}
                                        name="externalCode"
                                        label={t('employee.form.field.externalCode')}
                                        multiline
                                        fullWidth
                                        margin="normal"
                                        error={touched.externalCode && Boolean(errors.externalCode)}
                                        helperText={touched.externalCode && errors.externalCode}
                                    />
                                </Box>

                                {/* Kolumna 2 */}
                                <Box sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#34495e',
                                    },
                                }}>
                                    <Typography sx={{ marginBottom: 1 }}>{t('employee.form.box.employmentData')}</Typography>
                                    <Field
                                        as={TextField}
                                        type="date"
                                        name="employmentFrom"
                                        value={values.employmentFrom ?? ''}
                                        label={t('employee.form.field.employmentFrom')}
                                        fullWidth
                                        margin="normal"
                                        InputLabelProps={{ shrink: true }}
                                        error={touched.employmentFrom && Boolean(errors.employmentFrom)}
                                        helperText={touched.employmentFrom && errors.employmentFrom}
                                    />
                                    <Autocomplete
                                        options={companies}
                                        loading={loadingCompanies}
                                        getOptionLabel={(option) => option.fullName ?? ''}
                                        isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                        value={
                                            companies.find(c => c.uuid === values.companyUUID) ?? null
                                        }
                                        onChange={(_, value) => {
                                            const uuid = value?.uuid ?? '';
                                            setFieldValue('companyUUID', uuid);
                                            setSelectedCompanyUUID(uuid);
                                            setFieldValue('departmentUUID', '');
                                            setFieldValue('parentEmployeeUUID', '');
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
                                                label={t('employee.form.field.company')}
                                                margin="dense"
                                                required
                                                name="companyUUID"
                                                onBlur={() => setFieldTouched('companyUUID', true)}
                                                error={isErrorCompanies || Boolean((touched.companyUUID || submitCount > 0) && errors.companyUUID)}
                                                helperText={
                                                    isErrorCompanies
                                                        ? t('company.list.loading.failed')
                                                        : (touched.companyUUID || submitCount > 0) ? errors.companyUUID : undefined
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
                                            departments.find(d => d.uuid === values.departmentUUID) ?? null
                                        }
                                        onChange={(_, value) => {
                                            setFieldValue(
                                                'departmentUUID',
                                                value?.uuid ?? ''
                                            );
                                        }}
                                        disabled={!values.companyUUID}
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
                                                label={t('employee.form.field.department')}
                                                margin="dense"
                                                required
                                                name="departmentUUID"
                                                onBlur={() => setFieldTouched('departmentUUID', true)}
                                                error={isErrorDepartments || Boolean((touched.departmentUUID || submitCount > 0) && errors.departmentUUID)}
                                                helperText={
                                                    !values.companyUUID
                                                        ? t('department.form.selectCompanyFirst')
                                                        : isErrorDepartments
                                                            ? t('department.list.loading.failed')
                                                            : (touched.departmentUUID || submitCount > 0) ? errors.departmentUUID : undefined
                                                }
                                            />
                                        )}
                                    />
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="positionUUID"
                                        label={t('employee.form.field.position')}
                                        margin="normal"
                                        disabled={!values.departmentUUID}
                                        error={touched?.positionUUID && Boolean(errors?.positionUUID)}
                                        helperText={
                                            !values.departmentUUID
                                                ? t('position.form.selectDepartmentFirst')
                                                : isErrorPositions
                                                    ? t('position.list.loading.failed')
                                                    : undefined
                                        }
                                        required
                                    >
                                        {loadingPositions && <MenuItem disabled>{t('common.loading')}</MenuItem>}
                                        {isErrorPositions && <MenuItem disabled>{t('position.list.loading.failed')}</MenuItem>}
                                        {!loadingPositions &&
                                            positions
                                                //.filter(p => p.department.uuid === values.department.uuid)
                                                .map(p => (
                                                    <MenuItem key={p.uuid} value={p.uuid}>
                                                        {p.name}
                                                    </MenuItem>
                                                ))}
                                    </Field>
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="contractTypeUUID"
                                        value={values.contractTypeUUID ?? ''}
                                        label={t('employee.form.field.contractType')}
                                        margin="normal"
                                        error={touched?.contractTypeUUID && Boolean(errors?.contractTypeUUID)}
                                        helperText={touched?.contractTypeUUID && errors?.contractTypeUUID}
                                    >
                                        <MenuItem value="">Brak</MenuItem>
                                        {loadingContractTypes && <MenuItem disabled>{t('common.loading')}</MenuItem>}
                                        {isErrorContractTypes && <MenuItem disabled>{t('contractType.list.loading.failed')}</MenuItem>}
                                        {!loadingContractTypes && contractTypes.map(contractType => (
                                            <MenuItem key={contractType.uuid} value={contractType.uuid}>
                                                {contractType.name}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                    <Autocomplete
                                        options={Array.isArray(supervisors) ? supervisors : []}
                                        loading={loadingSupervisors}
                                        disabled={!values.companyUUID}
                                        getOptionLabel={option => option.fullName}
                                        isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                        value={(Array.isArray(supervisors) ? supervisors : []).find(option => option.uuid === values.parentEmployeeUUID) ?? (employee?.parentEmployee?.uuid && employee.parentEmployee.uuid === values.parentEmployeeUUID ? { uuid: employee.parentEmployee.uuid, fullName: `${employee.parentEmployee.firstName} ${employee.parentEmployee.lastName}`.trim() } : null)}
                                        onChange={(_, option) => setFieldValue('parentEmployeeUUID', option?.uuid ?? '')}
                                        renderOption={(props, option) => <li {...props} key={option.uuid}>{option.fullName}{option.departmentName ? ` - ${option.departmentName}` : ''}</li>}
                                        renderInput={parameters => <TextField {...parameters} label="Bezpośredni przełożony" margin="normal" error={supervisorError} helperText={supervisorError ? 'Nie udało się pobrać przełożonych.' : 'Opcjonalnie. Możesz wybrać osobę z dowolnego działu tej firmy.'} />}
                                    />
                                    <Field
                                        as={TextField}
                                        type="date"
                                        name="employmentTo"
                                        label={t('employee.form.field.employmentTo')}
                                        fullWidth
                                        margin="normal"
                                        InputLabelProps={{ shrink: true }}
                                        error={touched.employmentTo && Boolean(errors.employmentTo)}
                                        helperText={touched.employmentTo && errors.employmentTo}
                                    />
                                </Box>

                                {/* Kolumna 3 */}
                                <Box sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#34495e',
                                    },
                                }}>
                                    <Typography sx={{ marginBottom: 1 }}>{t('employee.form.box.addressData')}</Typography>
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="address.country"
                                        label={t('employee.form.field.country')}
                                        variant="outlined"
                                        margin="normal"
                                        error={touched?.address?.country && Boolean(errors?.address?.country)}
                                        helperText={touched?.address?.country && errors?.address?.country}
                                    >
                                        <MenuItem value="Polska">Polska</MenuItem>
                                        <MenuItem value="Anglia">Anglia</MenuItem>
                                        <MenuItem value="Niemcy">Niemcy</MenuItem>
                                    </Field>
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="address.city"
                                        label={t('employee.form.field.city')}
                                        variant="outlined"
                                        margin="normal"
                                        error={touched?.address?.city && Boolean(errors?.address?.city)}
                                        helperText={touched?.address?.city && errors?.address?.city}
                                    >
                                        <MenuItem value="Gdańsk">Gdańsk</MenuItem>
                                        <MenuItem value="Sopot">Sopot</MenuItem>
                                        <MenuItem value="Gdynia">Gdynia</MenuItem>
                                    </Field>
                                    <Field
                                        as={TextField}
                                        name="address.postcode"
                                        label={t('employee.form.field.postcode')}
                                        fullWidth
                                        margin="normal"
                                        error={touched?.address?.postcode && Boolean(errors?.address?.postcode)}
                                        helperText={touched?.address?.postcode && errors?.address?.postcode}
                                    />
                                    <Field
                                        as={TextField}
                                        name="address.street"
                                        label={t('employee.form.field.street')}
                                        fullWidth
                                        margin="normal"
                                        error={touched?.address?.street && Boolean(errors?.address?.street)}
                                        helperText={touched?.address?.street && errors?.address?.street}
                                    />
                                </Box>

                                {/* Kolumna 4 */}
                                <Box sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#34495e',
                                    },
                                }}>
                                    <Typography sx={{ marginBottom: 3 }}>{t('employee.form.box.contactData')}</Typography>
                                    <FieldArray name="phones">
                                        {({ push, remove }) => {
                                            const phonesSectionError =
                                                typeof errors.phones === 'string' && touched.phones;

                                            return (
                                                <Box>
                                                    {values.phones.map((_, index) => (
                                                        <Box key={index} display="flex" alignItems="center" mb={2}>
                                                            <Field
                                                                as={TextField}
                                                                name={`phones[${index}]`}
                                                                type="tel"
                                                                label={`${t('company.form.field.phone')} ${index + 1}`}
                                                                required={index === 0}
                                                                fullWidth
                                                                error={index === 0 && phonesSectionError}
                                                                helperText={
                                                                    index === 0 && phonesSectionError
                                                                        ? errors.phones
                                                                        : index === 0 ? 'Telefon logowania pracownika. Polski numer: 9 cyfr; zagraniczny: z kodem kraju.' : undefined
                                                                }
                                                            />

                                                            {index > 0 && (
                                                                <IconButton
                                                                    onClick={() => remove(index)}
                                                                    color="error"
                                                                    sx={{ ml: 1 }}
                                                                >
                                                                    <RemoveCircleOutlineIcon />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    ))}

                                                    {values.phones.length < MAX_PHONE_FIELDS && (
                                                        <IconButton onClick={() => push('')} color="primary">
                                                            <AddCircleOutlineIcon />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            );
                                        }}
                                    </FieldArray>
                                    <Field
                                        as={TextField}
                                        type="email"
                                        name="email"
                                        required
                                        label={t('employee.form.field.email')}
                                        fullWidth
                                        margin="normal"
                                        error={touched?.email && Boolean(errors?.email)}
                                        helperText={touched?.email && errors?.email}
                                    />
                                </Box>
                            </Box>
                            <Box
                                display="grid"
                                gridTemplateColumns="1fr"
                                gap={2}
                                sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    transition: 'border-color 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#34495e',
                                    },
                                    marginTop: '5px',
                                }}
                            >
                                <Typography sx={{ marginBottom: 1 }}>{t('employee.form.box.systemData')}</Typography>
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
                                            label={t('employee.form.field.active')}
                                            checked={values.active}
                                        />
                                    </Box>
                                    <Box>
                                        <Field
                                            as={TextField}
                                            select
                                            fullWidth
                                            name="roleUUID"
                                            label={t('employee.form.field.role')}
                                            margin="normal"
                                            error={touched?.roleUUID && Boolean(errors?.roleUUID)}
                                            helperText={touched?.roleUUID && errors?.roleUUID}
                                            required
                                        >
                                            {loadingRoles && <MenuItem disabled>{t('common.loading')}</MenuItem>}
                                            {isErrorRoles && <MenuItem disabled>{t('role.list.loading.failed')}</MenuItem>}
                                            {!loadingRoles &&
                                                roles
                                                    .map(r => (
                                                        <MenuItem key={r.uuid} value={r.uuid}>
                                                            {r.name}
                                                        </MenuItem>
                                                    ))}
                                        </Field>
                                    </Box>
                                </Box>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button color="primary" onClick={onClose} variant="contained" >
                                {t('common.button.cancel')}
                            </Button>
                            <Button color="primary" disabled={isSubmitting || generatingPesel} type="submit" variant="contained" sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}>
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default AddEmployeeModal;
