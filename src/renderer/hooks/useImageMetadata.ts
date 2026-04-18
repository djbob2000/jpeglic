import { useMemo } from "react";
import type { PreviewData } from "@bindings";

export interface ImageMetadata {
  width: number | null;
  height: number | null;
  format: string | null;
  size: bigint | null;
  birthtime: bigint | null;
  camera: string | null;
  lens: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: string | null;
  focalLength: string | null;
  colorSpace: string | null;
  creationDate: Date | null;
  dimensions: string | null;
  dateTimeOriginal: string | null;
}

const formatExifDate = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatShutter = (val: unknown): string => {
  if (!val) return "";
  const s = String(val as string | number)
    .replace(/\s*ev$/i, "")
    .trim();
  if (s.includes("/")) return s.endsWith("s") ? s : `${s}s`;

  const num = parseFloat(s);
  if (Number.isNaN(num) || num <= 0) return s;

  if (num >= 0.4) {
    return `${Number(num.toFixed(1))}s`;
  }
  const denominator = Math.round(1 / num);
  return `1/${denominator}s`;
};

const formatAperture = (val: unknown): string => {
  if (!val) return "";
  const s = String(val as string | number)
    .replace(/\s*ev$/i, "")
    .trim();
  const num = parseFloat(s);
  if (Number.isNaN(num)) return s;
  return Number(num.toFixed(1)).toString();
};

export const useImageMetadata = (
  previewData: PreviewData | null,
  previousData: PreviewData | null,
  isImageLoaded: boolean,
): ImageMetadata | null => {
  return useMemo(() => {
    const activeData = isImageLoaded ? previewData : previousData || previewData;
    if (!activeData || !activeData.metadata) return null;

    const { metadata } = activeData;
    const exif = metadata.exif || {};

    // Extract useful info from exiftool data
    const dateTaken = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
    const cameraMake = exif.Make;
    const cameraModel = exif.Model;
    const camera = [cameraMake, cameraModel]
      .filter((v): v is string | number => v !== null && v !== undefined && v !== "")
      .map(String)
      .join(" ");

    // Parse ExifTool date object or string
    let creationDate: Date | null = null;
    if (dateTaken) {
      const dateStr = String(dateTaken as string | number);
      // Basic attempt to parse standard EXIF date format if standard Date parsing fails
      const exifDateRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
      const match = dateStr.match(exifDateRegex);
      if (match) {
        creationDate = new Date(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10),
        );
      } else {
        creationDate = new Date(dateStr);
      }

      if (Number.isNaN(creationDate.getTime())) {
        creationDate = null;
      }
    }

    // Fallback to file birthtime if no valid EXIF date
    if (!creationDate && metadata.birthtime) {
      creationDate = new Date(Number(metadata.birthtime));
    }

    const dimensions =
      metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : null;

    const aperture = exif.FNumber ? formatAperture(exif.FNumber) : null;
    const shutterSpeed = exif.ExposureTime ? formatShutter(exif.ExposureTime) : null;
    const iso = exif.ISO ? String(exif.ISO as string | number) : null;
    const lensRaw = exif.LensModel || exif.Lens;
    const lens = lensRaw ? String(lensRaw as string) : null;
    const focalLength = exif.FocalLength ? String(exif.FocalLength as string) : null;
    const colorSpace = exif.ColorSpace ? String(exif.ColorSpace as string) : null;
    const dateTimeOriginal = exif.DateTimeOriginal ? String(exif.DateTimeOriginal as string) : null;

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      birthtime: metadata.birthtime,
      camera: camera || null,
      lens,
      aperture,
      shutterSpeed,
      iso,
      focalLength,
      colorSpace,
      creationDate,
      dimensions,
      dateTimeOriginal,
    };
  }, [previewData, previousData, isImageLoaded]);
};

export { formatExifDate };
