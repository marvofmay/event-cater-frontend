"use client";

import { useUser } from "../../context/userContext";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CenteredMessage from "@/app/components/shared/CenterdeMessage";
import MainFileManager from "@/app/components/fileManager/main";

const FileManager: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, hasAccess, hasPermission, loading } = useUser();
  const canList = hasAccess("file_manager") && hasPermission("file_manager.list");
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }

    if (!loading && isAuthenticated && !canList) {
      router.replace("/forbidden");
    }
  }, [isAuthenticated, canList, loading, router]);

  if (loading || !isAuthenticated || !canList) return null;

  return (
    <div className="grid grid-rows-[10px_1fr_10px] min-h-screen p-1 pb-1 sm:p-1 font-[family-name:var(--font-geist-sans)]">
      <main>
        {!loading && !isAuthenticated ? (
          <CenteredMessage message={t("common.message.youAreNotLogged")} />
        ) : (
          <>
            <p>{t("fileManager.title")}</p>
            <MainFileManager />
          </>
        )}
      </main>
    </div>
  );
};

export default FileManager;
