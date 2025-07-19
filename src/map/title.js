import { complement, contrastingLuminance } from "./colorUtils";

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
 *
 * @param {p5} p5
 * @param {string} title
 * @param {string} backgroundColor
 * @param {p5.Font} font
 * @param {Array<p5.FontMetrics>} textBoxes
 * @returns {Array<p5.FontMetrics>}
 */
export function drawTitle(
  p5,
  title,
  latlngBox,
  backgroundColor,
  font,
  textBoxes
) {
  p5.push();
  p5.textAlign(p5.CENTER, p5.BOTTOM);
  p5.textFont(font);
  p5.alpha(255);
  const textSize = titleFontSize(p5.width, p5.height, title);
  p5.textSize(textSize);
  p5.fill(contrastingLuminance(backgroundColor, 10.5));
  p5.text(
    "Snow Mesa",
    p5.width / 2,
    (9 * p5.height) / 10
    // Math.floor((2 * p5.width) / 3),
    // Math.floor(p5.height)
  );
  p5.textAlign(p5.CENTER, p5.TOP);
  console.log(latlngBox);
  const latlng = [latlngBox[0], latlngBox[1]]
    .map((n) => n.toFixed(4))
    .join(", ");
  p5.textSize(textSize / 2);
  p5.text(latlng, p5.width / 2, (9 * p5.height) / 10 + 20);
  textBoxes.push(font.textBounds(title, p5.width / 2, (9 * p5.height) / 10));
  p5.pop();

  return textBoxes;
}
