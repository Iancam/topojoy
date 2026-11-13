export function isMapPreviewStale(
  wasStale: boolean,
  update: string | Record<string, unknown>,
): boolean {
  const keys = typeof update === "string" ? [update] : Object.keys(update);
  return wasStale || keys.some((key) => !key.startsWith("print."));
}
