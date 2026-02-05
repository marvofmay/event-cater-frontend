import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import Contact from '@/app/types/Contact';

interface ContactDataViewProps {
    contacts: Contact[];
    onEdit: () => void;
}

const ContactDataView: React.FC<ContactDataViewProps> = ({ contacts, onEdit }) => {
    const { t } = useTranslation();

    const email = contacts.find(c => c.type === 'email' && c.active);
    const phones = contacts.filter(c => c.type === 'phone' && c.active).slice(0, 3);

    return (
        <div className="p-4 bg-white shadow-md rounded-lg relative">
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.email')}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">
                        {email ? email.data : 'N/D'}
                    </p>
                </div>

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
                        <p className="text-xs text-gray-700 font-medium">N/D</p>
                    )}
                </div>
            </div>

            <div className="absolute top-3 right-3">
                <Tooltip title={t('common.edit')}>
                    <button
                        onClick={onEdit}
                        className="
                            p-2 rounded-full
                            text-gray-500 hover:text-blue-600
                            hover:bg-blue-50
                            transition
                        "
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default ContactDataView;
