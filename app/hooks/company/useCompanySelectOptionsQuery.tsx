import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

export interface CompanySelectOption {
    uuid: string;
    fullName: string;
}

export interface CompanySelectOptionsResponse {
    data: CompanySelectOption[];
}

const fetchCompanySelectOptions = async (
    token: string,
    companyUUID?: string
): Promise<CompanySelectOptionsResponse> => {
    try {
        const params: Record<string, string> = {};

        if (companyUUID) {
            params.companyUUID = companyUUID;
        }

        const response = await axios.get(
            `${SERVICE_COMPANY_URL}/api/companies/select-options`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params,
            }
        );


        return response.data;
    } catch (error) {
        console.error(error);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
            window.location.href = '/user/logout';
        }

        throw error;
    }
};

const useCompanySelectOptionsQuery = (companyUUID?: string) => {
    const { t } = useTranslation();

    return useQuery<CompanySelectOptionsResponse>({
        queryKey: ['parentCompanyOptions', companyUUID ?? ''],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error(t('common.message.tokenIsMissing'));
            }

            return fetchCompanySelectOptions(token, companyUUID);
        },
    });
};

export default useCompanySelectOptionsQuery;
