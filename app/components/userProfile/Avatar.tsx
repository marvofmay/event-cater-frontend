import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useAvatarForm } from "@/app/hooks/userProfile/useAvatarForm";
import Avatar from "@/app/types/Avatar";

const MAN_AVATAR_URL = "/icons/man.png";
const WOMAN_AVATAR_URL = "/icons/woman.png";

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
      toast.error(t("userProfile.avatar.invalidFile"));
    }
  };

  const handleSave = async () => {
    try {
      await save();
      setHasSaved(true);
    } catch {
      setHasSaved(false);
    }
  };

  const shouldShowDefaultAvatarChoice =
    (data?.avatarType === "default" && data?.defaultAvatar === null) ||
    !isCustomAvatar ||
    defaultAvatar === null;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg text-xs w-full min-w-0 overflow-hidden">
      <div className="flex flex-col items-center gap-3 w-full min-w-0">
        <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-2 border-gray-300 bg-gray-50">
          <img
            src={avatarUrl}
            alt={t("avatar.alt")}
            className="w-full h-full object-cover"
          />
        </div>

        {shouldShowDefaultAvatarChoice && (
          <div className="flex flex-col items-stretch gap-2 w-full min-w-0">
            <span className="text-gray-500 text-[0.75rem] text-center leading-snug">
              {t("userProfile.avatar.chooseDefault")}
            </span>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="flex items-center gap-2 cursor-pointer min-w-0">
                <input
                  type="radio"
                  className="shrink-0"
                  checked={!isCustomAvatar && avatarUrl === MAN_AVATAR_URL}
                  onChange={() => selectDefaultAvatar("man")}
                />
                <span className="leading-snug break-words">{t("userProfile.avatar.man")}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer min-w-0">
                <input
                  type="radio"
                  className="shrink-0"
                  checked={!isCustomAvatar && avatarUrl === WOMAN_AVATAR_URL}
                  onChange={() => selectDefaultAvatar("woman")}
                />
                <span className="leading-snug break-words">{t("userProfile.avatar.woman")}</span>
              </label>
            </div>

            <hr className="w-full border-t border-gray-200 my-1" />
          </div>
        )}

        <div className="flex flex-col items-stretch gap-2 w-full min-w-0">
          <span className="text-gray-500 text-[0.75rem] text-center leading-snug">
            {t("userProfile.avatar.uploadCustom")}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="w-full max-w-full text-[0.7rem] cursor-pointer"
          />
        </div>

        {canSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-white ${
              isSaving ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isSaving
              ? t("userProfile.avatar.uploading")
              : t("userProfile.avatar.upload.button")}
          </button>
        )}

        {uploadProgress > 0 && (
          <div className="w-full">
            <div className="h-2 bg-gray-200 rounded">
              <div className="h-full bg-blue-500" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarForm;
