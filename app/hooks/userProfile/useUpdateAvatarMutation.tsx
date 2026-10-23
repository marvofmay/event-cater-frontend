import { useMutation, UseMutationResult } from '@tanstack/react-query';
import axios from 'axios';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

export type UpdateAvatarPayload = {
    type: 'custom' | 'default';
    defaultAvatar?: 'man' | 'woman';
    file?: File;
};

export type UpdateAvatarResponse = {
    message: string;
};

const updateAvatar = async (
    payload: UpdateAvatarPayload,
    onProgress?: (percent: number) => void
): Promise<UpdateAvatarResponse> => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('TOKEN_MISSING');

    const formData = new FormData();
    formData.append('type', payload.type);

    if (payload.type === 'default' && payload.defaultAvatar) {
        formData.append('defaultAvatar', payload.defaultAvatar);
    }

    if (payload.type === 'custom' && payload.file) {
        formData.append('uploadedFile', payload.file);
    }

    const response = await axios.patch(`${SERVICE_COMPANY_URL}/api/me/avatar`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (event) => {
            if (!event.total) return;
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress?.(percent);
        },
    });

    return response.data as UpdateAvatarResponse;
};

export const useUpdateAvatarMutation = (
    onProgress?: (percent: number) => void
): UseMutationResult<UpdateAvatarResponse, Error, UpdateAvatarPayload, unknown> => {
    return useMutation<UpdateAvatarResponse, Error, UpdateAvatarPayload>({
        mutationFn: (payload) => updateAvatar(payload, onProgress),
    });
};
