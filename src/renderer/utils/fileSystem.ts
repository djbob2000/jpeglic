import type { DirEntry, InputItem } from "@common/types";
import type { InputState } from "@renderer/types";
import tauriAPI from "./tauriAPI";

// Helper to split paths handling both / and \
const splitPath = (path: string): string[] => {
  // Handle Windows drive letter (e.g., "C:\\Users")
  const hasWindowsDrive = /^[A-Za-z]:/.test(path);
  const parts = path.split(/[/\\]/).filter(Boolean);
  // Restore drive letter if present (it gets split as "C:", but we want "C:")
  if (hasWindowsDrive && parts.length > 0 && /^[A-Za-z]:$/.test(parts[0])) {
    parts[0] = `${parts[0]}\\`;
  }
  return parts;
};

// Detect which separator is being used in the path
const getSeparator = (path: string) => (path.includes("\\") ? "\\" : "/");

const getRelativePath = (from: string, to: string): string => {
  const fromParts = splitPath(from);
  const toParts = splitPath(to);
  const separator = getSeparator(from) || getSeparator(to) || "/";

  // Find common prefix
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);

  const relativeParts = [];
  for (let i = 0; i < upCount; i++) {
    relativeParts.push("..");
  }
  relativeParts.push(...downParts);

  return relativeParts.join(separator) || ".";
};

export const generateId = (): string => Math.random().toString(36).substring(2, 10);

export const collectFilesRecursively = async (directory: string): Promise<string[]> => {
  let entries: DirEntry[];
  try {
    entries = await tauriAPI.fs.readdir(directory);
  } catch (error) {
    console.warn("Skipping directory", directory, error);
    return [];
  }

  const separator = getSeparator(directory);

  const results = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = directory.endsWith(separator)
        ? directory + entry.name
        : directory + separator + entry.name;

      if (entry.isDirectory) {
        return collectFilesRecursively(fullPath);
      }
      return [fullPath];
    }),
  );

  return results.flat();
};

export const expandFilePaths = async (pathsToExpand: string[]): Promise<string[]> => {
  const results = await Promise.all(
    pathsToExpand.map(async (entry) => {
      try {
        const stats = await tauriAPI.fs.stat(entry);
        if (stats.isDirectory) {
          return collectFilesRecursively(entry);
        }
        return [entry];
      } catch (error) {
        console.warn("Skipping path", entry, error);
        return [];
      }
    }),
  );

  return results.flat();
};

export const getCommonBase = (a: string, b: string): string => {
  const partsA = splitPath(a);
  const partsB = splitPath(b);
  const length = Math.min(partsA.length, partsB.length);
  const common: string[] = [];
  const separator = getSeparator(a) || getSeparator(b) || "/";

  for (let i = 0; i < length; i += 1) {
    if (partsA[i] === partsB[i]) {
      common.push(partsA[i]);
    } else {
      break;
    }
  }

  if (common.length === 0) {
    return separator === "\\" ? "C:\\" : "/"; // Default to root
  }

  const isWindows = a.includes(":\\") || b.includes(":\\");
  // For Windows with drive letter, the first part already includes the backslash
  const prefix = isWindows ? "" : a.startsWith("/") ? "/" : "";
  return prefix + common.join(separator);
};

export const applyRelativePaths = (items: InputItem[], base: string | null): InputItem[] => {
  if (items.length === 0) {
    return [];
  }

  if (!base) {
    return items.map((item) => ({
      ...item,
      relativePath: splitPath(item.sourcePath).pop() || item.sourcePath,
    }));
  }

  return items.map((item) => ({
    ...item,
    relativePath: getRelativePath(base, item.sourcePath),
  }));
};

export const resetInputState = (): InputState => ({
  items: [],
  commonBase: null,
});
