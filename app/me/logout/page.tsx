"use client";

import { useUser } from "@/app/context/userContext";
import { useTranslation } from 'react-i18next';
import { useEffect } from "react";
import CenteredMessage from '@/app/components/shared/CenterdeMessage';

const Logout: React.FC = () => {
    const { t } = useTranslation();
    const { logout } = useUser();

    useEffect(() => {
        logout();
    }, [logout]);

    return (
        <>
            <div className="grid grid-rows-[10px_1fr_10px] min-h-screen p-1 pb-1 sm:p-1 font-[family-name:var(--font-geist-sans)]">
                <CenteredMessage message={t('common.logout.success.message')} />
            </div>
        </>
    );
}

export default Logout;
