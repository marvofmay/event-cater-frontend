"use client";

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/app/context/userContext';
import CenteredSpinner from '@/app/components/common/BrandSpinner';
import ChangePasswordDialog from './ChangePasswordDialog';

export default function PasswordChangeGate({ children }: { children: ReactNode }) {
    const { loading, isAuthenticated, mustChangePassword } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const protectedPage = ['/manage', '/settings', '/module', '/catering', '/notifications', '/messages', '/me'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    useEffect(() => {
        if (!loading && !isAuthenticated && protectedPage) router.replace('/login');
    }, [loading, isAuthenticated, protectedPage, router]);
    if (loading) return <CenteredSpinner minHeight="100svh" label="Ładowanie konta" />;
    if (!isAuthenticated && protectedPage) return null;
    if (isAuthenticated && mustChangePassword && pathname !== '/reset-password') return <ChangePasswordDialog required />;
    return children;
}
