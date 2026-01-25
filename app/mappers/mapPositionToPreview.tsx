import Position from '@/app/types/Position';
import { PositionPreview } from '@/app/types/PositionPreview';

const mapPositionToPreview = (
    position: Position,
    departmentsDict: Record<string, { uuid: string; name: string; active?: boolean }>
): PositionPreview => ({
    uuid: position.uuid,
    name: position.name,
    description: position.description,
    active: position.active,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
    departments: position.departmentsUUIDs
        .map(uuid => departmentsDict[uuid])
        .filter(Boolean),
});

export default mapPositionToPreview;