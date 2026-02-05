"use client";

import { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import Items from "./components/dashboard/Items";
import { useUser } from "./context/userContext";

const Home: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useMemo(() => new QueryClient(), []);
    const { isAuthenticated, loading, employee } = useUser();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div style={{ fontFamily: 'Arial, sans-serif' }}>
            <main>
                <Box display="flex" justifyContent="center" alignItems="center">
                    <Box width="90%">
                        <QueryClientProvider client={queryClient}>
                            {isAuthenticated && (
                                <Typography variant="body1" mb={2}>
                                    {t('common.welcome')}, {employee?.uuid ? `${employee.firstName} ${employee.lastName}` : "pracowniku techniczny systemu"}.
                                </Typography>
                            )}

                            {isAuthenticated && <Items />}
                        </QueryClientProvider>
                    </Box>
                </Box>
            </main>
        </div>
    );
};

export default Home;
