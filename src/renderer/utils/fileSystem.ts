import * as fs from "node:fs";
import * as path from "node:path";
import type { InputItem } from "../../common/types";
import type { InputState } from "../types";

export const generateId = (): string => Math.random().toString(36).substring(2, 10);

export const collectFilesRecursively = (directory: string): string[] => {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch (error) {
		console.warn("Skipping directory", directory, error);
		return [];
	}

	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectFilesRecursively(fullPath));
		} else {
			files.push(fullPath);
		}
	}

	return files;
};

export const expandFilePaths = (pathsToExpand: string[]): string[] => {
	const result: string[] = [];

	for (const entry of pathsToExpand) {
		try {
			const stats = fs.statSync(entry);
			if (stats.isDirectory()) {
				result.push(...collectFilesRecursively(entry));
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
	const partsA = a.split(path.sep).filter(Boolean);
	const partsB = b.split(path.sep).filter(Boolean);
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
		return process.platform === "win32" ? path.parse(a).root : "/";
	}

	const root = path.parse(a).root;
	return path.join(root, ...common);
};

export const applyRelativePaths = (items: InputItem[], base: string | null): InputItem[] => {
	if (items.length === 0) {
		return [];
	}

	if (!base) {
		return items.map((item) => ({
			...item,
			relativePath: path.basename(item.sourcePath),
		}));
	}

	return items.map((item) => ({
		...item,
		relativePath: path.relative(base, item.sourcePath),
	}));
};

export const resetInputState = (): InputState => ({
	items: [],
	commonBase: null,
});
