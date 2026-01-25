export interface UserProfileDataResponse {
    data: {
        userUUID: string;
        email: string;
        employee?: {
            uuid: string;
            firstName: string;
            lastName: string;
            position: string;
            role: string;
            contractType: string;
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
        };
    };
}
