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
}: {
  action: keyof typeof icons;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const Icon = icons[action];
  return (
    <Tooltip title={label}>
      <span style={{ display: "inline-flex" }}>
        {href ? (
          <IconButton component={Link} href={href} aria-label={label} disabled={disabled}>
            <Icon fontSize="medium" />
          </IconButton>
        ) : (
          <IconButton onClick={onClick} aria-label={label} disabled={disabled}>
            <Icon fontSize="medium" />
          </IconButton>
        )}
      </span>
    </Tooltip>
  );
}
