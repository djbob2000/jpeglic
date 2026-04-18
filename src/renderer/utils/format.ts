import type { InputItem } from "@bindings";

/**
 * Formats a byte size into a human-readable string.
 * Handles both number and bigint inputs to support large file sizes.
 *
 * NOTE: For bigint values > Number.MAX_SAFE_INTEGER, precision may be lost
 * when converting to Number for calculation. This is acceptable for display
 * purposes but should be avoided for precise calculations.
 *
 * @param bytes - Size in bytes (number or bigint)
 * @returns Formatted string like "1.50 MB"
 */
export const formatSize = (bytes: number | bigint): string => {
  // Convert bigint to number for calculations
  // Precision loss only occurs for files > 9PB which is acceptable for display
  const numBytes = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (numBytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(numBytes) / Math.log(1024)));
  const size = numBytes / 1024 ** index;
  const decimals = index === 0 ? 0 : 2;
  return `${size.toFixed(decimals)} ${units[index]}`;
};

export const describeItem = (item: InputItem): string =>
  `${item.displayName} (${formatSize(item.sizeBytes)})`;

export const playNotification = (volume: number): void => {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    const gain = Math.max(0, Math.min(1, volume / 100));
    gainNode.gain.value = gain * 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator.onended = () => {
      audioContext.close().catch(() => undefined);
    };
  } catch (error) {
    console.warn("Failed to play notification sound", error);
  }
};
