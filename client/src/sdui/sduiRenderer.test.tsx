import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SduiDemoPage } from "../pages/SduiDemoPage";

// Real integration test against the actual backend (assumes
// `npm run dev` is running in ../server on :4000) -- this is the
// one test that matters for an SDUI demo: does editing the backend
// JSON actually change what the client renders, with zero client
// rebuild in between?
//
// home.json is meant to be hand-edited (that's the whole demo -- it's
// been a banner+card+button layout and a 3x3 image gallery already in
// this project's history), so this walks whatever is currently in the
// file and checks each node rendered *something* appropriate for its
// type, instead of asserting a frozen snapshot of specific content.
// A content edit should never break this test, only a change to the
// node shape (ids, types) the renderer depends on should.
interface SduiNodeLike {
  type: string;
  props?: Record<string, unknown>;
  children?: SduiNodeLike[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const homeJsonPath = path.resolve(__dirname, "../../../server/data/home.json");
const homeScreen = JSON.parse(readFileSync(homeJsonPath, "utf-8"));

function flattenNodes(node: SduiNodeLike): SduiNodeLike[] {
  return [node, ...(node.children ?? []).flatMap(flattenNodes)];
}

const allNodes = flattenNodes(homeScreen.root);

describe("SDUI render pipeline", () => {
  afterEach(() => cleanup());

  it("renders every node in the current backend JSON with its expected DOM output", async () => {
    render(<SduiDemoPage />);

    // The first node to resolve proves the fetch + render pipeline works;
    // everything after is synchronous once that's in the DOM.
    const firstTextish = allNodes.find((n) => typeof n.props?.text === "string");
    if (firstTextish) {
      expect(await screen.findByText(firstTextish.props!.text as string)).toBeInTheDocument();
    }

    for (const node of allNodes) {
      switch (node.type) {
        case "banner":
        case "text":
        case "button":
          expect(screen.getByText(node.props?.text as string)).toBeInTheDocument();
          break;
        case "card":
          expect(screen.getByText(node.props?.title as string)).toBeInTheDocument();
          break;
        case "image":
          expect(screen.getByAltText(node.props?.alt as string)).toBeInTheDocument();
          break;
        default:
          break;
      }
    }
  });
});
