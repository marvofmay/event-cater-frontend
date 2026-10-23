import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { SERVICE_COMPANY_URL } from '@/app/utils/constans';

const DEFAULT_AVATAR_URL = '/icons/avatar-default.png';

export const useAvatarUploader = () => {
    const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR_URL);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isCustomAvatar, setIsCustomAvatar] = useState<boolean>(false);
    const [isSaved, setIsSaved] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewUrlRef = useRef<string | null>(null);

    const isValidFile = (file: File): boolean => {
        return ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
    };

    const clearFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const selectFile = (file: File) => {
        if (!isValidFile(file)) {
            throw new Error('INVALID_FILE');
        }

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }

        const previewUrl = URL.createObjectURL(file);
        previewUrlRef.current = previewUrl;

        setSelectedFile(file);
        setAvatarUrl(previewUrl);
        setIsCustomAvatar(true);
        setIsSaved(false);
    };

    const selectDefaultAvatar = (url: string) => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }

        setAvatarUrl(url);
        setSelectedFile(null);
        setIsCustomAvatar(false);
        clearFileInput();
        setIsSaved(false);
    };

    const save = async () => {
        const payload = new FormData();

        if (isCustomAvatar && selectedFile) {
            payload.append('type', 'custom');
            payload.append('avatar', selectedFile);
        } else {
            payload.append('type', 'default');
        }

        await axios.patch(`${SERVICE_COMPANY_URL}/api/me/avatar`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (event) => {
                if (event.total) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(progress);
                }
            },
        });

        setUploadProgress(0);
        setSelectedFile(null);
        clearFileInput();
        setIsSaved(true);
    };

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    return {
        avatarUrl,
        uploadProgress,
        isCustomAvatar,
        isSaved,
        fileInputRef,
        selectFile,
        selectDefaultAvatar,
        save,
    };
};
