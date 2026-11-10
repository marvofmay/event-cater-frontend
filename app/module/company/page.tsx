"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import CenteredSpinner from "@/app/components/common/BrandSpinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import CompanyStructure from "@/app/components/company/CompanyStructure";

export default function CompanyPage() {
    const [queryClient] = useState(() => new QueryClient());
    const { hasAccess, hasPermission, isAuthenticated, loading, token } = useUser();
    const router = useRouter();
    const allowed = hasAccess("company_structure") && hasPermission("company_structure.view");

    useEffect(() => {
        if (!loading && !isAuthenticated) router.replace("/me/logout");
        else if (!loading && !allowed) router.replace("/forbidden");
    }, [loading, isAuthenticated, allowed, router]);

    if (loading) return <CenteredSpinner minHeight={160} />;
    if (!isAuthenticated || !allowed) return null;

    return <Box component="main" sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, sm: 3 }, width: "100%" }}>
        <QueryClientProvider client={queryClient}>
            <CompanyStructure key={token} />
        </QueryClientProvider>
    </Box>;
}
