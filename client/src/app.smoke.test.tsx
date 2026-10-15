import { describe, expect, it, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

// Render-smoke tests: click through every nav destination and a couple of
// the deeper load flows (detail -> edit -> create) and assert each page's
// heading renders without throwing. This is the closest thing to "open it
// in a browser" available without a visual browser tool — it won't catch
// layout/visual issues, but it does catch crashes from bad lookups,
// missing imports, or undefined property access that tsc can't see.
//
// Assertions are scoped to .shell__content (the routed page area) and nav
// clicks to .shell__sidebar, because jsdom doesn't evaluate the CSS media
// query that toggles sidebar vs. bottom-nav visibility — both navs (and
// several page titles, like "Loads" or "Billing") render the same label
// text at once, so unscoped queries would be ambiguous.
function content(): HTMLElement {
  const el = document.querySelector(".shell__content");
  if (!el) throw new Error("shell__content not found");
  return el as HTMLElement;
}

function sidebar(): HTMLElement {
  const el = document.querySelector(".shell__sidebar");
  if (!el) throw new Error("shell__sidebar not found");
  return el as HTMLElement;
}

describe("App navigation smoke test", () => {
  afterEach(() => cleanup());

  const simplePages: [navLabel: string, headingText: string][] = [
    ["Markets", "Markets"],
    ["Loads", "Loads"],
    ["Planning", "Load Planning"],
    ["Dispatch", "Dispatch Board"],
    ["Drivers", "Drivers"],
    ["Vehicles", "Vehicles & Equipment"],
    ["Carriers", "Carriers"],
    ["Customers", "Customers"],
    ["Documents", "Document Center"],
    ["Billing", "Billing"],
    ["Reports", "Reports"],
    ["Exceptions", "Exceptions"],
    ["Settings", "Users & Roles"],
    ["SDUI Demo", "Server-Driven UI Demo"],
  ];

  for (const [navLabel, headingText] of simplePages) {
    it(`navigates to "${navLabel}" without crashing`, () => {
      render(<App />);
      fireEvent.click(within(sidebar()).getByText(navLabel));
      expect(within(content()).getByText(headingText)).toBeInTheDocument();
    });
  }

  it("opens a load's detail page, edit form, and the new-load form", () => {
    render(<App />);
    fireEvent.click(within(sidebar()).getByText("Loads"));

    const table = within(content()).getAllByRole("table")[0];
    const firstRow = within(table).getAllByRole("row")[1];
    fireEvent.click(firstRow);

    expect(within(content()).getByText("Back to Loads")).toBeInTheDocument();
    expect(within(content()).getByText("Overview")).toBeInTheDocument();

    fireEvent.click(within(content()).getByText("Edit"));
    expect(within(content()).getByText(/Edit LD-/)).toBeInTheDocument();
    expect(within(content()).getByText("Save Changes")).toBeInTheDocument();

    fireEvent.click(within(sidebar()).getByText("Loads"));
    fireEvent.click(within(content()).getByText("New Load"));
    expect(within(content()).getByText("New Load")).toBeInTheDocument();
    expect(within(content()).getByText("Submit Load")).toBeInTheDocument();
  });

  it("hides ops-only nav items when switching to a portal role (driver)", () => {
    render(<App />);
    expect(within(sidebar()).getByText("Billing")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Viewing as/i), { target: { value: "driver" } });

    expect(within(sidebar()).queryByText("Billing")).not.toBeInTheDocument();
    expect(within(sidebar()).queryByText("Dispatch")).not.toBeInTheDocument();
    expect(within(sidebar()).getByText("Markets")).toBeInTheDocument();
  });

  it("changes a load's status through the status modal", () => {
    render(<App />);
    fireEvent.click(within(sidebar()).getByText("Loads"));

    const table = within(content()).getAllByRole("table")[0];
    const draftRow = within(table)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Draft"));
    expect(draftRow).toBeTruthy();
    fireEvent.click(draftRow as HTMLElement);

    fireEvent.click(within(content()).getByText("Change Status"));
    fireEvent.click(screen.getByRole("button", { name: /Submitted/i }));

    expect(within(content()).getByText(/Submitted/)).toBeInTheDocument();
  });

  it("opens the mobile bottom-nav 'More' sheet and navigates from it", () => {
    render(<App />);
    fireEvent.click(screen.getByText("More"));

    const sheet = document.querySelector(".more-sheet");
    expect(sheet).toBeTruthy();
    fireEvent.click(within(sheet as HTMLElement).getByText("Billing"));

    expect(within(content()).getByText("Billing")).toBeInTheDocument();
    expect(document.querySelector(".more-sheet")).not.toBeInTheDocument();
  });
});
