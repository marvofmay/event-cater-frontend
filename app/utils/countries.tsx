export const getCountries = (t: (key: string) => string) => {
    const countries = [
        { code: 'PL', label: t('country.poland') },
        { code: 'UK', label: t('country.england') },
        { code: 'DE', label: t('country.germany') },
        { code: 'FR', label: t('country.france') },
        { code: 'UA', label: t('country.ukraine') },
        { code: 'I', label: t('country.italy') },
    ];

    const sorted = countries
        .filter(c => c.label !== t('country.poland'))
        .sort((a, b) => a.label.localeCompare(b.label));

    return [
        ...countries.filter(c => c.label === t('country.poland')),
        ...sorted,
    ];
};