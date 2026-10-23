import useUpdateEmployeeAddressMutation from '@/app/hooks/userProfile/useUpdateEmployeeAddressMutation';
import Address from '@/app/types/Address';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useQueryClient } from "@tanstack/react-query";

const AddressMainDataEdit: React.FC<{
    address: Address;
    onCancel: () => void;
    onSaved: () => void;
}> = ({ address, onCancel, onSaved }) => {
    const { t } = useTranslation();

    const [street, setStreet] = React.useState(address.street ?? '');
    const [postcode, setPostcode] = React.useState(address.postcode ?? '');
    const [city, setCity] = React.useState(address.city ?? '');
    const [country, setCountry] = React.useState(address.country ?? '');
    const [loading, setLoading] = React.useState(false);

    const queryClient = useQueryClient();

    const updateAddressMutation = useUpdateEmployeeAddressMutation();

    const handleSave = async (): Promise<void> => {
        setLoading(true);
        return new Promise((resolve, reject) => {
            updateAddressMutation.mutate(
                { street, postcode, city, country },
                {
                    onSuccess: async (message: string) => {
                        toast.success(message);

                        await queryClient.invalidateQueries({
                            queryKey: ['user_profile_data'],
                        });

                        onSaved();
                        resolve();
                    },
                    onError: (error) => {
                        toast.error(t('user.data.address.update.error'));
                        reject(error);
                    },
                }
            );
        });
    };

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    placeholder={t('employee.form.field.street')}
                />
                <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    placeholder={t('employee.form.field.postcode')}
                />
                <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    placeholder={t('employee.form.field.city')}
                />
                <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    placeholder={t('employee.form.field.country')}
                />
            </div>

            <div className="mt-4 flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-md text-sm font-bold bg-gray-400 text-white hover:bg-gray-500 transition"
                >
                    {t('common.button.cancel')}
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="
                        px-4 py-2 rounded-md text-sm font-bold
                        bg-slate-700 text-white
                        hover:bg-slate-800
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition
                    "
                >
                    {t('common.button.save')}
                </button>
            </div>
        </div>
    );
};

export default AddressMainDataEdit;
