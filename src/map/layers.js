import p5 from "p5";
import {
  degreesToRadians,
  radiansToDegrees,
  lerpAngle,
  collision,
  ringOrientation,
} from "../lib/map/utils";
import {
  contrastingLuminance,
  luminanceContrastRatio,
  res,
} from "./colorUtils";

import chroma from "chroma-js";
/**
 * Creates a curve that meanders through the terrain, with control over aspect, slope, and height of the curve.
 * @param {number} x x-coordinate of the starting point
 * @param {number} y y-coordinate of the starting point
 * @param {number} length The length of the curve in steps
 * @param {number} step_length The length of each step of the curve
 * @param {object} topo The terrain object
 * @param {object} options An object with an optional `angleTransform` method.
 *  `angleTransform` takes the current aspect of the curve, and an array of [height, slope, aspect1],
 *  and returns the new aspect of the curve.
 *  The `angleTransform` method is called with the current aspect of the curve as the first argument,
 *  and the array of [height, slope, aspect1] as the second argument.
 *  The `angleTransform` method is expected to return the new aspect of the curve.
 * @returns {Array<Array<number>>} The curve as an array of [x, y, aspect] points.
 */
export function makeCurve(
  x,
  y,
  length,
  step_length,
  topo,
  options = { angleTransform: (a) => a }
) {
  let curvePoints = [[x, y, topo.pixels[y][x][2]]];
  let last = (array) => array[array.length - 1];
  for (let i = 0; i < length; i++) {
    const [height, slope, aspect1] = topo.pixels[y]?.[x] || [
      undefined,
      undefined,
      undefined,
    ];
    const [, , lastAspect] = last(curvePoints);
    const heightScalar = 1; //- scaledH(topo)(height);
    const aspect = degreesToRadians(
      lerpAngle(
        lastAspect,
        options.angleTransform(aspect1, [height, slope, aspect1]),
        0.9
      )
    );
    if (!aspect1) {
      break;
    }
    const x_step = heightScalar * step_length * Math.cos(aspect);
    const y_step = heightScalar * step_length * Math.sin(aspect);
    x = Math.floor(x + x_step);
    y = Math.floor(y + y_step);
    curvePoints.push([x, y, radiansToDegrees(aspect)]);
  }
  return curvePoints;
}

export function drawCurve(sketch, curve, weight) {
  sketch.noFill();
  sketch.strokeWeight(weight);
  sketch.beginShape();
  curve.forEach(([x, y]) => sketch.curveVertex(x, y));
  sketch.endShape();
}

// Draws a text string along a polyline by placing each character at
// a path position and rotating to the local tangent.
function drawTextAlongLine(sketch, text, coords, { font, textSize, color }) {
  if (!coords || coords.length < 2 || !text) return;

  // Ensure rendering context
  sketch.push();
  if (font) sketch.textFont(font);
  if (textSize) sketch.textSize(textSize);
  if (color) sketch.fill(color);
  sketch.noStroke();
  sketch.textAlign(sketch.CENTER, sketch.CENTER);

  // Precompute segment lengths and cumulative lengths
  const segs = [];
  let totalLen = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len > 0.0001) {
      segs.push({ x1, y1, x2, y2, len });
      totalLen += len;
    }
  }
  if (!segs.length) {
    sketch.pop();
    return;
  }

  // Measure entire string width
  const charWidths = [];
  let textWidth = 0;
  for (const ch of text) {
    const w = sketch.textWidth(ch);
    charWidths.push(w);
    textWidth += w;
  }

  // Center the text along the path
  let offset = Math.max(0, (totalLen - textWidth) / 2);

  // Helper: get point and angle at distance d along the polyline
  function pointAtDistance(d) {
    let acc = 0;
    for (const s of segs) {
      if (acc + s.len >= d) {
        const t = (d - acc) / s.len;
        const x = s.x1 + t * (s.x2 - s.x1);
        const y = s.y1 + t * (s.y2 - s.y1);
        const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        return { x, y, angle };
      }
      acc += s.len;
    }
    const last = segs[segs.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: Math.atan2(last.y2 - last.y1, last.x2 - last.x1),
    };
  }

  // Place characters along the path
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const w = charWidths[i];
    const mid = offset + w / 2;
    const { x, y, angle } = pointAtDistance(mid);
    sketch.push();
    sketch.translate(x, y);
    sketch.rotate(angle);
    sketch.text(ch, 0, 0);
    sketch.pop();
    offset += w;
    if (offset > totalLen) break;
  }

  sketch.pop();
}

