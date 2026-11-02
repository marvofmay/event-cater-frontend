export type CropArea = { x: number; y: number; width: number; height: number };

export async function cropImageToFile(
  imageSrc: string,
  area: CropArea,
  fileName = "cover.jpg",
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  quality = 0.92,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const outputWidth = Math.min(1600, Math.max(1, Math.round(area.width)));
  const outputHeight = Math.max(1, Math.round(outputWidth / (area.width / area.height)));
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Nie udało się przygotować kadru zdjęcia.");
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Nie udało się zapisać kadru."))),
      mimeType,
      quality,
    );
  });
  const base = fileName.replace(/\.[^.]+$/, "") || "cover";
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${base}-cover.${extension}`, { type: mimeType });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się wczytać zdjęcia do kadrowania."));
    image.src = src;
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Jak obraz „object-fit: contain” leży w prostokącie stage. */
export function containRect(
  stageWidth: number,
  stageHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  if (!stageWidth || !stageHeight || !imageWidth || !imageHeight) {
    return { left: 0, top: 0, width: 0, height: 0, scale: 1 };
  }
  const scale = Math.min(stageWidth / imageWidth, stageHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
    width,
    height,
    scale,
  };
}

/** Największy prostokąt o danym aspect mieszczący się w obrazie (w jednostkach wyświetlanych). */
export function maxCropSize(displayWidth: number, displayHeight: number, aspect: number) {
  if (displayWidth / displayHeight > aspect) {
    const height = displayHeight;
    return { width: height * aspect, height };
  }
  const width = displayWidth;
  return { width, height: width / aspect };
}
