import type { InputItem } from "@common/types";

export type TabKey = "input" | "settings" | "about";

export interface InputState {
  items: InputItem[];
  commonBase: string | null;
}
