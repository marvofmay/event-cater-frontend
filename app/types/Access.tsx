export default interface Access {
    uuid: string;
    name: string;
    description?: string | null;
    module: {
        uuid: string;
        name: string;
    };
    permissions?: PermissionRef[];
    availablePermissions?: PermissionRef[];
}

export interface PermissionRef {
    uuid: string;
    name: string;
}
