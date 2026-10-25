import Address from "./Address";
import ContractType from "./ContractType";
import Position from "./Position";
import Role from "./Role";

export default interface Employee {
    uuid: string;
    externalCode?: string | null;
    internalCode?: string | null;
    company: {
        uuid: string;
        fullName: string;
    };
    department: {
        uuid: string;
        name: string;
    };
    parentEmployee: {
        uuid: string | null;
        firstName: string | null;
        lastName: string | null;
    }
    firstName: string;
    lastName: string;
    pesel: string;
    isPeselFake?: boolean;
    email: string;
    employmentFrom: string;
    employmentTo: string | null;
    position: Position;
    contractType: ContractType;
    role: Role;
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
