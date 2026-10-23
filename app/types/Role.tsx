import Permission from "./Permission";
import Access from "./Access";

export default interface Role {
    uuid: string;
    name: string;
    description?: string;
    permissions?: Permission[];
    accesses?: Access[];
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}