"use client";

import { Box, CircularProgress } from "@mui/material";

const BRAND = "#34495e";

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
                sx={{ color: "rgba(52, 73, 94, 0.28)", position: "absolute", left: 0, top: 0 }}
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
    minHeight = 240,
    size = 36,
}: {
    label?: string;
    minHeight?: number | string;
    size?: number;
}) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" width="100%" sx={{ minHeight }}>
            <BrandSpinner size={size} label={label} />
        </Box>
    );
}
