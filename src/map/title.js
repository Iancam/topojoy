import { complement, contrastingLuminance } from "./colorUtils";
import { placeWithoutCollision } from "./layers";

/**
 * Pick a visually balanced title font-size.
 *
 * @param {number} w   – canvas width  (px)
 * @param {number} h   – canvas height (px)
 * @param {string} txt – title text
 * @returns {number}   – font-size in px
 */
function titleFontSize(w, h, txt) {
  const chars = Math.max(txt.length, 1); // avoid /0
  const maxWidthPx = w * 0.66; // we draw in ⅔ width
  const maxHeightPx = h * 0.12; // keep it low on page

  // “average” latin glyph ≈ 0.55 × fontSize wide.
  const sizeByWidth = maxWidthPx / (chars * 0.55);
  const sizeByHeight = maxHeightPx / 1.0; // 1 × fontSize tall

  // final size: the most restrictive of the two, clamped to sane bounds
  return Math.round(Math.max(20, Math.min(sizeByWidth, sizeByHeight, 140)));
}

/**
 * function must be called twice, once with drawText = false, and once with drawText = true
 * when drawText is false, it will only calculate the bounding boxes
 * when drawText is true, it will draw the text
 * @param {p5} p5
 * @param {string} title
 * @param {string} backgroundColor
 * @param {p5.Font} font
 * @param {Array<p5.FontMetrics>} textBoxes
 * @returns {Array<p5.FontMetrics>}
 */
export function drawTitle(
  sketch,
  title,
  latlngBox,
  backgroundColor,
  font,
  drawText,
  textBoxes
) {
  let labels = { [title]: [sketch.width / 2, (9 * sketch.height) / 10] };
  const textSize = titleFontSize(sketch.width, sketch.height, title);
  sketch.push();
  sketch.textAlign(sketch.CENTER, sketch.BOTTOM);
  sketch.textFont(font);
  sketch.alpha(255);
  sketch.textSize(textSize);
  sketch.fill(contrastingLuminance(backgroundColor, 10.5));
  textBoxes = placeWithoutCollision(
    sketch,
    labels,
    font,
    [],
    drawText,
    textBoxes
  );
  sketch.pop();
  // draw latlng
  sketch.push();
  sketch.textFont(font);
  sketch.textAlign(sketch.CENTER, sketch.TOP);
  sketch.fill(contrastingLuminance(backgroundColor, 10.5));
  const latlng = [latlngBox[0], latlngBox[1]]
    .map((n) => n.toFixed(4))
    .join(", ");

  sketch.textSize(textSize / 2);

  labels = { [latlng]: [sketch.width / 2, (9 * sketch.height) / 10 + 20] };

  textBoxes = placeWithoutCollision(
    sketch,
    labels,
    font,
    [],
    drawText,
    textBoxes
  );

  sketch.pop();

  return textBoxes;
}
