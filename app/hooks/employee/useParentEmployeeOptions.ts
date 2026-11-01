import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/app/context/userContext';

export interface ParentEmployeeOption { uuid: string; fullName: string; departmentName?: string }

export default function useParentEmployeeOptions(companyUUID: string | null, employeeUUID?: string) {
    const { token } = useUser();
    return useQuery({
        queryKey: ['parentEmployeeOptions', token, companyUUID, employeeUUID],
        queryFn: async ({ signal }): Promise<ParentEmployeeOption[]> => {
            const parameters = new URLSearchParams({ companyUUID: companyUUID! });
            if (employeeUUID) parameters.set('employeeUUID', employeeUUID);
            const response = await fetch(`/api/employees/parent-options?${parameters}`, { signal, headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error('Nie udało się pobrać przełożonych.');
            return (await response.json()).data;
        },
        enabled: Boolean(token && companyUUID), staleTime: 30000, retry: false,
    });
}