export function textsLayer(
  sketch,
  topo,
  colorAt,
  textBoxes,
  {
    textSize,
    text,
    font,
    alpha,
    bbox,
    margin,
    elevationRange,
    contrast,
    backgroundColor,
  }
) {
  bbox = bbox || [0, 0, topo.width, topo.height];
  /**
   * Determines whether a word should be placed at a given position. Allows wrapping
   * around terrain. Checks that the height at the word is within elevationRange,
   * and that the x position is not too close to the right edge of the image.
   * @param {Object} topo - The topographic data containing pixel information as well as summary info on the map.
   * @param {number} x - The x coordinate of the word.
   * @param {number} y - The y coordinate of the word.
   * @param {number} wordWidth - The width of the word.
   * @returns {boolean} - Whether the word is visible or not.
   */
  const predicate = (topo, textBoxes, x, y, wordWidth, wordHeight) => {
    const translate = (percentOfHeight) =>
      topo.min + percentOfHeight * topo.magnitude;
    const pix1 = topo.pixels[y]?.[x];
    const pix2 = topo.pixels[y]?.[Math.floor(x + wordWidth)];
    if (
      x + wordWidth + margin > bbox[2] ||
      y + margin > bbox[3] ||
      x < bbox[0] ||
      y < bbox[1]
    )
      return false;
    if (!pix1 || !pix2) return false;
    for (const { bbox: box } of textBoxes) {
      if (collision(box, { x, y, w: wordWidth, h: wordHeight })) {
        return false;
      }
    }
    const [h1] = pix1;
    const [h2] = pix2;

    const [hmin, hmax] = elevationRange.map(translate);
    const test = h1 < hmax && h1 > hmin && h2 < hmax && h2 > hmin;

    return test;
  };

  sketch.textFont(font);
  sketch.textAlign(sketch.CENTER, sketch.CENTER);
  fillText(
    sketch,
    topo,
    textBoxes,
    text,
    alpha,
    textSize,
    colorAt,
    contrast,
    backgroundColor,
    predicate,
    bbox
  );
}

function fillText(
  sketch,
  topo,
  textBoxes,
  inpText,
  alpha,
  size,
  colorAt,
  contrast,
  backgroundColor,
  predicate = () => true,
  bbox = [0, 0, width, height],
  margin = 40
) {
  sketch.textSize(size);
  sketch.noStroke();
  let words = inpText.split(/\s/).reverse();
  let y = bbox[1] + margin;
  let x = bbox[0] + margin;
  let word = words.pop() + " ";
  let wordWidth;

  while (word && y < bbox[3] - margin) {
    wordWidth = Math.ceil(sketch.textWidth(word + " "));
    const wordHeight = Math.ceil(sketch.textAscent() + sketch.textDescent());
    [x, y] = [Math.floor(x), Math.round(y)];
    if (predicate(topo, textBoxes, x, y, wordWidth, wordHeight)) {
      word.split("").forEach((char) => {
        const pixel = topo.pixels[y][x];
        if (!pixel) return;
        const [h, s, aspect, shade] = pixel;
        const c = colorAt([x, y]);
        //TODO: color strategies
        // if(colorStrategy === "oppose"){

        // }
        // let col = chroma(c).mix("black", shade).hex();
        let col = c;
        col = contrastingLuminance(col, contrast);
        if (luminanceContrastRatio(col, backgroundColor) < 5.5) {
          col = contrastingLuminance(col, contrast);
        }

        sketch.push();

        sketch.fill(col);
        const jitter = sketch.random(-s * 0.01, s * 0.01);
        sketch.translate(x + jitter, y + jitter);
        sketch.rotate(degreesToRadians(aspect / 45));
        sketch.text(char, 0, 0);
        sketch.pop();
        const charLen = sketch.textWidth(char);
        x += Math.ceil(charLen);
      });
      // text(word, x, y);
      word = words.length ? words.pop() + " " : undefined;
    } else x += wordWidth;
    if (x > bbox[2] - margin - wordWidth) {
      y += size;
      x = bbox[0] + margin;
    }
  }
}

