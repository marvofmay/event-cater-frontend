import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';
import EmployeePayload from '@/app/types/EmployeePayload';
import { employeeRequestPayload } from '@/app/utils/employeeRequestPayload';

const addEmployee = async (employee: EmployeePayload, token: string): Promise<string> => {
    const response = await axios.post(
        `${SERVICE_COMPANY_URL}/api/employees`,
        employeeRequestPayload(employee),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return response.data.message;
};

const useAddEmployeeMutation = () => {
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (employee: EmployeePayload) => {
            const token = localStorage.getItem("auth_token");
            if (!token) throw new Error(t('common.message.tokenIsMissing'));

            return addEmployee(employee, token);
        }
    });
};

export default useAddEmployeeMutation;
