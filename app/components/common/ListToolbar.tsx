"use client";

import { ReactNode } from "react";
import { Box, Button, TextField } from "@mui/material";
import { Search } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

type Props = {
  searchPhrase: string;
  onSearchPhraseChange: (value: string) => void;
  onSearch: () => void;
  actions?: ReactNode;
};

/** Shared list filter/action row - keeps buttons on one line and wraps cleanly. */
export default function ListToolbar({
  searchPhrase,
  onSearchPhraseChange,
  onSearch,
  actions,
}: Props) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        mb: 2,
      }}
    >
      <TextField
        variant="outlined"
        placeholder={t("common.enterPhraseToSearch")}
        size="small"
        value={searchPhrase}
        onChange={(e) => onSearchPhraseChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        sx={{
          flex: "1 1 220px",
          minWidth: 180,
          maxWidth: 420,
        }}
      />
      <Button
        startIcon={<Search />}
        variant="contained"
        color="primary"
        onClick={onSearch}
        sx={{ flexShrink: 0, whiteSpace: "nowrap", textTransform: "none" }}
      >
        {t("common.button.search")}
      </Button>
      {actions ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            ml: { xs: 0, sm: "auto" },
            "& .MuiButton-root": {
              flexShrink: 0,
              whiteSpace: "nowrap",
              textTransform: "none",
            },
          }}
        >
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}
