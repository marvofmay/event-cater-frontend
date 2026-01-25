import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';
import { useTranslation } from 'react-i18next';
import { UserProfileDataResponse } from '@/app/types/UserProfileDataResponse';


const fetchUserData = async (token: string): Promise<UserProfileDataResponse> => {
    try {
        const response = await axios.get(`${SERVICE_COMPANY_URL}/api/me/data`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return {
            data: response.data.data,
        };
    } catch (error) {
        console.error(error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            window.location.href = '/user/logout';
        }
        throw error;
    }
};


const useUserProfileDataQuery = (enabled = true) => {
    const { t } = useTranslation();

    return useQuery<UserProfileDataResponse>({
        queryKey: ['user_profile_data'],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error(t('common.message.tokenIsMissing'));

            return fetchUserData(token);
        },
        enabled,
        retry: false,
    });
};

export default useUserProfileDataQuery;
