import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAvatarForm } from '@/app/hooks/userProfile/useAvatarForm';
import Avatar from '@/app/types/Avatar';

const MAN_AVATAR_URL = '/icons/man.png';
const WOMAN_AVATAR_URL = '/icons/woman.png';

interface AvatarFormProps {
    data?: Avatar;
}

const AvatarForm: React.FC<AvatarFormProps> = ({ data }) => {
    const { t } = useTranslation();
    const [hasSaved, setHasSaved] = useState(false);

    const {
        avatarUrl,
        setInitialAvatar,
        uploadProgress,
        isCustomAvatar,
        canSave,
        fileInputRef,
        selectFile,
        selectDefaultAvatar,
        save,
        isSaving,
        defaultAvatar,
    } = useAvatarForm();

    useEffect(() => {
        if (data) {
            setInitialAvatar(data);
        }
    }, [data, setInitialAvatar]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            selectFile(file);
            setHasSaved(false);
        } catch {
            toast.error(t('userProfile.avatar.invalidFile'));
        }
    };

    const handleSave = async () => {
        await save();
        setHasSaved(true);
    };

    const shouldShowDefaultAvatarChoice =
        (data?.avatarType === 'default' && data?.defaultAvatar === null) || !isCustomAvatar || defaultAvatar === null;

    return (
        <div className="p-4 bg-white shadow-md rounded-lg text-xs max-w-sm mx-auto">
            <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300">
                    <img
                        src={avatarUrl}
                        alt={t('avatar.alt')}
                        className="w-full h-full object-cover"
                    />
                </div>

                {shouldShowDefaultAvatarChoice && (
                    <>
                        <div className="flex flex-col items-center gap-2 w-full">
                            <span className="text-gray-500 text-[0.75rem]">
                                {t('userProfile.avatar.chooseDefault')}
                            </span>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!isCustomAvatar && avatarUrl === MAN_AVATAR_URL}
                                        onChange={() => selectDefaultAvatar('man')}
                                    />
                                    {t('userProfile.avatar.man')}
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!isCustomAvatar && avatarUrl === WOMAN_AVATAR_URL}
                                        onChange={() => selectDefaultAvatar('woman')}
                                    />
                                    {t('userProfile.avatar.woman')}
                                </label>
                            </div>
                        </div>

                        <hr className="w-full border-t border-gray-300 my-4" />
                    </>
                )}

                <div className="flex flex-col items-center gap-2 w-full">
                    <span className="text-gray-500 text-[0.75rem]">
                        {t('userProfile.avatar.uploadCustom')}
                    </span>
                    <input
                        type="file"
                        accept="image/png,image/jpeg"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="mt-1 cursor-pointer"
                    />
                </div>

                {canSave && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded text-white ${isSaving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {isSaving
                            ? t('userProfile.avatar.uploading')
                            : t('userProfile.avatar.upload.button')}
                    </button>
                )}

                {uploadProgress > 0 && (
                    <div className="w-full">
                        <div className="h-2 bg-gray-200 rounded">
                            <div
                                className="h-full bg-blue-500"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvatarForm;
