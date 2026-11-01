"use client";

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useUser } from '@/app/context/userContext';
import ChangePasswordDialog from './ChangePasswordDialog';

export default function PasswordChangeGate({ children }: { children: ReactNode }) {
    const { loading, isAuthenticated, mustChangePassword } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const protectedPage = ['/manage', '/settings', '/module', '/catering', '/notifications', '/messages', '/me'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    useEffect(() => {
        if (!loading && !isAuthenticated && protectedPage) router.replace('/login');
    }, [loading, isAuthenticated, protectedPage, router]);
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress aria-label="Ładowanie konta" /></Box>;
    if (!isAuthenticated && protectedPage) return null;
    if (isAuthenticated && mustChangePassword && pathname !== '/reset-password') return <ChangePasswordDialog required />;
    return children;
}
