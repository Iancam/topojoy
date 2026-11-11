import { calculateScaleBar } from "./scaleBar";
import { getMetersPerPixelAtLatitude, tilenum_to_lonlat } from "../lib/map/utils";
import { contrastingLuminance } from "./colorUtils";

export function drawScaleBar(sketch, bounds, backgroundColor, font) {
  const size = Math.min(sketch.width, sketch.height);
  const margin = size * 0.03;
  const fontSize = size * 0.016;
  const tickHeight = fontSize * 0.5;
  const baseline = sketch.height - margin;
  const { lat } = tilenum_to_lonlat(
    bounds.box[0],
    bounds.box[1] + baseline / 256,
    bounds.zoom,
  );
  const metersPerPixel = getMetersPerPixelAtLatitude(lat, bounds.zoom);
  const scale = calculateScaleBar(metersPerPixel, sketch.width * 0.18);
  if (!scale) return;

  const foreground = contrastingLuminance(backgroundColor, 10.5);
  sketch.push();
  sketch.textFont(font);
  sketch.textSize(fontSize);
  sketch.textAlign(sketch.LEFT, sketch.BOTTOM);
  sketch.noStroke();
  sketch.fill(backgroundColor);
  sketch.rect(
    margin - fontSize * 0.5,
    baseline - fontSize * 2.5,
    Math.max(scale.width, sketch.textWidth(scale.label)) + fontSize,
    fontSize * 3,
  );
  sketch.fill(foreground);
  sketch.text(scale.label, margin, baseline - tickHeight - fontSize * 0.3);
  sketch.stroke(foreground);
  sketch.strokeWeight(size * 0.002);
  sketch.line(margin, baseline, margin + scale.width, baseline);
  sketch.line(margin, baseline - tickHeight, margin, baseline);
  sketch.line(margin + scale.width, baseline - tickHeight, margin + scale.width, baseline);
  sketch.pop();
}