export function lakesLabels(
  sketch,
  lakes,
  keepList,
  { font, textSize, textColor, drop } = {},
  addLabels
) {
  const addedNames = [];
  const labels = {};

  Object.entries(lakes)
    .map(([name, [externalRing, ...holes]]) => {
      return {
        name,
        externalRing,
      };
    })
    .forEach(({ name, externalRing }) => {
      if (name === "undefined") return;
      if (!name) return;
      if (addedNames.includes(name)) return;
      addedNames.push(name);

      const [x, y] = externalRing.reduce(
        (acc, [x, y]) => {
          acc[0] += x;
          acc[1] += y;
          return acc;
        },
        [0, 0]
      );
      const [cx, cy] = [x / externalRing.length, y / externalRing.length];
      labels[name] = { pt: [cx, cy], displayName: name.split(" ").join("\n") };
    });

  // sketch.strokeWeight(weight);
  const setContext = () => {
    sketch.stroke("white");
    sketch.textSize(textSize);
    sketch.textFont(font);
    sketch.fill(textColor);
  };

  addLabels(labels, keepList, { setContext, font }, "lake", drop);
}

export function drawLakes(sketch, lakes, { color }) {
  sketch.fill(color);
  Object.entries(lakes).forEach(([name, [externalRing, ...holes]]) => {
    const { orientation } = ringOrientation(externalRing);
    if (orientation !== "clockwise") {
      externalRing.reverse();
    }
    sketch.beginShape();
    externalRing.forEach(([x, y]) => sketch.vertex(x, y));
    holes.forEach((hole) => {
      const { orientation } = ringOrientation(hole);
      if (orientation === "clockwise") {
        hole.reverse();
      }
      sketch.beginContour();
      hole.forEach(([x, y]) => sketch.vertex(x, y));
      sketch.endContour();
    });
    sketch.endShape(sketch.CLOSE);
  });
}

export function mountainLayer(
  sketch,
  peaks,
  font,
  { labelSize, labelColor, keepList, drop, iconColor, iconSize } = {
    labelSize: 20,
    labelColor: "black",

    keepList: [],
    drop: false,
  },
  addLabels
) {
  const peaksObj = Object.entries(peaks)
    .map(([name, [[pt]]]) => {
      return [name, pt];
    })
    .reduce((obj, [name, pt]) => {
      obj[name] = { name, pt };
      return obj;
    }, {});

  // ## MOUNTAIN ICONS ##
  sketch.textAlign(sketch.CENTER, sketch.CENTER);
  sketch.stroke("white");
  sketch.fill(iconColor);
  sketch.textFont("Courier");
  sketch.textSize(iconSize);
  sketch.textStyle(sketch.BOLD);
  Object.values(peaks).forEach(([pt]) => {
    sketch.text("\u{26F0}", pt[0], pt[1]);
  });

  // ## MOUNTAIN LABELS ##
  const setContext = () => {
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.stroke("white");
    sketch.textFont(font);
    sketch.fill(labelColor);
    sketch.textSize(labelSize);
    sketch.textStyle(sketch.NORMAL);
  };
  addLabels(peaksObj, keepList, { setContext, font }, "mountain", drop);
}

/**
 * Given a topology `topo`, and a collection of trail coordinates `trails`
 * this function renders the trails on
 * the canvas.  The trails are rendered in a gradient of colors, depending
 * on the slope of the terrain at each point.  The names of the trails
 * are also rendered in the middle of the trail.
 *
 * @param {Object} topo - A topology object, as returned by `processImage`.
 * @param {Object} trails - A collection of trail coordinates, where each
 *     key is the name of the trail and each value is a list of xy
 *     coordinates.
 */
export function namedLines(
  sketch,
  lineStrings,
  keepList,
  category,
  { textSize, textColor, font, drop },
  addLabels
) {
  let addedNames = [];
  let labels = {};
  if (!Array.isArray(lineStrings)) {
    lineStrings = Object.entries(lineStrings).map(([name, coords]) => ({
      name,
      coords,
    }));
  }

  // coords is an array of arrays of points
  lineStrings.forEach(({ name, coords }) => {
    if (name === "undefined") return;
    if (!name) return;
    if (addedNames.includes(name)) return;
    addedNames.push(name);
    let maxLength = 0;
    let maxIndex = 0;
    // find the longest lineString (coordinate list) to label
    for (const [i, coordList] of coords.entries()) {
      if (coordList.length > maxLength) {
        maxIndex = i;
        maxLength = coordList.length;
      }
    }

    const mid = Math.floor(maxLength / 2);
    const pt = coords[maxIndex][mid];
    labels[name] = { pt, displayName: name.split(" ").join("\n") };
  });
  const setContext = () => {
    sketch.stroke("white");
    sketch.textSize(textSize);
    sketch.textFont(font);
    sketch.fill(textColor);
  };

  addLabels(labels, keepList, { setContext, font }, category, drop);
}
