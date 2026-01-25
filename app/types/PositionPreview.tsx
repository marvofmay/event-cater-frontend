export interface PositionPreview {
    uuid: string;
    name: string;
    description?: string;
    active?: boolean;
    createdAt?: string;
    updatedAt?: string;
    departments: {
        uuid: string;
        name: string;
        active?: boolean;
    }[];
}
