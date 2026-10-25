import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import Department from '@/app/types/Department';
import { useTranslation } from 'react-i18next';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

const addDepartment = async (department: Department, token: string): Promise<string> => {
    const response = await axios.post(
        `${SERVICE_COMPANY_URL}/api/departments`,
        {
            name: department.name,
            internalCode: department.internalCode,
            companyUUID: department.company.uuid,
            description: department.description,
            parentDepartmentUUID: department.parentDepartment?.uuid !== '' ? department.parentDepartment?.uuid : null,
            active: department.active,
            phones: department.phones.map(phone => phone.trim()).filter(Boolean),
            emails: department.emails.map(email => email.trim()).filter(Boolean),
            websites: department.webs.filter(w => w.trim() !== ""),
            address: department.address,
            createdAt: department.createdAt
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data.message;
};

const useAddDepartmentMutation = () => {
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (department: Department) => {
            const token = localStorage.getItem("auth_token");
            if (!token) throw new Error(t('common.message.tokenIsMissing'));
            return addDepartment(department, token);
        }
    });
};

export default useAddDepartmentMutation;
