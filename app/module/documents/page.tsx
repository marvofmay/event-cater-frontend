"use client";

import { useUser } from "../../context/userContext";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CenteredMessage from "@/app/components/shared/CenterdeMessage";

const Document: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, hasAccess, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/me/logout");
    }

    if (!loading && !hasAccess("documents")) {
      router.push("/forbidden");
    }
  }, [hasAccess, loading, router]);

  return (
    <div className="grid grid-rows-[10px_1fr_10px] min-h-screen p-1 pb-1 sm:p-1 font-[family-name:var(--font-geist-sans)]">
      <main>
        {!loading && !isAuthenticated ? (
          <CenteredMessage message={t("common.message.youAreNotLogged")} />
        ) : (
          <>
            <p>{t("documents.title")}</p>
          </>
        )}
      </main>
    </div>
  );
};

export default Document;
