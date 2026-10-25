import React, { useMemo, useState } from 'react';
import { Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox, MenuItem, IconButton, FormControlLabel, Box, Typography } from '@mui/material';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import Company from '../../../types/Company';
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { getCountries } from '@/app/utils/countries';
import CompanyOption from '@/app/types/CompanyOption';
import { useIndustryOptions } from '@/app/hooks/industry/useIndustryOptions';
import useParentCompanyOptionsQuery from '@/app/hooks/company/useParentCompanyOptionsQuery';

interface EditCompanyModalProps {
    open: boolean;
    onClose: () => void;
    company: Company | null;
    onSave: (updatedCompany: Company) => Promise<void>;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ open, onClose, company, onSave }) => {
    const { t } = useTranslation();

    const countries = getCountries(t);

    const currentCompanyUUID = company?.uuid ?? '';

    const MAX_PHONE_FIELDS = 3;
    const MAX_EMAIL_FIELDS = 3;
    const MAX_WEB_FIELDS = 3;

    const getContactsByType = (type: "phone" | "email" | "website"): string[] => {
        const contacts = company?.contacts?.filter(c => c.type === type).map(c => c.data) || [];
        return contacts.length > 0 ? contacts : [""];
    };

    const initialValues: Company = {
        uuid: company?.uuid || '',
        fullName: company?.fullName || '',
        shortName: company?.shortName || '',
        internalCode: company?.internalCode || '',
        nip: company?.nip || '',
        regon: company?.regon || '',
        description: company?.description || '',
        industry: company?.industry
            ? { uuid: company.industry.uuid, name: company.industry.name }
            : { uuid: '', name: '' },
        parentCompany: company?.parentCompany
            ? {
                uuid: company.parentCompany.uuid,
                fullName: company.parentCompany.fullName,
                shortName: company.parentCompany.shortName,
                nip: company.parentCompany.nip,
                regon: company.parentCompany.regon,
            }
            : null,
        address: company?.address
            ? {
                country: company.address.country,
                city: company.address.city,
                postcode: company.address.postcode,
                street: company.address.street,
            }
            : { country: '', city: '', postcode: '', street: '' },
        contacts: company?.contacts || [],
        phones: getContactsByType("phone"),
        emails: getContactsByType("email"),
        webs: getContactsByType("website"),
        active: company?.active ?? true,
        createdAt: company?.createdAt || '',
        updatedAt: company?.updatedAt || '',
        deletedAt: company?.deletedAt || '',
    };

    const validationSchema = Yup.object({
        fullName: Yup.string().required(t('validation.fieldIsRequired')),
        nip: Yup.string().required(t('validation.fieldIsRequired')),
        regon: Yup.string().required(t('validation.fieldIsRequired')),
        internalCode: Yup.string().required(t('validation.fieldIsRequired')),
        industry: Yup.object().shape({
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
                    .email(t('validation.invalidEmail'))
                    .nullable()
            )
    });

    const {
        options: industries,
        isLoading: loadingIndustries,
        isError: isErrorIndustries
    } = useIndustryOptions({
        pageSize: 1000,
        page: 1,
        sortBy: 'name',
        sortDirection: 'asc'
    });

    const {
        data,
        isLoading: loadingCompanies,
        isError: isErrorCompanies,
    } = useParentCompanyOptionsQuery(currentCompanyUUID);

    const companies =
        data?.data.map(company => ({
            uuid: company.uuid,
            fullName: company.fullName,
        })) ?? [];

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: Company) => {
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            if (company) {
                const updatedCompany = {
                    ...company,
                    ...values,
                }
                await onSave(updatedCompany);
                onClose();
            }

        } catch (error: unknown) {
            const err = error as any;

            const message = err?.response?.data?.message ?? 'Wystąpił nieznany błąd';
            const errors = err?.response?.data?.errors ?? null;

            setErrorAPI(message);
            setErrorsAPI(errors);
        }
    }

    return (
        <>
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
                <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {t('company.modal.edit.title')}
                </DialogTitle>
                <Formik<Company>
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ values, errors, touched, setFieldValue, handleChange }) => {
                        const industryError = touched.industry?.uuid && Boolean(errors.industry?.uuid);

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
                                            <Typography sx={{ marginBottom: 1 }}>{t('company.form.box.mainData')}</Typography>
                                            <Field
                                                as={TextField}
                                                name="fullName"
                                                label={t('company.form.field.fullName')}
                                                value={values.fullName}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched.fullName && Boolean(errors.fullName)}
                                                helperText={touched.fullName && errors.fullName}
                                                required
                                            />
                                            <Field
                                                as={TextField}
                                                name="shortName"
                                                label={t('company.form.field.shortName')}
                                                value={values.shortName}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched.shortName && Boolean(errors.shortName)}
                                                helperText={touched.shortName && errors.shortName}
                                            />
                                            <Field
                                                as={TextField}
                                                name="internalCode"
                                                label={t('company.form.field.internalCode')}
                                                value={values.internalCode}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched.internalCode && Boolean(errors.internalCode)}
                                                helperText={touched.internalCode && errors.internalCode}
                                                required
                                            />
                                            <Field
                                                as={TextField}
                                                name="nip"
                                                label={t('company.form.field.nip')}
                                                value={values.nip}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched.nip && Boolean(errors.nip)}
                                                helperText={touched.nip && errors.nip}
                                                required
                                            />
                                            <Field
                                                as={TextField}
                                                name="regon"
                                                label={t('company.form.field.regon')}
                                                value={values.regon}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched.regon && Boolean(errors.regon)}
                                                helperText={touched.regon && errors.regon}
                                                required
                                            />
                                            <Autocomplete
                                                options={industries}
                                                loading={loadingIndustries}
                                                getOptionLabel={(o) => o.name}
                                                isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                                                popupIcon={<ArrowDropDownIcon />}
                                                noOptionsText={
                                                    isErrorIndustries
                                                        ? t('industry.list.loading.failed')
                                                        : t('common.noOptions')
                                                }
                                                value={
                                                    industries.find(i => i.uuid === values.industry?.uuid) || null
                                                }
                                                onChange={(_, value) => {
                                                    setFieldValue(
                                                        'industry.uuid',
                                                        value ? value.uuid : null
                                                    );
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={t('company.form.field.industry')}
                                                        margin="dense"
                                                        required
                                                        error={industryError}
                                                        helperText={
                                                            industryError ? errors.industry?.uuid : undefined
                                                        }
                                                    />
                                                )}
                                            />
                                            <Field
                                                as={TextField}
                                                name="description"
                                                label={t('company.form.field.description')}
                                                value={values.description}
                                                onChange={handleChange}
                                                multiline
                                                rows={5}
                                                fullWidth
                                                margin="dense"
                                                error={touched.description && Boolean(errors.description)}
                                                helperText={touched.description && errors.description}
                                            />
                                            <Autocomplete<CompanyOption, false, false, false>
                                                options={companies}
                                                loading={loadingCompanies}
                                                getOptionLabel={(option) => option.fullName}
                                                noOptionsText={
                                                    isErrorCompanies
                                                        ? t('company.list.loading.failed')
                                                        : t('common.noOptions')
                                                }
                                                isOptionEqualToValue={(option, value) =>
                                                    option.uuid === value.uuid
                                                }
                                                popupIcon={<ArrowDropDownIcon />}
                                                value={
                                                    companies.find(c => c.uuid === values.parentCompany?.uuid) || null
                                                }

                                                onChange={(_, value) => {
                                                    setFieldValue(
                                                        'parentCompany.uuid',
                                                        value ? value.uuid : null
                                                    );
                                                }}

                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={t('company.form.field.parentCompany')}
                                                        margin="dense"
                                                        fullWidth
                                                    />
                                                )}
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
                                            <Typography sx={{ marginBottom: 1 }}>{t('company.form.box.addressData')}</Typography>
                                            <Autocomplete
                                                options={countries}
                                                getOptionLabel={(option) => option.label}
                                                value={
                                                    countries.find(c => c.label === values.address?.country) || null
                                                }
                                                onChange={(_, value) => {
                                                    setFieldValue('address.country', value ? value.label : '');
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={t('company.form.field.country')}
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
                                                select
                                                fullWidth
                                                name="address.city"
                                                label={t('department.form.field.city')}
                                                value={values.address?.city}
                                                onChange={handleChange}
                                                variant="outlined"
                                                margin="dense"
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
                                                label={t('department.form.field.postcode')}
                                                value={values.address?.postcode}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched?.address?.postcode && Boolean(errors?.address?.postcode)}
                                                helperText={touched?.address?.postcode && errors?.address?.postcode}
                                                required
                                            />
                                            <Field
                                                as={TextField}
                                                name="address.street"
                                                label={t('company.form.field.street')}
                                                value={values.address?.street}
                                                onChange={handleChange}
                                                fullWidth
                                                margin="dense"
                                                error={touched?.address?.street && Boolean(errors?.address?.street)}
                                                helperText={touched?.address?.street && errors?.address?.street}
                                                required
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
                                            <Typography sx={{ marginBottom: 3 }}>{t('company.form.box.additionalData')}</Typography>
                                            <Box sx={{ marginBottom: 8 }}>
                                                <FieldArray name="phones">
                                                    {({ push, remove }) => (
                                                        <Box>
                                                            {values.phones.map((_, index) => (
                                                                <Box key={index} display="flex" alignItems="center" mb={2}>
                                                                    <Field
                                                                        as={TextField}
                                                                        name={`phones[${index}]`}
                                                                        type="tel"
                                                                        label={`${t('company.form.field.phone')} ${index + 1}`}
                                                                        fullWidth
                                                                        error={Boolean(
                                                                            (touched.phones as boolean[] | undefined)?.[index] &&
                                                                            (errors.phones as string[] | undefined)?.[index]
                                                                        )}
                                                                        helperText={
                                                                            (touched.phones as boolean[] | undefined)?.[index] &&
                                                                            (errors.phones as string[] | undefined)?.[index]
                                                                        }
                                                                    //required={index === 0}
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
                                                                <Box display="flex" alignItems="center">
                                                                    <IconButton onClick={() => push('')} color="primary">
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                    <Typography variant="body2" ml={1}>
                                                                        {t('common.addAnotherPhone')}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </FieldArray>
                                            </Box>
                                            <Box sx={{ marginBottom: 8 }}>
                                                <FieldArray name="emails">
                                                    {({ push, remove }) => (
                                                        <Box>
                                                            {values.emails.map((_, index) => (
                                                                <Box key={index} display="flex" alignItems="center" mb={2}>
                                                                    <Field
                                                                        as={TextField}
                                                                        name={`emails[${index}]`}
                                                                        type="email"
                                                                        label={`${t('company.form.field.email')} ${index + 1}`}
                                                                        fullWidth
                                                                        error={Boolean(
                                                                            (touched.emails as boolean[] | undefined)?.[index] &&
                                                                            (errors.emails as string[] | undefined)?.[index]
                                                                        )}
                                                                        helperText={
                                                                            (touched.emails as boolean[] | undefined)?.[index] &&
                                                                            (errors.emails as string[] | undefined)?.[index]
                                                                        }
                                                                    //required={index === 0}
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

                                                            {values.emails.length < MAX_EMAIL_FIELDS && (
                                                                <Box display="flex" alignItems="center">
                                                                    <IconButton onClick={() => push('')} color="primary">
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                    <Typography variant="body2" ml={1}>
                                                                        {t('common.addAnotherEmail')}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </FieldArray>
                                            </Box>
                                            <Box>
                                                <FieldArray name="webs">
                                                    {({ push, remove }) => (
                                                        <Box>
                                                            {values.webs.map((_, index) => (
                                                                <Box key={index} display="flex" alignItems="center" mb={2}>
                                                                    <Field
                                                                        as={TextField}
                                                                        name={`webs[${index}]`}
                                                                        label={`${t('company.form.field.web')} ${index + 1}`}
                                                                        fullWidth
                                                                        error={Boolean(
                                                                            (touched.webs as boolean[] | undefined)?.[index] &&
                                                                            (errors.webs as string[] | undefined)?.[index]
                                                                        )}
                                                                        helperText={
                                                                            (touched.webs as boolean[] | undefined)?.[index] &&
                                                                            (errors.webs as string[] | undefined)?.[index]
                                                                        }
                                                                    //required={index === 0}
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

                                                            {values.webs.length < MAX_WEB_FIELDS && (
                                                                <Box display="flex" alignItems="center">
                                                                    <IconButton onClick={() => push('')} color="primary">
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                    <Typography variant="body2" ml={1}>
                                                                        {t('common.addAnotherWeb')}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </FieldArray>
                                            </Box>
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
                                        <Typography sx={{ marginBottom: 1 }}>{t('company.form.box.systemData')}</Typography>
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
                                                    label={t('company.form.field.active')}
                                                    checked={values.active}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
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
                        )
                    }}
                </Formik>
            </Dialog >
        </>
    );
};

export default EditCompanyModal;
