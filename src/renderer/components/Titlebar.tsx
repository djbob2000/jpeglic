import type React from "react";
import { cn } from "@utils/cn";
import tauriAPI from "@utils/tauriAPI";

export const Titlebar = () => {
	const isMac = tauriAPI.isMac;

	return (
		<header
			data-tauri-drag-region
			className={cn("titlebar relative flex items-center justify-between", isMac && "mac")}
		>
			<div className="flex flex-1 items-center justify-center pointer-events-none" data-tauri-drag-region>
				<img src="/icons/logo.svg" alt="" className="titlebar-icon mr-2" />
				<span className="text-sm font-semibold">Jpeglic • Best Jpegli Converter</span>
			</div>
			{!isMac && (
				<div className="titlebar-controls relative z-10 flex">
					<button
						type="button"
						className="titlebar-button minimize"
						onClick={() => tauriAPI.window.minimize()}
						aria-label="Minimize"
					>
						<svg aria-hidden="true" viewBox="0 0 10 10">
							<path d="M1 5h8" stroke="currentColor" fill="none" />
						</svg>
					</button>
					<button
						type="button"
						className="titlebar-button maximize"
						onClick={() => tauriAPI.window.maximize()}
						aria-label="Maximize"
					>
						<svg aria-hidden="true" viewBox="0 0 10 10">
							<rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" fill="none" />
						</svg>
					</button>
					<button
						type="button"
						className="titlebar-button close"
						onClick={() => tauriAPI.window.close()}
						aria-label="Close"
					>
						<svg aria-hidden="true" viewBox="0 0 10 10">
							<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" fill="none" />
						</svg>
					</button>
				</div>
			)}
		</header>
	);
};
