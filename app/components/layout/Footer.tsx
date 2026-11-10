"use client";

import { Box, Typography } from "@mui/material";
import { usePathname } from "next/navigation";
import "../../i18n/i18n";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "../../utils/constans";
import { useUser } from "@/app/context/userContext";
import { isPublicMarketingPath } from "@/app/lib/publicMarketing";
import { isBareAuthPath } from "@/app/lib/shellPaths";

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAuthenticated } = useUser();

  if (
    (!isAuthenticated && isPublicMarketingPath(pathname)) ||
    isBareAuthPath(pathname)
  ) {
    return null;
  }

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#10261f",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        py: 1.5,
        px: 2,
        position: "fixed",
        bottom: 0,
        width: "100%",
        textAlign: "center",
        color: "rgba(247, 250, 248, 0.82)",
        zIndex: 10,
      }}
    >
      <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
        {APP_NAME} © {new Date().getFullYear()} · {t("common.footer.info")}
      </Typography>
    </Box>
  );
};

export default Footer;
