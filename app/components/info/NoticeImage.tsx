"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";

type Props = {
  noticeUuid: string;
  imageUuid: string;
  alt: string;
  height?: number | string;
  aspectRatio?: number | string;
  maxHeight?: number;
  objectFit?: "cover" | "contain";
};

export default function NoticeImage({
  noticeUuid,
  imageUuid,
  alt,
  height = 220,
  aspectRatio,
  maxHeight,
  objectFit = "cover",
}: Props) {
  const { token } = useUser();
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setError(false);
    if (!token) return;
    fetch(`/api/company-notices/${noticeUuid}/images/${imageUuid}`, {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [noticeUuid, imageUuid, token]);

  const aspect = typeof aspectRatio === "number" ? aspectRatio : aspectRatio ? Number(aspectRatio) : null;

  const frameSx =
    aspect && maxHeight != null
      ? {
          // Szerokość z aspectu przy limicie wysokości - nie rozciąga karty na całą szerokość 16:9.
          width: `min(100%, calc(${maxHeight}px * ${aspect}))`,
          maxWidth: "100%",
          aspectRatio: String(aspect),
          height: "auto" as const,
          maxHeight,
        }
      : aspect
        ? { width: "100%", aspectRatio: String(aspect), height: "auto" as const }
        : { width: "100%", height, ...(maxHeight != null ? { maxHeight } : {}) };

  if (error) return <Typography variant="caption" color="text.secondary">Nie udało się wczytać zdjęcia.</Typography>;
  if (!url) return <Box sx={{ ...frameSx, bgcolor: "grey.800" }} aria-label="Wczytywanie zdjęcia" />;
  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={{ ...frameSx, objectFit, display: "block" }}
    />
  );
}
