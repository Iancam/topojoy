import {
  degreesToRadians,
  radiansToDegrees,
  lerpAngle,
  randomGaussian,
  getAngle,
  collision,
  times,
  distance,
  windowForEach,
} from "./libraries/utils";
import { res } from "./colorUtils";

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

export function textsLayer(
  sketch,
  topo,
  colorAt,
  { textSize, text, font, alpha, bbox, margin, elevationRange }
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
  const predicate = (topo, x, y, wordWidth) => {
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
    const [h1] = pix1;
    const [h2] = pix2;

    const [hmin, hmax] = elevationRange.map(translate);
    const test = h1 < hmax && h1 > hmin && h2 < hmax && h2 > hmin;

    return test;
  };

  sketch.textFont(font);
  sketch.textAlign(sketch.CENTER, sketch.CENTER);
  fillText(sketch, topo, text, alpha, textSize, colorAt, predicate, bbox);
}

function fillText(
  sketch,
  topo,
  inpText,
  alpha,
  size,
  colorAt,
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
    [x, y] = [Math.floor(x), Math.round(y)];
    if (predicate(topo, x, y, wordWidth)) {
      word.split("").forEach((char) => {
        const pixel = topo.pixels[y][x];
        if (!pixel) return;
        const [h, s, aspect, shade] = pixel;
        const c = colorAt([x, y]);

        const col = sketch.color(res(chroma(c).mix("black", shade)));

        col.setAlpha(alpha);

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
  collisionBoxes
) {
  const peaksObj = Object.entries(peaks)
    .filter(([name]) => (drop ? keepList.includes(name) : true))
    .map(([name, [pt]]) => {
      return [name, pt];
    })
    .reduce((obj, [name, pt]) => {
      obj[name] = pt;
      return obj;
    }, {});

  sketch.textAlign(sketch.CENTER, sketch.CENTER);
  sketch.stroke("white");
  sketch.fill(iconColor);
  sketch.textFont("Courier");
  sketch.textSize(iconSize);
  sketch.textStyle(sketch.BOLD);
  Object.values(peaks).forEach(([pt]) => {
    sketch.text("\u{26F0}", pt[0], pt[1]);
  });

  sketch.textFont(font);
  sketch.fill(labelColor);
  sketch.textSize(labelSize);
  sketch.textStyle(sketch.NORMAL);
  return placeWithoutCollision(
    sketch,
    peaksObj,
    font,
    keepList,
    collisionBoxes
  );
}

/**
 * Draws labels at their specified points, avoiding collisions with previous labels that have been drawn.
 * @param {Object} labels - A dictionary of labels with their corresponding points.
 * @param {Object} font - p5.Font object used to calculate bounding box of text
 * @param {Array<string>} keepList - List of labels to always keep, even if they collide with other labels.
 * @returns {void}
 */
const placeWithoutCollision = (
  sketch,
  labels,
  font,
  keepList,
  collisionBoxes
) => {
  let bboxes = collisionBoxes || [];
  for (const name of keepList || []) {
    if (!labels[name]) continue;
    const bbox = font.textBounds(name, labels[name][0], labels[name][1]);
    bboxes.push(bbox);
    sketch.text(name, labels[name][0], labels[name][1]);
  }

  Object.entries(labels).forEach(([name, pt]) => {
    const bbox = font.textBounds(name, pt[0], pt[1]);
    let skip = false;
    for (const box of bboxes) {
      if (collision(bbox, box)) {
        skip = true;
        break;
      }
    }

    if (!skip) {
      bboxes.push(bbox);
      sketch.text(name, pt[0], pt[1]);
    }
  });
  return bboxes;
};

/**
 * Given a topology `topo`, a collection of coordinates `lines` and
 * a color palette `colorRange`, this function renders the lines on
 * the canvas.  The lines are rendered in a gradient of colors,
 * depending on the slope of the terrain at each point.
 *
 * @param {Object} topo - A topology object, as returned by `processImage`.
 * @param {Array<Object>|Object} lines - A collection of coordinates, where
 *     each element is either an object with a `coords` key containing an
 *     array of xy coordinates, or a plain array of xy coordinates.
 * @param {Array<string>} lineColors - An array of colors to use for the
 *     gradient.  The colors should be in the format `#rrggbb`.
 * @returns {void}
 */
export function drawLines(
  sketch,
  topo,
  lines,
  { colorRange, weight, curveLength, style }
) {
  const slopeScale = chroma.scale(colorRange);
  let Lines = Array.isArray(lines)
    ? lines.map(({ coords }) => coords)
    : Object.values(lines);

  function sketchedLines(Lines) {
    Lines.forEach((coords) => {
      coords.forEach(([x, y], i) => {
        if (x > topo.width || y > topo.height) return;
        const [, slope] = topo.pixels[y][x];
        sketch.stroke(...res(slopeScale(slope / 60)), 255);

        drawCurve(
          sketch,
          makeCurve(x, y, sketch.abs(randomGaussian(curveLength, 8)), 4, topo, {
            angleTransform: (() => {
              let counter = i;
              return (a) => getAngle([x, y], coords[counter++] || [0, 0]);
            })(),
          }),
          weight
        );
      });
    });
  }

  const splitLineOnOutliers = function (line) {
    
    
    // calculate average distance between points
    const dists = windowForEach(line, 2, ([a, b]) => distance(a, b));
    // remove outliers
    const threshold = 4;
    const mean = dists.reduce((sum, value) => sum + value, 0) / dists.length;
    const stdDev = Math.sqrt(
      dists.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
        dists.length
    );
    const zscores = dists.map((value, i) => ({
      zscore: (value - mean) / stdDev,
      index: i + 1,
    }));
    const outliers = zscores
      .filter((z) => z.zscore > threshold)
      .map((z) => z.index);

    // slice the line into segments, break on outliers
    let segments = [];
    let last = 0;
    for (let i = 0; i < outliers.length; i++) {
      segments.push(line.slice(last, outliers[i]));
      last = outliers[i];
    }
    return segments;
  };

  const deformLine = function (line, subdivisions = 2, roughness = 0.5) {
    let deformedLine = [...line];
    // subdivide the line
    for (let i = 0; i < subdivisions; i++) {
      const newLine = [];
      newLine.push(deformedLine[0]);

      for (let j = 0; j < deformedLine.length - 1; j++) {
        const current = deformedLine[j];
        const next = deformedLine[j + 1];

        const midX = (current[0] + next[0]) / 2;
        const midY = (current[1] + next[1]) / 2;
        const maxDist = 5;

        const dist = distance(current, next);
        const dx = randomGaussian(0, Math.min(maxDist, dist) * roughness);
        const dy = randomGaussian(0, Math.min(maxDist, dist) * roughness);
        newLine.push([midX + dx, midY + dy]);
        newLine.push(next);
      }

      deformedLine = newLine;
    }
    return deformedLine;
  };

  const waterColorLine = function (line, layers = 4) {
    const segments = splitLineOnOutliers(line);
    times(layers, () => {
      segments.forEach((segment) => {
        const deformedLine = deformLine(segment);
        sketch.stroke(
          ...res(slopeScale(Math.abs(randomGaussian(0, 0.1)))),
          150
        );
        // if (x > topo.width || y > topo.height) return;
        // const [, slope] = topo.pixels[y][x];
        // sketch.stroke(...res(slopeScale(slope / 60)), 255);

        windowForEach(deformedLine, 2, ([a, b], i) => {
          if (a.length !== 2 || b.length !== 2) console.error(a, b, i);
          if (!a || !b) return;
          const [x1, y1] = a;
          const [x2, y2] = b;
          sketch.line(x1, y1, x2, y2);
        });
      });
    });
  };
  if (style === "sketched") {
    sketchedLines(Lines);
  } else if (style === "watercolor") {
    for (const line of Lines) {
      waterColorLine(line);
    }
  } else {
    sketchedLines(Lines);
  }
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
  topo,
  lineStrings,
  { ts, textColor, weight, keepList = [], font },
  collisionBoxes
) {
  sketch.strokeWeight(weight);
  // ## TRAIL NAMES ##
  sketch.textSize(ts);
  sketch.textFont(font);
  sketch.fill(textColor);
  let names = [];
  let labels = {};
  if (!Array.isArray(lineStrings)) {
    lineStrings = Object.entries(lineStrings).map(([name, coords]) => ({
      name,
      coords,
    }));
  }

  lineStrings.forEach(({ name, coords }) => {
    if (name === "undefined") return;
    if (!name) return;
    if (names.includes(name)) return;
    names.push(name);

    const mid = Math.floor(coords.length / 2);
    const pt = coords[mid];
    labels[name.split(" ").join("\n")] = pt;
  });

  return placeWithoutCollision(
    sketch,
    labels,
    font,
    keepList.map((name) => name.split(" ").join("\n")),
    collisionBoxes
  );
}
