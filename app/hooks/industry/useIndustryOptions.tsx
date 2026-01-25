import IndustryOption from "@/app/types/IndustryOption";
import useIndustriesQuery from "./useIndustriesQuery";
import { SortDirection } from "@/app/types/SortDirection";

interface UseIndustryOptionsParams {
    pageSize: number;
    page: number;
    sortBy: string;
    sortDirection: SortDirection;
    excludeIndustryUUID?: string;
}

export const useIndustryOptions = ({
    pageSize,
    page,
    sortBy,
    sortDirection,
    excludeIndustryUUID,
}: UseIndustryOptionsParams) => {

    const query = useIndustriesQuery(
        pageSize,
        page,
        sortBy,
        sortDirection
    );

    const options: IndustryOption[] =
        query.data?.items
            .filter(industry =>
                !excludeIndustryUUID || industry.uuid !== excludeIndustryUUID
            )
            .map(industry => ({
                uuid: industry.uuid,
                name: industry.name ?? '',
            })) ?? [];

    return {
        ...query,
        options,
    };
};
