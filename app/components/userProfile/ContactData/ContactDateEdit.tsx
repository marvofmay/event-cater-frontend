import React from 'react';
import { useTranslation } from 'react-i18next';
import Contact from '@/app/types/Contact';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import useUpdateEmployeeContactsMutation from '@/app/hooks/userProfile/useUpdateEmployeeContactsMutation';

interface ContactDataEditProps {
    contacts: Contact[];
    onCancel: () => void;
    onSaved: () => void;
}

const ContactDataEdit: React.FC<ContactDataEditProps> = ({ contacts, onCancel, onSaved }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const updateContactsMutation = useUpdateEmployeeContactsMutation();

    const [email] = React.useState(
        contacts.find(c => c.type === 'email')?.data ?? ''
    );

    const initialPhones = contacts
        .filter(c => c.type === 'phone')
        .slice(0, 3)
        .map(p => p.data);

    const [phones, setPhones] = React.useState<string[]>(
        initialPhones.length > 0 ? initialPhones : ['']
    );

    const [loading, setLoading] = React.useState(false);

    const handlePhoneChange = (index: number, value: string) => {
        const newPhones = [...phones];
        newPhones[index] = value;
        setPhones(newPhones);
    };

    const handleAddPhone = () => {
        if (phones.length < 3) setPhones([...phones, '']);
    };

    const handleRemovePhone = (index: number) => {
        if (phones.length > 1) setPhones(phones.filter((_, i) => i !== index));
    };

    const handleSave = async (): Promise<void> => {
        setLoading(true);

        return new Promise((resolve, reject) => {
            updateContactsMutation.mutate(
                { phones },
                {
                    onSuccess: async (message: string) => {
                        toast.success(message);

                        await queryClient.invalidateQueries({
                            queryKey: ['user_profile_data'],
                        });

                        onSaved();
                        setLoading(false);
                        resolve();
                    },
                    onError: (error) => {
                        toast.error(t('profile.update.error'));
                        setLoading(false);
                        reject(error);
                    },
                }
            );
        });
    };

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="flex flex-col gap-2">
                    {email}
                    {/* <input
                        type="text"
                        value={email}
                        readOnly
                        className="px-3 py-2 border rounded-md text-sm bg-gray-100 cursor-not-allowed"
                        placeholder={t('employee.form.field.email')}
                    /> */}


                    {phones.map((p, i) => (
                        <input
                            key={i}
                            type="text"
                            value={p}
                            onChange={(e) => handlePhoneChange(i, e.target.value)}
                            className="px-3 py-2 border rounded-md text-sm"
                            placeholder={t('employee.form.field.phone')}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-2 justify-start items-center mt-[38px]">
                    {phones.map((_, i) => (
                        <Tooltip key={i} title={t('common.button.remove')}>
                            <span>
                                <IconButton
                                    onClick={() => handleRemovePhone(i)}
                                    color="error"
                                    disabled={phones.length === 1}
                                >
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}

                    {phones.length < 3 && (
                        <Tooltip title={t('common.button.addPhone')}>
                            <IconButton onClick={handleAddPhone} color="primary">
                                <AddCircleOutlineIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
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

export default ContactDataEdit;
