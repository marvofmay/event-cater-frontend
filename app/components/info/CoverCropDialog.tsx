"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { COVER_ASPECT } from "./coverAspect";
import { clamp, containRect, cropImageToFile, maxCropSize, type CropArea } from "./cropImage";

type Props = {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

type Selection = { x: number; y: number; width: number };
type ImageBox = { left: number; top: number; width: number; height: number };

export default function CoverCropDialog({ open, file, onCancel, onConfirm }: Props) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const selectionRef = useRef<Selection | null>(null);
  const imageBoxRef = useRef<ImageBox>({ left: 0, top: 0, width: 0, height: 0 });
  const maxSizeRef = useRef({ width: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    if (!open || !file) {
      setSourceUrl("");
      setNatural({ width: 0, height: 0 });
      setSelection(null);
      setError("");
      return;
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setSelection(null);
    setError("");
    const image = new Image();
    image.onload = () => setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setError("Nie udało się wczytać wybranego zdjęcia.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useLayoutEffect(() => {
    if (!open) return;
    const node = stageRef.current;
    if (!node) return;
    const update = () => setStageSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, sourceUrl]);

  const imageBox = useMemo(
    () => containRect(stageSize.width, stageSize.height, natural.width, natural.height),
    [stageSize, natural],
  );

  const maxSize = useMemo(
    () => maxCropSize(imageBox.width, imageBox.height, COVER_ASPECT),
    [imageBox],
  );

  useEffect(() => {
    imageBoxRef.current = imageBox;
    maxSizeRef.current = maxSize;
  }, [imageBox, maxSize]);

  useEffect(() => {
    if (!imageBox.width || !maxSize.width) return;
    setSelection((current) => {
      if (current) return clampSelection(current, imageBox, maxSize);
      const width = maxSize.width * 0.85;
      return {
        x: imageBox.left + (imageBox.width - width) / 2,
        y: imageBox.top + (imageBox.height - width / COVER_ASPECT) / 2,
        width,
      };
    });
  }, [imageBox, maxSize]);

  const cropHeight = selection ? selection.width / COVER_ASPECT : 0;
  const sizeRatio = selection && maxSize.width ? selection.width / maxSize.width : 0.85;

  const toImageArea = (sel: Selection): CropArea => {
    const scale = natural.width / imageBox.width;
    return {
      x: (sel.x - imageBox.left) * scale,
      y: (sel.y - imageBox.top) * scale,
      width: sel.width * scale,
      height: (sel.width / COVER_ASPECT) * scale,
    };
  };

  const beginDrag = (mode: "move" | "resize", clientX: number, clientY: number) => {
    const origin = selectionRef.current;
    if (!origin) return;
    const start = { mode, clientX, clientY, origin: { ...origin } };

    const onMove = (event: PointerEvent) => {
      const dx = event.clientX - start.clientX;
      const dy = event.clientY - start.clientY;
      if (start.mode === "move") {
        setSelection(
          clampSelection(
            { x: start.origin.x + dx, y: start.origin.y + dy, width: start.origin.width },
            imageBoxRef.current,
            maxSizeRef.current,
          ),
        );
        return;
      }
      setSelection(
        clampSelection(
          { x: start.origin.x, y: start.origin.y, width: start.origin.width + dx },
          imageBoxRef.current,
          maxSizeRef.current,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <Dialog open={open} onClose={() => !busy && onCancel()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ backgroundColor: '#171717', color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
        Kadrowanie zdjęcia wiodącego
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Przesuń prostokąt i zmień jego rozmiar - w ogłoszeniu pojawi się tylko ten fragment.
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Box
            ref={stageRef}
            sx={{
              position: "relative",
              width: "100%",
              height: { xs: 320, sm: 380 },
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "#1f2933",
              overflow: "hidden",
              touchAction: "none",
              userSelect: "none",
            }}
            aria-label="Kadrowanie zdjęcia wiodącego"
          >
            {sourceUrl && (
              <Box
                component="img"
                src={sourceUrl}
                alt=""
                draggable={false}
                sx={{
                  position: "absolute",
                  left: imageBox.left,
                  top: imageBox.top,
                  width: imageBox.width,
                  height: imageBox.height,
                  display: "block",
                  pointerEvents: "none",
                }}
              />
            )}
            {selection && (
              <>
                <Box sx={{ position: "absolute", left: 0, top: 0, right: 0, height: selection.y, bgcolor: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
                <Box sx={{ position: "absolute", left: 0, top: selection.y + cropHeight, right: 0, bottom: 0, bgcolor: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
                <Box sx={{ position: "absolute", left: 0, top: selection.y, width: selection.x, height: cropHeight, bgcolor: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
                <Box sx={{ position: "absolute", left: selection.x + selection.width, top: selection.y, right: 0, height: cropHeight, bgcolor: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
                <Box
                  onPointerDown={(event) => {
                    event.preventDefault();
                    beginDrag("move", event.clientX, event.clientY);
                  }}
                  sx={{
                    position: "absolute",
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: cropHeight,
                    border: "2px solid #fff",
                    boxSizing: "border-box",
                    cursor: "move",
                  }}
                >
                  <Box
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      beginDrag("resize", event.clientX, event.clientY);
                    }}
                    sx={{
                      position: "absolute",
                      right: -9,
                      bottom: -9,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      border: "2px solid #fff",
                      cursor: "nwse-resize",
                    }}
                    aria-label="Zmień rozmiar kadru"
                  />
                </Box>
              </>
            )}
          </Box>
          <Stack direction="row" alignItems="center" gap={2}>
            <Typography variant="body2" sx={{ minWidth: 56 }}>Rozmiar</Typography>
            <Slider
              min={0.35}
              max={1}
              step={0.01}
              value={sizeRatio}
              disabled={!selection || busy}
              onChange={(_, value) => {
                if (!selection || !maxSize.width) return;
                const ratio = typeof value === "number" ? value : value[0];
                const width = maxSize.width * ratio;
                const height = width / COVER_ASPECT;
                const centerX = selection.x + selection.width / 2;
                const centerY = selection.y + cropHeight / 2;
                setSelection(
                  clampSelection(
                    { x: centerX - width / 2, y: centerY - height / 2, width },
                    imageBox,
                    maxSize,
                  ),
                );
              }}
              aria-label="Rozmiar prostokąta kadru"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>Anuluj</Button>
        <Button
          variant="contained"
          disabled={!file || !sourceUrl || !selection || !imageBox.width || busy || Boolean(error)}
          onClick={async () => {
            if (!file || !sourceUrl || !selection) return;
            setBusy(true);
            setError("");
            try {
              const cropped = await cropImageToFile(sourceUrl, toImageArea(selection), file.name, "image/jpeg");
              onConfirm(cropped);
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : "Nie udało się wykadrować zdjęcia.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Przygotowywanie…" : "Użyj tego kadru"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function clampSelection(
  selection: Selection,
  imageBox: ImageBox,
  maxSize: { width: number; height: number },
): Selection {
  const minWidth = Math.max(48, maxSize.width * 0.35);
  const width = clamp(selection.width, minWidth, Math.max(minWidth, maxSize.width));
  const height = width / COVER_ASPECT;
  const x = clamp(selection.x, imageBox.left, imageBox.left + Math.max(0, imageBox.width - width));
  const y = clamp(selection.y, imageBox.top, imageBox.top + Math.max(0, imageBox.height - height));
  return { x, y, width };
}
