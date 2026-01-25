import React from 'react';
import { useTranslation } from 'react-i18next';

type Contact = {
    type: "phone" | "email" | "website";
    data: string;
    active: boolean;
};

type AdditionalDataProps = {
    data?: Contact[];
};

const AdditionalData: React.FC<AdditionalDataProps> = ({ data }) => {
    const { t } = useTranslation();

    const emails = data?.filter(c => c.type === 'email' && c.active) || [];
    const phones = data?.filter(c => c.type === 'phone' && c.active) || [];

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                <div>
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.email')}
                    </p>
                    {emails.length > 0 ? (
                        emails.map((e, i) => (
                            <p key={i} className="text-xs text-gray-700 font-medium">
                                {e.data}
                            </p>
                        ))
                    ) : (
                        <p className="text-xs text-gray-700 font-medium">{'N/D'}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-4">
                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        {t('employee.form.field.phone')}
                    </p>
                    {phones.length > 0 ? (
                        phones.map((p, i) => (
                            <p key={i} className="text-xs text-gray-700 font-medium">
                                {p.data}
                            </p>
                        ))
                    ) : (
                        <p className="text-xs text-gray-700 font-medium">{'N/D'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdditionalData;
