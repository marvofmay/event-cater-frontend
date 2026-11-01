import type { PreferenceResource } from '@/app/context/preferencesContext';

const accesses: Record<PreferenceResource, string> = {
    companies: 'companies', departments: 'departments', employees: 'employees', positions: 'positions',
    roles: 'roles', contractTypes: 'contract_types', industries: 'industries', notifications: 'notifications',
};

export function canConfigureListPreference(resource: PreferenceResource, hasAccess: (access: string) => boolean, hasPermission: (permission: string) => boolean): boolean {
    const access = accesses[resource];
    return (resource === 'notifications' || hasAccess('manage')) && hasAccess(access) && hasPermission(access + '.list');
}
