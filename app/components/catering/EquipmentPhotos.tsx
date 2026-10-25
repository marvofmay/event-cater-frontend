"use client";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useUser } from "@/app/context/userContext";
import { RowAction } from "../common/RowAction";
import { CatalogItem, EquipmentPhoto } from "./types";

export function EquipmentPhotoImage({ equipmentUuid, photo, thumbnail = false }: {
  equipmentUuid: string;
  photo: EquipmentPhoto;
  thumbnail?: boolean;
}) {
  const { token } = useUser();
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setError(false);
    if (token) {
      fetch(`/api/equipment/${equipmentUuid}/photos/${photo.uuid}`, {
        headers: { Authorization: "Bearer " + token },
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        if (!response.ok) throw new Error("Nie udało się wczytać zdjęcia.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [equipmentUuid, photo.uuid, token]);
  if (error) return <Typography variant="caption">Nie udało się wczytać zdjęcia.</Typography>;
  if (!url) return <Box sx={{ width: thumbnail ? 56 : "100%", height: thumbnail ? 56 : 180 }} aria-label="Wczytywanie zdjęcia" />;
  return <Box component="img" src={url} alt={photo.name} sx={{ width: thumbnail ? 56 : "100%", height: thumbnail ? 56 : 180, objectFit: "contain", borderRadius: 1 }} />;
}

function PendingPhoto({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <Box component="img" src={url} alt={file.name} sx={{ width: "100%", height: 180, objectFit: "contain" }} /> : null;
}

export function EquipmentPhotoGallery({ equipmentUuid, photos, onRemove, disabled = false }: {
  equipmentUuid: string;
  photos: EquipmentPhoto[];
  onRemove?: (uuid: string) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 2 }}>
      {photos.map((photo) => (
        <Box key={photo.uuid} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
          <EquipmentPhotoImage equipmentUuid={equipmentUuid} photo={photo} />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>{photo.name}</Typography>
            {onRemove && <RowAction action="delete" label={"Usuń zdjęcie: " + photo.name} disabled={disabled} onClick={() => onRemove(photo.uuid)} />}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

export function EquipmentPhotoEditor({ equipment, files, removed, onFilesChange, onRemove, disabled }: {
  equipment: Partial<CatalogItem>;
  files: File[];
  removed: string[];
  onFilesChange: (files: File[]) => void;
  onRemove: (uuid: string) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState("");
  const photos = (equipment.photos ?? []).filter((photo) => !removed.includes(photo.uuid));
  const addFiles = (selected: File[]) => {
    if (disabled) return;
    if (photos.length + files.length + selected.length > 20) {
      setError("Do jednej pozycji sprzętu można dodać maksymalnie 20 zdjęć.");
      return;
    }
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size < 1 || file.size > 20 * 1024 * 1024)) {
      setError("Wybierz zdjęcia JPEG, PNG, WebP lub GIF, każde do 20 MiB.");
      return;
    }
    setError("");
    onFilesChange([...files, ...selected]);
  };
  return (
    <Stack gap={2}>
      <Typography variant="subtitle2">Zdjęcia sprzętu</Typography>
      <Box
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(Array.from(event.dataTransfer.files));
        }}
        sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}
      >
        <Button component="label" variant="contained" color="success" startIcon={<AddIcon />} disabled={disabled}>
          Dodaj zdjęcia
          <input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }} />
        </Button>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Wybierz zdjęcia lub przeciągnij je tutaj. Maksymalnie 20 zdjęć, każde do 20 MiB.
          Zdjęcia i ich usunięcia zostaną zapisane po kliknięciu „Zapisz”.
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {equipment.uuid && <EquipmentPhotoGallery equipmentUuid={equipment.uuid} photos={photos} onRemove={onRemove} disabled={disabled} />}
      {files.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 2 }}>
          {files.map((file, index) => (
            <Box key={file.name + index} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
              <PendingPhoto file={file} />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>{file.name} · do dodania</Typography>
                <RowAction action="delete" label={"Usuń wybrane zdjęcie: " + file.name} disabled={disabled} onClick={() => onFilesChange(files.filter((_, photoIndex) => photoIndex !== index))} />
              </Stack>
            </Box>
          ))}
        </Box>
      )}
      {removed.length > 0 && <Typography variant="body2">Zdjęcia do usunięcia: {removed.length}.</Typography>}
    </Stack>
  );
}
