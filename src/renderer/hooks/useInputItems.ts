import { useMemo, useState } from "react";
import type { InputItem } from "@common/types";
import type { InputState } from "@renderer/types";
import {
  applyRelativePaths,
  expandFilePaths,
  generateId,
  getCommonBase,
  resetInputState,
} from "@utils/fileSystem";

// Simple path utilities for browser environment
const getDirname = (filePath: string): string => {
  const parts = filePath.split("/");
  return parts.slice(0, -1).join("/") || "/";
};

const getBasename = (filePath: string): string => {
  return filePath.split("/").pop() || filePath;
};

export const useInputItems = () => {
  const [state, setState] = useState<InputState>(resetInputState());
  const [isLoading, setIsLoading] = useState(false);

  const addFiles = async (paths: string[]) => {
    if (paths.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const expandedPaths = await expandFilePaths(paths);
      if (expandedPaths.length === 0) {
        return;
      }

      const newItemPromises = expandedPaths.map(async (filePath) => {
        try {
          // Get file stats asynchronously
          const stats = await window.electron.fs.stat(filePath);
          if (stats.isDirectory) {
            return null;
          }

          const isProcessed = await window.electron.fs.checkProcessed(filePath);

          return {
            id: generateId(),
            sourcePath: filePath,
            displayName: getBasename(filePath),
            relativePath: "",
            sizeBytes: stats.size,
            lastModified: stats.mtime,
            isProcessed,
          } as InputItem;
        } catch (error) {
          console.warn("Skipping file", filePath, error);
          return null;
        }
      });

      const newItems = (await Promise.all(newItemPromises)).filter(
        (item): item is InputItem => item !== null
      );

      if (newItems.length === 0) {
        return;
      }

      setState((previous) => {
        const base = previous.commonBase;
        const existingPaths = new Set(
          previous.items.map((item) => item.sourcePath)
        );

        const uniqueNewItems = newItems.filter(
          (item) => !existingPaths.has(item.sourcePath)
        );

        if (uniqueNewItems.length === 0) {
          return previous;
        }

        // Calculate new common base
        let newBase = base;
        for (const item of uniqueNewItems) {
          const parentDir = getDirname(item.sourcePath);
          newBase = newBase ? getCommonBase(newBase, parentDir) : parentDir;
        }

        const updatedItems = [...previous.items, ...uniqueNewItems];
        // If we had no items before, usage of newBase is simple.
        // If we had items, 'newBase' should already be the common base of all including new ones,
        // IF we iterated correctly.
        // The previous logic was incremental: newBase = base ? getCommonBase(base, parentDir) : parentDir
        // Let's replicate that carefully.

        // Re-calculate common base for ALL items to be safe and simple
        // Or stick to the incremental logic.
        // Incremental logic:
        let resolvedBase = base;
        // If it was empty, start with the first new item's dir
        if (!resolvedBase && uniqueNewItems.length > 0) {
          resolvedBase = getDirname(uniqueNewItems[0].sourcePath);
        }

        for (const item of uniqueNewItems) {
          const parentDir = getDirname(item.sourcePath);
          resolvedBase = resolvedBase
            ? getCommonBase(resolvedBase, parentDir)
            : parentDir;
        }

        // However, if previous items existed, we merge with them.
        // The variable 'newBase' in my loop above tried to do this.

        return {
          items: applyRelativePaths(updatedItems, resolvedBase),
          commonBase: resolvedBase,
        };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = (id: string) => {
    setState((previous) => {
      const items = previous.items.filter((item) => item.id !== id);
      const commonBase = items.length === 0 ? null : previous.commonBase;
      return {
        items: applyRelativePaths(items, commonBase),
        commonBase,
      };
    });
  };

  const clearItems = () => {
    setState(resetInputState());
  };

  const hasItems = useMemo(() => state.items.length > 0, [state.items.length]);

  return {
    items: state.items,
    commonBase: state.commonBase,
    addFiles,
    removeItem,
    clearItems,
    hasItems,
    isLoading,
  };
};
