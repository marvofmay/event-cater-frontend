import Address from '@/app/types/Address';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { DataField } from '../DataField';

const AddressDataView: React.FC<{
    address: Address;
    onEdit: () => void;
}> = ({ address, onEdit }) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 bg-white shadow-md rounded-lg relative">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <DataField
                    label={t('employee.form.field.street')}
                    value={address.street}
                />
                <DataField
                    label={t('employee.form.field.postcode')}
                    value={address.postcode}
                />
                <DataField
                    label={t('employee.form.field.city')}
                    value={address.city}
                />
                <DataField
                    label={t('employee.form.field.country')}
                    value={address.country}
                />
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

export default AddressDataView;
