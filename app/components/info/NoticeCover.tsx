"use client";

import { Box } from "@mui/material";
import NoticeImage from "./NoticeImage";
import { COVER_ASPECT, COVER_MAX_HEIGHT } from "./coverAspect";

type Props = {
  noticeUuid: string;
  imageUuid: string;
  alt: string;
  maxHeight?: number;
};

/**
 * Okładka ogłoszenia: ten sam aspect co kadr, z limitem wysokości na desktopie.
 */
export default function NoticeCover({ noticeUuid, imageUuid, alt, maxHeight = COVER_MAX_HEIGHT }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        bgcolor: "#1e293b",
      }}
    >
      <NoticeImage
        noticeUuid={noticeUuid}
        imageUuid={imageUuid}
        alt={alt}
        aspectRatio={COVER_ASPECT}
        maxHeight={maxHeight}
        objectFit="cover"
      />
    </Box>
  );
}
