"use client";

import { ReactNode } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";
import { Box } from "@mui/material";
import { APP_NAME } from "../../utils/constans";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import { isPublicMarketingPath } from "@/app/lib/publicMarketing";
import { isBareAuthPath, isMinimalShellPath } from "@/app/lib/shellPaths";

interface ContentProps {
  children: ReactNode;
}

const Content: React.FC<ContentProps> = ({ children }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useUser();
  const pathParts = pathname ? pathname.split("/").filter(Boolean) : [];

  if (loading && isMinimalShellPath(pathname)) {
    return <>{children}</>;
  }

  if (
    (!isAuthenticated && isPublicMarketingPath(pathname)) ||
    isBareAuthPath(pathname)
  ) {
    return <>{children}</>;
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "calc(100svh - 120px)",
        px: { xs: 1.5, sm: 2.5, md: 3 },
        py: { xs: 2, sm: 2.5 },
        pb: { xs: 10, sm: 11 },
        background:
          "linear-gradient(180deg, #f3f6f4 0%, #eef2ef 48%, #f7faf8 100%)",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{ color: "#4d5c55", fontSize: "0.88rem", mb: 1.25 }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <Typography
              sx={{ fontWeight: 600, color: "#1c3d32", fontSize: "0.88rem" }}
            >
              {APP_NAME}
            </Typography>
          </Link>
          {pathParts.map((part, index) => {
            const label = /^[0-9a-f-]{36}$/i.test(part)
              ? t("common.path.details", { defaultValue: "Szczegóły" })
              : t("common.path." + part, { defaultValue: part });
            return (
              <Typography
                sx={{ fontWeight: 450, color: "#4d5c55", fontSize: "0.88rem" }}
                key={index}
              >
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </Typography>
            );
          })}
        </Breadcrumbs>

        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "0.65rem",
            border: "1px solid rgba(21, 32, 27, 0.08)",
            boxShadow: "0 10px 28px rgba(16, 38, 31, 0.05)",
            p: { xs: 1.5, sm: 2.25 },
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Content;
