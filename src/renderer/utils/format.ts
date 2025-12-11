import type { InputItem } from "@common/types";

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const size = bytes / 1024 ** index;
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
