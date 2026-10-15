// The shapes the client agrees, in advance, to understand.
// The server can send any JSON that fits these shapes, as often
// as it likes -- that's the entire "no app-store update" trick.
// The client never ships new TYPES over the wire, only new VALUES.

export type SduiAction =
  | { type: "OPEN_URL"; url: string }
  | { type: "SHOW_ALERT"; message: string }
  | { type: "NAVIGATE"; screen: string };

export type SduiStyle = Partial<{
  backgroundColor: string;
  color: string;
  padding: number;
  margin: number;
  borderRadius: number;
  elevation: number; // translated into a box-shadow
  fontSize: number;
  fontWeight: number | string;
  direction: "row" | "column";
  align: "flex-start" | "center" | "flex-end" | "stretch";
  justify: "flex-start" | "center" | "flex-end" | "space-between";
  gap: number;
  width: string | number;
  height: string | number;
}>;

export type SduiEnterAnimation = "fade" | "slideUp" | "pulse";

// The known set of node "types". Adding a brand-new type still
// requires a client code change (someone has to teach the renderer
// how to draw it) -- what you get OTA is new arrangements, text,
// colors, images and actions built from the types already known.
export type SduiNodeType =
  | "screen"
  | "container"
  | "text"
  | "image"
  | "banner"
  | "button"
  | "card"
  | "spacer";

export interface SduiNode {
  type: SduiNodeType;
  id?: string;
  props?: Record<string, unknown>;
  style?: SduiStyle;
  action?: SduiAction;
  enterAnimation?: SduiEnterAnimation;
  children?: SduiNode[];
}

export interface SduiScreen {
  screenId: string;
  version: number;
  root: SduiNode;
}
