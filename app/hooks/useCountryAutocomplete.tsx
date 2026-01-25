// hooks/useCountryAutocomplete.ts
import { useField, useFormikContext } from 'formik';
import { TextField, Autocomplete } from '@mui/material';
import { getCountries } from '@/app/utils/countries';
import { useTranslation } from 'react-i18next';

interface UseCountryAutocompleteProps {
    name: string;
    label?: string;
    required?: boolean;
    margin?: 'none' | 'dense' | 'normal';
}

export const useCountryAutocomplete = ({ name, label, required, margin }: UseCountryAutocompleteProps) => {
    const { t } = useTranslation();
    const countries = getCountries(t);

    const { setFieldValue, values } = useFormikContext<any>();
    const [field, meta] = useField(name);

    const countryValue = countries.find(c => c.label === field.value) || null;

    const AutocompleteField = (
        <Autocomplete
            options={countries}
            getOptionLabel={(option) => option.label}
            value={countryValue}
            onChange={(_, value) => setFieldValue(name, value ? value.label : '')}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    margin={margin}
                    required={required}
                    error={meta.touched && Boolean(meta.error)}
                    helperText={meta.touched && meta.error}
                    fullWidth
                />
            )}
        />
    );

    return AutocompleteField;
};
