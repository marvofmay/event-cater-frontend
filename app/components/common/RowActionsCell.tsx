"use client";

import { ReactNode } from "react";
import { Box, TableCell } from "@mui/material";

/** Keeps row action icon buttons on a single horizontal line. */
export function RowActionsCell({ children }: { children: ReactNode }) {
  return (
    <TableCell
      sx={{
        padding: "4px 8px",
        whiteSpace: "nowrap",
        width: 1,
        verticalAlign: "middle",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          gap: 0,
        }}
      >
        {children}
      </Box>
    </TableCell>
  );
}
