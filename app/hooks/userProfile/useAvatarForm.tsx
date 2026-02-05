import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useUpdateAvatarMutation } from './useUpdateAvatarMutation';
import Avatar from '@/app/types/Avatar';

const DEFAULT_AVATAR = '/icons/avatar-default.png';
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const MAN_AVATAR_URL = '/icons/man.png';
const WOMAN_AVATAR_URL = '/icons/woman.png';

export const useAvatarForm = () => {
    const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isCustomAvatar, setIsCustomAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [defaultAvatar, setDefaultAvatar] = useState<'man' | 'woman' | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<string | null>(null);

    const mutation = useUpdateAvatarMutation(setUploadProgress);

    const setInitialAvatar = useCallback((avatar: Avatar) => {
        if (avatar.avatarType === 'custom') {
            setAvatarUrl(`${API_URL}/upload/${avatar.avatarPath}`);
            setIsCustomAvatar(true);
            setDefaultAvatar(null);
            setSelectedFile(null);
        } else {
            if (avatar.defaultAvatar === 'man') {
                setAvatarUrl(MAN_AVATAR_URL);
                setDefaultAvatar('man');
            } else if (avatar.defaultAvatar === 'woman') {
                setAvatarUrl(WOMAN_AVATAR_URL);
                setDefaultAvatar('woman');
            } else {
                setAvatarUrl(DEFAULT_AVATAR);
                setDefaultAvatar(null);
            }
            setIsCustomAvatar(false);
            setSelectedFile(null);
        }
    }, []);

    const selectFile = (file: File) => {
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            throw new Error('INVALID_FILE');
        }

        if (previewRef.current) {
            URL.revokeObjectURL(previewRef.current);
        }

        const preview = URL.createObjectURL(file);
        previewRef.current = preview;

        setSelectedFile(file);
        setAvatarUrl(preview);
        setIsCustomAvatar(true);
        setDefaultAvatar(null);
        setUploadProgress(0);

        setHasChanges(true);
    };

    const selectDefaultAvatar = (gender: 'man' | 'woman') => {
        setAvatarUrl(gender === 'man' ? MAN_AVATAR_URL : WOMAN_AVATAR_URL);
        setDefaultAvatar(gender);
        setSelectedFile(null);
        setIsCustomAvatar(false);
        setUploadProgress(0);

        if (fileInputRef.current) fileInputRef.current.value = '';

        setHasChanges(true);
    };

    const save = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            mutation.mutate(
                {
                    type: isCustomAvatar ? 'custom' : 'default',
                    defaultAvatar: !isCustomAvatar ? defaultAvatar ?? undefined : undefined,
                    file: selectedFile ?? undefined,
                },
                {
                    onSuccess: (response) => {
                        toast.success(response?.message || 'Avatar updated successfully');
                        setUploadProgress(0);
                        setSelectedFile(null);
                        setHasChanges(false);
                        resolve();
                    },
                    onError: (error: any) => {
                        toast.error('Nie udało się zaktualizować avatara');
                        reject(error);
                    },
                }
            );
        });
    };

    const canSave =
        mutation.status !== 'pending' &&
        hasChanges;

    return {
        avatarUrl,
        setInitialAvatar,
        uploadProgress,
        isCustomAvatar,
        canSave,
        isSaving: mutation.status === 'pending',
        fileInputRef,
        selectFile,
        selectDefaultAvatar,
        save,
        defaultAvatar,
    };
};
