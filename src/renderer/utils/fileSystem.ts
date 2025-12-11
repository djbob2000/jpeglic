import type { InputItem } from "@common/types";
import type { InputState } from "@renderer/types";

// Simple path utilities for browser environment
const pathSeparator = "/";

const getRelativePath = (from: string, to: string): string => {
  const fromParts = from.split(pathSeparator).filter(Boolean);
  const toParts = to.split(pathSeparator).filter(Boolean);

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

  return relativeParts.join(pathSeparator) || ".";
};

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 10);

export const collectFilesRecursively = async (
  directory: string
): Promise<string[]> => {
  let entries: Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
  try {
    entries = await window.electron.fs.readdir(directory);
  } catch (error) {
    console.warn("Skipping directory", directory, error);
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = directory.endsWith(pathSeparator)
      ? directory + entry.name
      : directory + pathSeparator + entry.name;

    if (entry.isDirectory) {
      files.push(...(await collectFilesRecursively(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

export const expandFilePaths = async (
  pathsToExpand: string[]
): Promise<string[]> => {
  const result: string[] = [];

  for (const entry of pathsToExpand) {
    try {
      const stats = await window.electron.fs.stat(entry);
      if (stats.isDirectory) {
        result.push(...(await collectFilesRecursively(entry)));
      } else {
        result.push(entry);
      }
    } catch (error) {
      console.warn("Skipping path", entry, error);
    }
  }

  return result;
};

export const getCommonBase = (a: string, b: string): string => {
  const partsA = a.split(pathSeparator).filter(Boolean);
  const partsB = b.split(pathSeparator).filter(Boolean);
  const length = Math.min(partsA.length, partsB.length);
  const common: string[] = [];

  for (let i = 0; i < length; i += 1) {
    if (partsA[i] === partsB[i]) {
      common.push(partsA[i]);
    } else {
      break;
    }
  }

  if (common.length === 0) {
    return "/"; // Default to root for browser environment
  }

  const root = a.startsWith(pathSeparator) ? pathSeparator : "";
  return root + common.join(pathSeparator);
};

export const applyRelativePaths = (
  items: InputItem[],
  base: string | null
): InputItem[] => {
  if (items.length === 0) {
    return [];
  }

  if (!base) {
    return items.map((item) => ({
      ...item,
      relativePath:
        item.sourcePath.split(pathSeparator).pop() || item.sourcePath,
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
