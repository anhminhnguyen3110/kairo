import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, type UpdateProfilePayload } from '../api/user-api';
import { ME_QUERY_KEY } from './use-me';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
