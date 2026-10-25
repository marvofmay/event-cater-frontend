import Address from "./Address";

export default interface EmployeePayload {
    uuid?: string | null;
    externalCode?: string | null;
    internalCode?: string | null;
    companyUUID: string;
    departmentUUID: string;
    parentEmployeeUUID: string | null
    firstName: string;
    lastName: string;
    pesel: string;
    isPeselFake?: boolean;
    email: string;
    employmentFrom: string;
    employmentTo?: string | null;
    positionUUID: string;
    contractTypeUUID: string;
    roleUUID: string;
    active: boolean;
    address: Address;
    contacts: {
        type: 'phone' | 'email' | 'website';
        data: string;
    }[];
    phones: string[];
    webs: string[];
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}
