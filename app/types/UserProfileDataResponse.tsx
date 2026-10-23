export interface UserProfileDataResponse {
    data: {
        userUUID: string;
        email: string;
        employee?: {
            uuid: string;
            firstName: string;
            lastName: string;
            employment: {
                position: string;
                role: string;
                contractType: string;
                employmentFrom: string;
                employmentTo: string | null;
                parentEmployee: string | null;
            }
            address?: {
                street: string;
                postcode: string;
                city: string;
                country: string;
            };
            contacts: {
                type: 'phone' | 'email' | 'website';
                data: string;
                active: boolean;
            }[];
            avatar: {
                avatarType: 'default' | 'custom';
                avatarPath?: string | null;
            }
        };
    };
}
