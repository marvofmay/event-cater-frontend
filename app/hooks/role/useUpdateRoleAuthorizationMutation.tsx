import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AssignPermissionsPayload } from "./useAssignPermissionsMutation";

export default function useUpdateRoleAuthorizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleUUID, accesses }: { roleUUID: string; accesses: AssignPermissionsPayload[] }) => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Zaloguj się ponownie.");
      const response = await axios.put(`/api/roles/${roleUUID}/accesses`, { accesses }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.message as string;
    },
    onSuccess: (_, { roleUUID }) => {
      void queryClient.invalidateQueries({ queryKey: ["role", roleUUID] });
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      window.dispatchEvent(new Event("authorization-changed"));
    },
  });
}
