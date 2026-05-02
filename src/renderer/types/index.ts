import type { InputItem } from "@bindings";

export type TabKey = "input" | "settings" | "about";

export interface InputState {
  items: InputItem[];
  commonBase: string | null;
}
