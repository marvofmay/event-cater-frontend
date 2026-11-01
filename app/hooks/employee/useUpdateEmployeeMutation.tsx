import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import EmployeePayload from '@/app/types/EmployeePayload';
import { employeeRequestPayload } from '@/app/utils/employeeRequestPayload';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';
import { useTranslation } from 'react-i18next';
import { notifyCompanyStructureChanged } from '@/app/utils/companyStructureChanges';

const useUpdateEmployeeMutation = () => {
    const { t } = useTranslation();

    return useMutation({
        onSuccess: notifyCompanyStructureChanged,
        mutationFn: async (employee: EmployeePayload): Promise<string> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error(t('common.message.tokenIsMissing'));
            if (!employee.uuid) throw new Error('Brak identyfikatora pracownika.');
            const response = await axios.put(`${SERVICE_COMPANY_URL}/api/employees/${encodeURIComponent(employee.uuid)}`, employeeRequestPayload(employee), {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            return response.data.message;
        },
    });
};

export default useUpdateEmployeeMutation;
