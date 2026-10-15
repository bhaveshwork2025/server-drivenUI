const API_BASE = window.location.origin; // same origin as this admin page

const els = {
  screenSelect: document.getElementById("screen-select"),
  bgColor: document.getElementById("bg-color"),
  bgColorText: document.getElementById("bg-color-text"),
  bannerText: document.getElementById("banner-text"),
  bannerColor: document.getElementById("banner-color"),
  bannerColorText: document.getElementById("banner-color-text"),
  bannerAnim: document.getElementById("banner-anim"),
  infoText: document.getElementById("info-text"),
  cardTitle: document.getElementById("card-title"),
  cardSubtitle: document.getElementById("card-subtitle"),
  buttonText: document.getElementById("button-text"),
  buttonUrl: document.getElementById("button-url"),
  buttonColor: document.getElementById("button-color"),
  buttonColorText: document.getElementById("button-color-text"),
  rawToggle: document.getElementById("raw-toggle"),
  rawJson: document.getElementById("raw-json"),
  publish: document.getElementById("publish"),
  status: document.getElementById("status"),
  meta: document.getElementById("meta"),
  preview: document.getElementById("preview"),
  reloadPreview: document.getElementById("reload-preview"),
};

let currentScreen = null; // the full {screenId, version, updatedAt, root} last loaded from the server

function findById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

// Keep a color swatch and its hex text input in sync both ways.
function linkColorPair(colorInput, textInput) {
  colorInput.addEventListener("input", () => (textInput.value = colorInput.value));
  textInput.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) colorInput.value = textInput.value;
  });
}
linkColorPair(els.bgColor, els.bgColorText);
linkColorPair(els.bannerColor, els.bannerColorText);
linkColorPair(els.buttonColor, els.buttonColorText);

function setStatus(message, kind) {
  els.status.textContent = message;
  els.status.className = kind || "";
}

async function loadScreenList() {
  const res = await fetch(`${API_BASE}/api/screens`);
  const { screens } = await res.json();
  els.screenSelect.innerHTML = "";
  for (const id of screens) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    els.screenSelect.appendChild(opt);
  }
}

function populateFormFromScreen(screen) {
  const root = screen.root;
  const banner = findById(root, "banner");
  const infoText = findById(root, "infoText");
  const card = findById(root, "card1");
  const button = findById(root, "ctaButton");

  els.bgColor.value = root.style?.backgroundColor ?? "#111827";
  els.bgColorText.value = els.bgColor.value;

  if (banner) {
    els.bannerText.value = banner.props?.text ?? "";
    els.bannerColor.value = banner.style?.backgroundColor ?? "#22C55E";
    els.bannerColorText.value = els.bannerColor.value;
    els.bannerAnim.value = banner.enterAnimation ?? "fade";
  }
  if (infoText) els.infoText.value = infoText.props?.text ?? "";
  if (card) {
    els.cardTitle.value = card.props?.title ?? "";
    els.cardSubtitle.value = card.props?.subtitle ?? "";
  }
  if (button) {
    els.buttonText.value = button.props?.text ?? "";
    els.buttonUrl.value = button.action?.url ?? "";
    els.buttonColor.value = button.style?.backgroundColor ?? "#FF5722";
    els.buttonColorText.value = els.buttonColor.value;
  }

  els.rawJson.value = JSON.stringify(screen, null, 2);
  els.meta.textContent = `Loaded v${screen.version} - last updated ${screen.updatedAt ?? "unknown"}`;
}

async function loadScreen(screenId) {
  setStatus("Loading...", "");
  try {
    const res = await fetch(`${API_BASE}/api/screen/${screenId}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    currentScreen = await res.json();
    populateFormFromScreen(currentScreen);
    setStatus("Loaded.", "ok");
  } catch (err) {
    setStatus(`Failed to load: ${err.message}`, "err");
  }
}

// Writes the form field values back into the in-memory node tree,
// mutating the exact nodes they came from. This is the admin's whole
// job: turn friendly fields into the same generic JSON the renderer
// already knows how to draw.
function applyFormToScreen() {
  const root = currentScreen.root;
  root.style = root.style || {};
  root.style.backgroundColor = els.bgColor.value;

  const banner = findById(root, "banner");
  if (banner) {
    banner.props = { ...banner.props, text: els.bannerText.value };
    banner.style = { ...banner.style, backgroundColor: els.bannerColor.value };
    banner.enterAnimation = els.bannerAnim.value;
  }
  const infoText = findById(root, "infoText");
  if (infoText) infoText.props = { ...infoText.props, text: els.infoText.value };

  const card = findById(root, "card1");
  if (card) {
    card.props = { ...card.props, title: els.cardTitle.value, subtitle: els.cardSubtitle.value };
  }

  const button = findById(root, "ctaButton");
  if (button) {
    button.props = { ...button.props, text: els.buttonText.value };
    button.style = { ...button.style, backgroundColor: els.buttonColor.value };
    button.action = { ...button.action, type: "OPEN_URL", url: els.buttonUrl.value };
  }
}

els.rawToggle.addEventListener("click", () => {
  const showing = els.rawJson.style.display !== "none";
  if (!showing) {
    // about to show raw -- refresh it from current form state first
    applyFormToScreen();
    els.rawJson.value = JSON.stringify(currentScreen, null, 2);
  }
  els.rawJson.style.display = showing ? "none" : "block";
  els.rawToggle.textContent = showing ? "Show raw JSON instead" : "Hide raw JSON";
});

els.publish.addEventListener("click", async () => {
  if (!currentScreen) return;
  els.publish.disabled = true;
  setStatus("Publishing...", "");

  try {
    const usingRaw = els.rawJson.style.display !== "none";
    let rootToSend;
    if (usingRaw) {
      const parsed = JSON.parse(els.rawJson.value);
      rootToSend = parsed.root ?? parsed;
    } else {
      applyFormToScreen();
      rootToSend = currentScreen.root;
    }

    const screenId = els.screenSelect.value;
    const res = await fetch(`${API_BASE}/api/screen/${screenId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: rootToSend }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || body.error || `HTTP ${res.status}`);

    currentScreen = body;
    populateFormFromScreen(currentScreen);
    setStatus(`Published as v${body.version}. Reload the preview to see it.`, "ok");
  } catch (err) {
    setStatus(`Publish failed: ${err.message}`, "err");
  } finally {
    els.publish.disabled = false;
  }
});

els.reloadPreview.addEventListener("click", () => {
  els.preview.src = els.preview.src;
});

els.screenSelect.addEventListener("change", () => loadScreen(els.screenSelect.value));

(async function init() {
  await loadScreenList();
  if (els.screenSelect.value) await loadScreen(els.screenSelect.value);
})();
