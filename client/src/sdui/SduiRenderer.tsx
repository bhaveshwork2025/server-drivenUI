import type { SduiNode } from "./types";
import { toCssProperties } from "./style";
import { runAction, type NavigateFn } from "./actions";

interface Props {
  node: SduiNode;
  navigate: NavigateFn;
}

// One renderer, recursively applied. Every node in the tree --
// no matter how deeply nested -- goes through this same switch.
// That's what makes the UI "server-driven": there is no screen-
// specific React component on the client, just this generic engine
// plus a fixed vocabulary of primitives it already knows how to draw.
export function SduiRenderer({ node, navigate }: Props) {
  const style = toCssProperties(node.style);
  const animationClass = node.enterAnimation ? `sdui-anim-${node.enterAnimation}` : "";
  const children = node.children?.map((child, i) => (
    <SduiRenderer key={child.id ?? i} node={child} navigate={navigate} />
  ));

  switch (node.type) {
    case "screen":
      return (
        <div className={`sdui-screen ${animationClass}`} style={style}>
          {children}
        </div>
      );

    case "container":
      return (
        <div className={`sdui-container ${animationClass}`} style={style}>
          {children}
        </div>
      );

    case "text":
      return (
        <p className={`sdui-text ${animationClass}`} style={style}>
          {String(node.props?.text ?? "")}
        </p>
      );

    case "image":
      return (
        <img
          className={`sdui-image ${animationClass}`}
          style={style}
          src={String(node.props?.src ?? "")}
          alt={String(node.props?.alt ?? "")}
        />
      );

    case "banner":
      return (
        <div
          className={`sdui-banner ${animationClass}`}
          style={style}
          onClick={() => runAction(node.action, navigate)}
        >
          {String(node.props?.text ?? "")}
        </div>
      );

    case "card":
      return (
        <div
          className={`sdui-card ${animationClass}`}
          style={style}
          onClick={() => runAction(node.action, navigate)}
        >
          <div className="sdui-card-title">{String(node.props?.title ?? "")}</div>
          {node.props?.subtitle ? (
            <div className="sdui-card-subtitle">{String(node.props.subtitle)}</div>
          ) : null}
          {children}
        </div>
      );

    case "button":
      return (
        <button
          className={`sdui-button ${animationClass}`}
          style={style}
          onClick={() => runAction(node.action, navigate)}
        >
          {String(node.props?.text ?? "")}
        </button>
      );

    case "spacer":
      return <div style={{ height: Number(node.props?.height ?? 8) }} />;

    default:
      console.warn("Unknown SDUI node type", node.type);
      return null;
  }
}
