const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;

export function calculateScaleBar(metersPerPixel: number, maxWidth: number) {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 ||
      !Number.isFinite(maxWidth) || maxWidth <= 0) return null;

  const maxDistanceMeters = metersPerPixel * maxWidth;
  const useMiles = maxDistanceMeters >= METERS_PER_MILE;
  const metersPerUnit = useMiles ? METERS_PER_MILE : METERS_PER_FOOT;
  const maxDistance = maxDistanceMeters / metersPerUnit;
  const magnitude = 10 ** Math.floor(Math.log10(maxDistance));
  const step = [5, 2, 1].find((value) => value * magnitude <= maxDistance)!;
  const distance = step * magnitude;

  return {
    width: (distance * metersPerUnit) / metersPerPixel,
    label: `${distance.toLocaleString("en-US", { maximumSignificantDigits: 3 })} ${useMiles ? "mi" : "ft"}`,
  };
}
