import DepartmentOption from "@/app/types/DepartmentOption";
import useDepartmentsQuery from "./useDepartmentsQuery";
import { SortDirection } from "@/app/types/SortDirection";

interface UseDepartmentOptionsParams {
    pageSize: number;
    page: number;
    sortBy: string;
    sortDirection: SortDirection;
    excludeDepartmentUUID?: string;
    phrase?: string;
    includes?: string;
    filters?: {
        active?: boolean | null;
        name?: string | null;
        companyUUID?: string | null;
    };
}

export const useDepartmentOptions = ({
    pageSize,
    page,
    sortBy,
    sortDirection,
    excludeDepartmentUUID,
    phrase,
    includes,
    filters = {},
}: UseDepartmentOptionsParams) => {
    const normalizedFilters = {
        active: filters.active ?? undefined,
        name: filters.name ?? undefined,
        companyUUID: filters.companyUUID ?? undefined,
    };

    const query = useDepartmentsQuery(
        pageSize,
        page,
        sortBy,
        sortDirection,
        phrase ?? null,
        includes ?? null,
        normalizedFilters
    );

    const options: DepartmentOption[] =
        query.data?.items
            .filter(department =>
                !excludeDepartmentUUID || department.uuid !== excludeDepartmentUUID
            )
            .map(department => ({
                uuid: department.uuid,
                name: department.name ?? '',
            })) ?? [];

    return {
        ...query,
        options,
    };
};
