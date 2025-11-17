import { useEffect } from "react";

export const useUpdateNotifications = () => {
	useEffect(() => {
		const unsubscribe = window.electron.update.onStatus((status) => {
			switch (status.event) {
				case "update-available":
					if (status.data && typeof status.data === "object" && "version" in status.data) {
						const { version } = status.data as { version?: string };
						if (version && window.confirm(`New version ${version} is available. Download now?`)) {
							window.electron.update.download().catch((error) => {
								console.error("Failed to start update download", error);
							});
						}
					}
					break;
				case "update-downloaded":
					if (window.confirm("Update downloaded. Restart to install?")) {
						window.electron.update.install().catch((error) => {
							console.error("Failed to install update", error);
						});
					}
					break;
				case "download-progress":
					if (status.data && typeof status.data === "object" && "percent" in status.data) {
						const percentValue = (status.data as { percent?: number }).percent;
						if (typeof percentValue === "number") {
							console.log(`Download progress: ${Math.round(percentValue)}%`);
						}
					}
					break;
				case "update-error":
					if (status.data && typeof status.data === "object" && "message" in status.data) {
						const { message } = status.data as { message?: string };
						if (message) {
							console.error("Update error:", message);
						}
					}
					break;
				default:
					break;
			}
		});

		return () => {
			unsubscribe?.();
		};
	}, []);
};
