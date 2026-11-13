import { isMapPreviewStale } from "./mapPreview";

const printSizeUpdate = {
  "print.size": { width: 8, height: 10 },
  "print.sizeActual": { width: 8, height: 10 },
  "print.price": 2500,
};

it.each([
  { name: "print type", update: "print.type" },
  { name: "print size and price", update: printSizeUpdate },
])("keeps a valid preview valid when changing $name", ({ update }) => {
  expect(isMapPreviewStale(false, update)).toBe(false);
});

it.each([
  { name: "print type", update: "print.type" },
  { name: "print size and price", update: printSizeUpdate },
])("keeps an already-stale preview stale when changing $name", ({ update }) => {
  expect(isMapPreviewStale(true, update)).toBe(true);
});

it.each([
  { name: "map title", update: "title.text" },
  { name: "map design alongside print settings", update: { ...printSizeUpdate, background: "#ffffff" } },
])("invalidates the preview when changing $name", ({ update }) => {
  expect(isMapPreviewStale(false, update)).toBe(true);
});
