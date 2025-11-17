import type { ProcessingSettings } from "../../common/types";

export const mergeSettings = (
	base: ProcessingSettings,
	incoming?: Partial<ProcessingSettings>,
): ProcessingSettings => ({
	output: {
		...base.output,
		...(incoming?.output ?? {}),
	},
	downscale: {
		...base.downscale,
		...(incoming?.downscale ?? {}),
	},
	advanced: {
		...base.advanced,
		...(incoming?.advanced ?? {}),
	},
});
