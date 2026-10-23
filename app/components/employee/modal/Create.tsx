import React, { useState } from 'react';
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
import useEmployeesQuery from '@/app/hooks/employee/useEmployeesQuery';
import useCompaniesQuery from '@/app/hooks/company/useCompaniesQuery';
import useDepartmentsQuery from '@/app/hooks/department/useDepartmentsQuery';
import EmployeePayload from '@/app/types/EmployeePayload';

interface AddEmployeeModalProps {
    open: boolean;
    onClose: () => void;
    onAddEmployee: (newEmployee: EmployeePayload) => Promise<void>;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ open, onClose, onAddEmployee }) => {
    const { t } = useTranslation();

    const MAX_PHONE_FIELDS = 3;

    const initialValues: EmployeePayload = {
        firstName: '',
        lastName: '',
        pesel: '',
        internalCode: '',
        externalCode: '',
        companyUUID: '',
        departmentUUID: '',
        parentEmployeeUUID: '',
        positionUUID: '',
        contractTypeUUID: '',
        roleUUID: '',
        contacts: [],
        email: '',
        phones: [""],
        webs: [""],
        employmentFrom: new Date().toISOString().slice(0, 10),
        active: true,
        address: {
            country: '',
            city: '',
            postcode: '',
            street: '',
        },
        employmentTo: '',
        createdAt: '',
        updatedAt: '',
        deletedAt: ''
    };

    const validationSchema = Yup.object({
        firstName: Yup.string().required(t('validation.fieldIsRequired')),
        lastName: Yup.string().required(t('validation.fieldIsRequired')),
        pesel: Yup.string()
            .required(t('validation.fieldIsRequired'))
            .matches(/^\d{11}$/, t('validation.peselMustHave11Digits')),
        email: Yup
            .string()
            .email(t('validation.invalidEmail'))
            .required(t('validation.fieldIsRequired')),
        employmentFrom: Yup.string().required(t('validation.fieldIsRequired')),
        company: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        department: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        contractType: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        position: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        role: Yup.object().shape({
            uuid: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        address: Yup.object().shape({
            country: Yup.string().required(t('validation.fieldIsRequired')),
            city: Yup.string().required(t('validation.fieldIsRequired')),
            postcode: Yup.string().required(t('validation.fieldIsRequired')),
            street: Yup.string().required(t('validation.fieldIsRequired')),
        }),
        phones: Yup.array()
            .of(Yup.string().trim())
            .compact(v => !v)
            .min(1, t('validation.atLeastOnePhoneIsRequired')),
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: EmployeePayload, formikHelpers: FormikHelpers<EmployeePayload>) => {
        const employeeData = {
            ...values,
        };

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

    const [selectedCompanyUUID, setSelectedCompanyUUID] = useState<string | null>(null);

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

    const {
        data: dataEmployees,
        isLoading: loadingEmployees,
        isError: isErrorEmployees
    } = useEmployeesQuery(
        1000,
        1,
        'lastName',
        'asc',
        null,
        'department'
    );

    const employees = dataEmployees?.items.map(({ uuid, lastName, firstName, department }) => ({
        uuid,
        lastName,
        firstName,
        department: {
            uuid: department.uuid,
        }
    })) ?? [];


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
            <DialogTitle
                sx={{
                    backgroundColor: '#34495e',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                }}
            >
                {t('employee.modal.add.title')}
            </DialogTitle>
            <Formik<EmployeePayload>
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue }) => (
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
                                        required
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
                                        value={values.employmentFrom}
                                        label={t('employee.form.field.employmentFrom')}
                                        fullWidth
                                        margin="normal"
                                        InputLabelProps={{ shrink: true }}
                                        error={touched.employmentFrom && Boolean(errors.employmentFrom)}
                                        helperText={touched.employmentFrom && errors.employmentFrom}
                                        required
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
                                            const uuid = value?.uuid ?? null;
                                            setFieldValue('companyUUID', uuid);
                                            setSelectedCompanyUUID(uuid);
                                            setFieldValue('departmentUUID', null);
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
                                                error={isErrorCompanies}
                                                helperText={
                                                    isErrorCompanies
                                                        ? t('company.list.loading.failed')
                                                        : undefined
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
                                                value?.uuid ?? null
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
                                                error={isErrorDepartments}
                                                helperText={
                                                    !values.companyUUID
                                                        ? t('department.form.selectCompanyFirst')
                                                        : isErrorDepartments
                                                            ? t('department.list.loading.failed')
                                                            : undefined
                                                }
                                            />
                                        )}
                                    />
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="position.uuid"
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
                                    {/* 
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="contractType.uuid"
                                        label={t('employee.form.field.contractType')}
                                        margin="normal"
                                        error={touched?.contractType?.uuid && Boolean(errors?.contractType?.uuid)}
                                        helperText={touched?.contractType?.uuid && errors?.contractType?.uuid}
                                        required
                                    >
                                        {loadingContractTypes && <MenuItem disabled>{t('common.loading')}</MenuItem>}
                                        {isErrorContractTypes && <MenuItem disabled>{t('contractType.list.loading.failed')}</MenuItem>}
                                        {!loadingContractTypes && contractTypes.map(contractType => (
                                            <MenuItem key={contractType.uuid} value={contractType.uuid}>
                                                {contractType.name}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                    <Field
                                        as={TextField}
                                        select
                                        fullWidth
                                        name="parentEmployee.uuid"
                                        label={t('employee.form.field.parentEmployee')}
                                        margin="normal"
                                        disabled={!values.department.uuid}
                                    >
                                        <MenuItem value="">
                                            — {t('common.lack')} —
                                        </MenuItem>
                                        {loadingEmployees && <MenuItem disabled>{t('common.loading')}</MenuItem>}
                                        {isErrorEmployees && <MenuItem disabled>{t('employee.list.loading.failed')}</MenuItem>}
                                        {!loadingEmployees && employees
                                            .filter(ppe => ppe.department.uuid === values.department.uuid)
                                            .map(ppe => (
                                                <MenuItem key={ppe.uuid} value={ppe.uuid}>
                                                    {ppe.lastName} {ppe.firstName}
                                                </MenuItem>
                                            ))}
                                    </Field> */}
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
                                        required
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
                                        required
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
                                        required
                                    />
                                    <Field
                                        as={TextField}
                                        name="address.street"
                                        label={t('employee.form.field.street')}
                                        fullWidth
                                        margin="normal"
                                        error={touched?.address?.street && Boolean(errors?.address?.street)}
                                        helperText={touched?.address?.street && errors?.address?.street}
                                        required
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
                                                                fullWidth
                                                                error={index === 0 && phonesSectionError}
                                                                helperText={
                                                                    index === 0 && phonesSectionError
                                                                        ? errors.phones
                                                                        : undefined
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
                                        label={t('employee.form.field.email')}
                                        fullWidth
                                        margin="normal"
                                        error={touched?.email && Boolean(errors?.email)}
                                        helperText={touched?.email && errors?.email}
                                        required
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
                            <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#999a99', color: 'white', fontWeight: 'bold' }}>
                                {t('common.button.cancel')}
                            </Button>
                            <Button type="submit" variant="contained" sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}>
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
