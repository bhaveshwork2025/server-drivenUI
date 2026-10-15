import type { SduiAction } from "./types";

export type NavigateFn = (screenId: string) => void;

export function runAction(action: SduiAction | undefined, navigate: NavigateFn) {
  if (!action) return;

  switch (action.type) {
    case "OPEN_URL":
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    case "SHOW_ALERT":
      window.alert(action.message);
      return;
    case "NAVIGATE":
      navigate(action.screen);
      return;
    default:
      console.warn("Unknown SDUI action", action);
  }
}
