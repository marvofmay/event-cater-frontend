"use client";

import { Box, Typography } from "@mui/material";
import { usePathname } from "next/navigation";
import "../../i18n/i18n";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "../../utils/constans";
import { useUser } from "@/app/context/userContext";
import { isPublicMarketingPath } from "@/app/lib/publicMarketing";

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAuthenticated } = useUser();

  if (!isAuthenticated && isPublicMarketingPath(pathname)) {
    return null;
  }

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#34495e",
        padding: 2,
        position: "fixed",
        bottom: 0,
        width: "100%",
        textAlign: "center",
        color: "white",
      }}
    >
      <Typography variant="body2">
        {APP_NAME} {new Date().getFullYear()} - {t("common.footer.info")}
      </Typography>
    </Box>
  );
};

export default Footer;
