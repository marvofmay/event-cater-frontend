"use client";

import { Box } from "@mui/material";
import { useRef } from "react";

export function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function move(from: number, delta: number) {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        p: 0.5,
        maxWidth: "100%",
        flexWrap: "wrap",
        borderRadius: 999,
        bgcolor: "rgba(52, 73, 94, 0.08)",
        border: "1px solid rgba(52, 73, 94, 0.18)",
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            ref={(node: HTMLButtonElement | null) => {
              buttons.current[index] = node;
            }}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            sx={{
              border: 0,
              cursor: "pointer",
              borderRadius: 999,
              px: 2,
              py: 0.75,
              minHeight: 36,
              font: "inherit",
              fontSize: "0.875rem",
              fontWeight: 650,
              lineHeight: 1.2,
              textTransform: "none",
              whiteSpace: "nowrap",
              color: selected ? "#fff" : "#34495e",
              bgcolor: selected ? "#34495e" : "transparent",
              boxShadow: selected ? "0 1px 2px rgba(16, 24, 40, 0.16)" : "none",
              transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
              "&:hover": { bgcolor: selected ? "#2c3e50" : "rgba(52, 73, 94, 0.12)" },
              "&:focus-visible": { outline: "2px solid #34495e", outlineOffset: 2 },
            }}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}
