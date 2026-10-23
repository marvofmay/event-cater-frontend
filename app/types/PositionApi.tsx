import Department from "./Department";

export default interface PositionApi {
    uuid: string;
    name: string;
    description?: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
    positionDepartments: Department[];
}
