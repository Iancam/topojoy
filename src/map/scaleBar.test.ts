import { calculateScaleBar } from "./scaleBar";

const metersPerFoot = 0.3048;
const metersPerMile = 1609.344;
const maxWidth = 200;

it.each([
  {
    name: "a close-up map measured in feet",
    metersPerPixel: (1200 * metersPerFoot) / maxWidth,
    expectedDistanceMeters: 1000 * metersPerFoot,
    expectedLabel: "1,000 ft",
  },
  {
    name: "a map spanning a few miles",
    metersPerPixel: (1.5 * metersPerMile) / maxWidth,
    expectedDistanceMeters: metersPerMile,
    expectedLabel: "1 mi",
  },
  {
    name: "a wider map",
    metersPerPixel: (7 * metersPerMile) / maxWidth,
    expectedDistanceMeters: 5 * metersPerMile,
    expectedLabel: "5 mi",
  },
])("chooses a readable distance for $name", ({ metersPerPixel, expectedDistanceMeters, expectedLabel }) => {
  const scale = calculateScaleBar(metersPerPixel, maxWidth)!;
  expect(scale.label).toBe(expectedLabel);
  expect(scale.width * metersPerPixel).toBeCloseTo(expectedDistanceMeters);
  expect(scale.width).toBeLessThanOrEqual(maxWidth);
  expect(scale.width).toBeGreaterThan(maxWidth / 2.5);
});

it("keeps the same distance when the map and bar are downscaled together", () => {
  const metersPerPixel = 10;
  const previewScale = 0.25;
  const original = calculateScaleBar(metersPerPixel, maxWidth)!;
  const preview = calculateScaleBar(metersPerPixel / previewScale, maxWidth * previewScale)!;
  expect(preview.label).toBe(original.label);
  expect(preview.width).toBeCloseTo(original.width * previewScale);
});

it.each([0, -1, NaN, Infinity])("rejects invalid dimensions or resolution: %s", (invalid) => {
  expect(calculateScaleBar(invalid, maxWidth)).toBeNull();
  expect(calculateScaleBar(10, invalid)).toBeNull();
});
