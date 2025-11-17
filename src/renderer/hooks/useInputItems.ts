import { useCallback, useMemo, useState } from "react";
import type { InputItem } from "../../common/types";
import type { InputState } from "../types";
import {
	applyRelativePaths,
	expandFilePaths,
	generateId,
	getCommonBase,
	resetInputState,
} from "../utils/fileSystem";

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

	const addFiles = useCallback(async (paths: string[]) => {
		if (paths.length === 0) {
			return;
		}

		const expandedPaths = await expandFilePaths(paths);
		if (expandedPaths.length === 0) {
			return;
		}

		setState((previous) => {
			const base = previous.commonBase;
			const existingPaths = new Set(previous.items.map((item) => item.sourcePath));

			for (const filePath of expandedPaths) {
				if (existingPaths.has(filePath)) {
					continue;
				}

				// Get file stats asynchronously
				window.electron.fs
					.stat(filePath)
					.then((stats) => {
						if (stats.isDirectory) {
							return;
						}

						const parentDir = getDirname(filePath);
						const newBase = base ? getCommonBase(base, parentDir) : parentDir;

						const newItem: InputItem = {
							id: generateId(),
							sourcePath: filePath,
							displayName: getBasename(filePath),
							relativePath: "",
							sizeBytes: stats.size,
							lastModified: stats.mtime,
						};

						setState((prevState) => {
							const updatedItems = [...prevState.items, newItem];
							const resolvedBase = updatedItems.length === 0 ? null : newBase;

							return {
								items: applyRelativePaths(updatedItems, resolvedBase),
								commonBase: resolvedBase,
							};
						});
					})
					.catch((error) => {
						console.warn("Skipping file", filePath, error);
					});
			}

			return previous;
		});
	}, []);

	const removeItem = useCallback((id: string) => {
		setState((previous) => {
			const items = previous.items.filter((item) => item.id !== id);
			const commonBase = items.length === 0 ? null : previous.commonBase;
			return {
				items: applyRelativePaths(items, commonBase),
				commonBase,
			};
		});
	}, []);

	const clearItems = useCallback(() => {
		setState(resetInputState());
	}, []);

	const hasItems = useMemo(() => state.items.length > 0, [state.items.length]);

	return {
		items: state.items,
		commonBase: state.commonBase,
		addFiles,
		removeItem,
		clearItems,
		hasItems,
	};
};
