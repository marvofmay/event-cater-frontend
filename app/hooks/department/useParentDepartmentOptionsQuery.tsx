import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

export interface ParentDepartmentOption {
    uuid: string;
    name: string;
}

export interface ParentDepartmentOptionsResponse {
    data: ParentDepartmentOption[];
}

const fetchParentDepartmentOptions = async (
    token: string,
    companyUUID: string | null,
    departmentUUID?: string | null
): Promise<ParentDepartmentOptionsResponse> => {
    try {
        const params: Record<string, string> = {};

        if (companyUUID) {
            params.companyUUID = companyUUID;
        }
        if (departmentUUID) {
            params.departmentUUID = departmentUUID;
        }

        const response = await axios.get(
            `${SERVICE_COMPANY_URL}/api/departments/parent-options`,
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

const useParentDepartmentOptionsQuery = (companyUUID: string | null, departmentUUID?: string) => {
    const { t } = useTranslation();

    return useQuery<ParentDepartmentOptionsResponse>({
        queryKey: ['parentDepartmentOptions', companyUUID, departmentUUID ?? ''],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error(t('common.message.tokenIsMissing'));
            }

            return fetchParentDepartmentOptions(token, companyUUID, departmentUUID);
        },
        enabled: !!companyUUID
    });
};

export default useParentDepartmentOptionsQuery;
