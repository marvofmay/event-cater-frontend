"use client";

import { useRouter } from 'next/navigation';
import { Button, Typography } from '@mui/material';
import { useUser } from '@/app/context/userContext';
import ChangePasswordDialog from '@/app/components/user/ChangePasswordDialog';

export default function Page() {
    const { isAuthenticated, user } = useUser();
    const router = useRouter();
    if (!isAuthenticated) return <Typography>Zaloguj się, aby zmienić hasło.</Typography>;
    if (user?.technicalAdministrator) return <Typography>Hasło konta technicznego jest zarządzane w panelu SaaS.</Typography>;
    return <><Button onClick={() => router.push('/')}>Wróć do panelu</Button><ChangePasswordDialog onClose={() => router.push('/')} /></>;
}
