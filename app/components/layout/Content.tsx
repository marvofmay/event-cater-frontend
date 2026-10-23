"use client";

import { ReactNode } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";
import { Card, CardContent, Paper, Box } from "@mui/material";
import { colors } from "@mui/material";
import { APP_NAME } from "../../utils/constans";
import { useTranslation } from "react-i18next";

interface ContentProps {
  children: ReactNode;
}

const Content: React.FC<ContentProps> = ({ children }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const pathParts = pathname ? pathname.split("/").filter(Boolean) : [];

  return (
    <main className="ml-6 mr-6 mt-3">
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{ color: colors.grey[700], fontSize: "1rem" }}
      >
        <Link href="/" passHref>
          <Typography color="text.primary" sx={{ fontWeight: 500 }}>
            {APP_NAME}
          </Typography>
        </Link>
        {pathParts.map((part, index) => {
          const label = /^[0-9a-f-]{36}$/i.test(part)
            ? t("common.path.details", { defaultValue: "Szczegóły" })
            : t("common.path." + part, { defaultValue: part });
          return (
            <Typography
              color="text.secondary"
              sx={{ fontWeight: 400 }}
              key={index}
            >
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </Typography>
          );
        })}
      </Breadcrumbs>
      <Box
        component="hr"
        sx={{
          border: "none",
          height: "1px",
          backgroundColor: "grey.400",
          margin: "5px 0",
        }}
      />
      <Paper
        elevation={3}
        sx={{
          padding: "5px",
          borderRadius: "8px",
          backgroundColor: colors.common.white,
          boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.1)",
          display: "block",
          width: "100%",
          maxWidth: "none",
        }}
      >
        <Card sx={{ borderRadius: "8px", boxShadow: "none", width: "100%" }}>
          <CardContent sx={{ padding: "3px", display: "block" }}>
            {children}
          </CardContent>
        </Card>
      </Paper>
    </main>
  );
};

export default Content;
