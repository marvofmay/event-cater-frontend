"use client";

import { Box, CircularProgress } from "@mui/material";

const BRAND = "#1c3d32";

export function BrandSpinner({
    size = 36,
    label = "Ładowanie",
}: {
    size?: number;
    label?: string;
}) {
    return (
        <Box
            role="status"
            aria-live="polite"
            aria-label={label}
            sx={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}
        >
            <CircularProgress
                variant="determinate"
                value={100}
                size={size}
                thickness={3}
                aria-hidden
                sx={{ color: "rgba(28, 61, 50, 0.18)", position: "absolute", left: 0, top: 0 }}
            />
            <CircularProgress
                disableShrink
                size={size}
                thickness={3}
                aria-hidden
                sx={{
                    color: BRAND,
                    position: "absolute",
                    left: 0,
                    top: 0,
                    animationDuration: "0.9s",
                    "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                }}
            />
        </Box>
    );
}

export default function CenteredSpinner({
    label = "Ładowanie",
    minHeight = "100svh",
    size = 36,
}: {
    label?: string;
    minHeight?: number | string;
    size?: number;
}) {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="100%"
            sx={{ minHeight, background: "#f3f6f4" }}
        >
            <BrandSpinner size={size} label={label} />
        </Box>
    );
}
