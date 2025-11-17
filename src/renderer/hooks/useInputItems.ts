import * as fs from "node:fs";
import * as path from "node:path";
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

export const useInputItems = () => {
	const [state, setState] = useState<InputState>(resetInputState());

	const addFiles = useCallback(async (paths: string[]) => {
		if (paths.length === 0) {
			return;
		}

		const expandedPaths = expandFilePaths(paths);
		if (expandedPaths.length === 0) {
			return;
		}

		setState((previous) => {
			let base = previous.commonBase;
			const existingPaths = new Set(previous.items.map((item) => item.sourcePath));
			const nextItems: InputItem[] = [...previous.items];
			let added = false;

			for (const filePath of expandedPaths) {
				if (existingPaths.has(filePath)) {
					continue;
				}

				let stats: fs.Stats;
				try {
					stats = fs.statSync(filePath);
				} catch (error) {
					console.warn("Skipping file", filePath, error);
					continue;
				}

				if (stats.isDirectory()) {
					continue;
				}

				const parentDir = path.dirname(filePath);
				base = base ? getCommonBase(base, parentDir) : parentDir;

				nextItems.push({
					id: generateId(),
					sourcePath: filePath,
					displayName: path.basename(filePath),
					relativePath: "",
					sizeBytes: stats.size,
					lastModified: stats.mtime.getTime(),
				});
				added = true;
			}

			if (!added) {
				return previous;
			}

			const resolvedBase = nextItems.length === 0 ? null : base;

			return {
				items: applyRelativePaths(nextItems, resolvedBase),
				commonBase: resolvedBase,
			};
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
