import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

export interface UpdateEmployeePersonalDataPayload {
    firstName: string;
    lastName: string;
}

const updateEmployeePersonalData = async (
    payload: UpdateEmployeePersonalDataPayload,
    token: string
): Promise<string> => {
    try {
        const response = await axios.patch(
            `${SERVICE_COMPANY_URL}/api/me/personal`,
            {
                firstName: payload.firstName,
                lastName: payload.lastName,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.message;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            window.location.href = '/user/logout';
        }

        throw error;
    }
};

const useUpdateEmployeePersonalDataMutation = () => {
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (payload: UpdateEmployeePersonalDataPayload) => {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                throw new Error(t('common.message.tokenIsMissing'));
            }

            return updateEmployeePersonalData(payload, token);
        },
    });
};

export default useUpdateEmployeePersonalDataMutation;
