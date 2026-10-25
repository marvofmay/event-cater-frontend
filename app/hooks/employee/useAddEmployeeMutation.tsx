import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';
import EmployeePayload from '@/app/types/EmployeePayload';

const addEmployee = async (employee: EmployeePayload, token: string): Promise<string> => {
    const response = await axios.post(
        `${SERVICE_COMPANY_URL}/api/employees`,
        {
            firstName: employee.firstName,
            lastName: employee.lastName.trim(),
            pesel: employee.pesel,
            isPeselFake: employee.isPeselFake ?? false,
            employmentFrom: employee.employmentFrom,
            companyUUID: employee.companyUUID,
            departmentUUID: employee.departmentUUID,
            positionUUID: employee.positionUUID,
            contractTypeUUID: employee.contractTypeUUID,
            roleUUID: employee.roleUUID,
            email: employee.email.trim(),
            address: employee.address,
            externalCode: employee.externalCode,
            internalCode: employee.internalCode,
            active: employee.active,
            phones: employee.phones.map(phone => phone.trim()).filter(Boolean),
            parentEmployeeUUID: employee.parentEmployeeUUID !== '' ? employee.parentEmployeeUUID : null,
            employmentTo: employee.employmentTo
        },
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
