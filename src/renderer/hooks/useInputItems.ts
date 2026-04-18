import type { InputItem } from "@common/types";
import type { InputState } from "@renderer/types";
import {
  applyRelativePaths,
  expandFilePaths,
  generateId,
  getCommonBase,
  resetInputState,
} from "@utils/fileSystem";
import tauriAPI from "@utils/tauriAPI";
import { useMemo, useState } from "react";

// Simple path utilities for browser environment
const getDirname = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/).filter(Boolean);
  const separator = filePath.includes("\\") ? "\\" : "/";
  const root = filePath.startsWith("/") ? "/" : "";
  return root + parts.slice(0, -1).join(separator) || (separator === "\\" ? "C:\\" : "/");
};

const getBasename = (filePath: string): string => {
  return filePath.split(/[/\\]/).pop() || filePath;
};

export const useInputItems = () => {
  const [state, setState] = useState<InputState>(resetInputState());
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const addFiles = async (paths: string[]) => {
    if (paths.length === 0) {
      return;
    }

    setIsLoading(true);
    setLoadedCount(0);
    try {
      const expandedPaths = await expandFilePaths(paths);
      if (expandedPaths.length === 0) {
        return;
      }

      const updateStateWithNewItems = (newItems: InputItem[]) => {
        setState((previous) => {
          const base = previous.commonBase;
          const existingPaths = new Set(previous.items.map((item) => item.sourcePath));
          const uniqueNewItems = newItems.filter((item) => !existingPaths.has(item.sourcePath));

          if (uniqueNewItems.length === 0) return previous;

          const updatedItems = [...previous.items, ...uniqueNewItems];

          let resolvedBase = base;
          if (!resolvedBase && uniqueNewItems.length > 0) {
            resolvedBase = getDirname(uniqueNewItems[0].sourcePath);
          }

          for (const item of uniqueNewItems) {
            const parentDir = getDirname(item.sourcePath);
            resolvedBase = resolvedBase ? getCommonBase(resolvedBase, parentDir) : parentDir;
          }

          return {
            items: applyRelativePaths(updatedItems, resolvedBase),
            commonBase: resolvedBase,
          };
        });
      };

      let totalProcessed = 0;

      for (let i = 0; i < expandedPaths.length; ) {
        const chunkSize = totalProcessed < 300 ? 50 : 100;
        const chunkPaths = expandedPaths.slice(i, i + chunkSize);

        const chunkResults = await Promise.all(
          chunkPaths.map(async (filePath) => {
            try {
              const stats = await tauriAPI.fs.stat(filePath);
              if (stats.isDirectory) return null;

              return {
                id: generateId(),
                sourcePath: filePath,
                displayName: getBasename(filePath),
                relativePath: "",
                sizeBytes: stats.size,
                lastModified: stats.mtime,
                isProcessed: false, // Default to false, will be updated in background
              } as InputItem;
            } catch (error) {
              console.warn("Skipping file", filePath, error);
              return null;
            }
          }),
        );

        const validItems = chunkResults.filter((item): item is InputItem => item !== null);

        if (validItems.length > 0) {
          totalProcessed += validItems.length;
          updateStateWithNewItems(validItems);
          setLoadedCount(totalProcessed);
        }

        i += chunkSize;

        if (i < 100) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Background update for processed status
      if (expandedPaths.length > 0) {
        tauriAPI.fs
          .checkProcessedBatch(expandedPaths)
          .then((processedResults) => {
            const processedMap = new Map(processedResults.map((r) => [r.path, r.isProcessed]));
            setState((previous) => ({
              ...previous,
              items: previous.items.map((item) => ({
                ...item,
                isProcessed: processedMap.has(item.sourcePath)
                  ? processedMap.get(item.sourcePath)
                  : item.isProcessed,
              })),
            }));
          })
          .catch((err) => {
            console.error("Background processed check failed:", err);
          });
      }
    } finally {
      setIsLoading(false);
      setLoadedCount(0);
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
    loadedCount,
  };
};
