import type { CSSProperties } from "react";
import type { SduiStyle } from "./types";

// Translates the server's abstract style keys into real CSS.
// This indirection is what lets "elevation: 4" mean "box-shadow"
// on web and "native elevation" on a real mobile shell -- the
// server never has to know which platform is rendering it.
export function toCssProperties(style?: SduiStyle): CSSProperties {
  if (!style) return {};

  const css: CSSProperties = {};

  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.color) css.color = style.color;
  if (style.padding !== undefined) css.padding = style.padding;
  if (style.margin !== undefined) css.margin = style.margin;
  if (style.borderRadius !== undefined) css.borderRadius = style.borderRadius;
  if (style.fontSize !== undefined) css.fontSize = style.fontSize;
  if (style.fontWeight !== undefined) css.fontWeight = style.fontWeight;
  if (style.width !== undefined) css.width = style.width;
  if (style.height !== undefined) css.height = style.height;

  if (style.direction || style.align || style.justify || style.gap !== undefined) {
    css.display = "flex";
    css.flexDirection = style.direction ?? "column";
    if (style.align) css.alignItems = style.align;
    if (style.justify) css.justifyContent = style.justify;
    if (style.gap !== undefined) css.gap = style.gap;
  }

  if (style.elevation !== undefined && style.elevation > 0) {
    const e = style.elevation;
    css.boxShadow = `0 ${e}px ${e * 2}px rgba(0, 0, 0, ${Math.min(0.3, e * 0.04)})`;
  }

  return css;
}
