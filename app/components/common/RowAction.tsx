"use client";
import Link from "next/link";
import { IconButton, Tooltip } from "@mui/material";
import { Archive, Delete, Download, Edit, PhotoLibrary, Preview, Restore } from "@mui/icons-material";

const icons = {
  archive: Archive,
  delete: Delete,
  download: Download,
  edit: Edit,
  preview: Preview,
  photos: PhotoLibrary,
  restore: Restore,
};

export function RowAction({
  action,
  label,
  onClick,
  href,
  disabled = false,
  size = "medium",
}: {
  action: keyof typeof icons;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  size?: "small" | "medium";
}) {
  const Icon = icons[action];
  const iconFont = size === "small" ? "small" : "medium";
  return (
    <Tooltip title={label}>
      <span style={{ display: "inline-flex" }}>
        {href ? (
          <IconButton component={Link} href={href} aria-label={label} disabled={disabled} size={size}>
            <Icon fontSize={iconFont} />
          </IconButton>
        ) : (
          <IconButton onClick={onClick} aria-label={label} disabled={disabled} size={size}>
            <Icon fontSize={iconFont} />
          </IconButton>
        )}
      </span>
    </Tooltip>
  );
}
