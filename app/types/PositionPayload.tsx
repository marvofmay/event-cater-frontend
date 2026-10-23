export default interface PositionPayload {
    name: string;
    description?: string;
    departmentsUUIDs?: string[];
    uuid?: string;
    active: boolean;
}
