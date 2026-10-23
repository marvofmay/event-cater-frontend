import { useQuery } from "@tanstack/react-query";
import Note from "../../types/Note";
import axios from "axios";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";
import { useTranslation } from "react-i18next";
import { SortDirection } from "@/app/types/SortDirection";

export interface NotesResponse {
  items: Note[];
  total: number;
}

const fetchNotes = async (
  token: string,
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
  filters?: {
    userUUID?: string | null;
  },
): Promise<NotesResponse> => {
  try {
    const params: any = {
      pageSize,
      page,
      sortBy,
      sortDirection,
    };

    if (phrase) params.phrase = phrase;
    if (includes) params.includes = includes;

    if (filters) {
      if (filters.userUUID) params.userUUID = filters.userUUID;
    }

    const response = await axios.get(`${SERVICE_COMPANY_URL}/api/users/notes`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    return {
      items: response.data.data.items || [],
      total: response.data.data.total || 0,
    };
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.href = "/me/logout";
    }
    throw error;
  }
};

const useNotesQuery = (
  pageSize: number,
  page: number,
  sortBy: string,
  sortDirection: SortDirection,
  phrase?: string | null,
  includes?: string | null,
  filters?: {
    userUUID?: string;
  },
) => {
  const { t } = useTranslation();
  const normalizedPhrase = phrase ?? undefined;
  const normalizedIncludes = includes ?? undefined;

  return useQuery<NotesResponse>({
    queryKey: [
      "notes",
      pageSize,
      page,
      sortBy,
      sortDirection,
      normalizedPhrase,
      filters,
    ],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error(t("common.message.tokenIsMissing"));

      return fetchNotes(
        token,
        pageSize,
        page,
        sortBy,
        sortDirection,
        normalizedPhrase,
        normalizedIncludes,
        filters,
      );
    },
  });
};

export default useNotesQuery;
