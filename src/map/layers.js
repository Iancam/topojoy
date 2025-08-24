import {
  degreesToRadians,
  radiansToDegrees,
  lerpAngle,
  collision,
  ringOrientation,
} from "../libraries/utils";
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
    highContrast,
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
    highContrast,
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
  highContrast,
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
        let col = chroma(c).mix("black", shade).hex();
        if (highContrast) {
          col = contrastingLuminance(col, 7.5);
          if (luminanceContrastRatio(col, backgroundColor) < 5.5) {
            col = contrastingLuminance(col, 7.5);
          }
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
  { font, textSize, textColor } = {},
  addLabels
) {
  const names = [];
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
      if (names.includes(name)) return;
      names.push(name);

      const [x, y] = externalRing.reduce(
        (acc, [x, y]) => {
          acc[0] += x;
          acc[1] += y;
          return acc;
        },
        [0, 0]
      );
      const [cx, cy] = [x / externalRing.length, y / externalRing.length];
      labels[name.split(" ").join("\n")] = [cx, cy];
    });

  // sketch.strokeWeight(weight);
  const setContext = () => {
    sketch.stroke("white");
    sketch.textSize(textSize);
    sketch.textFont(font);
    sketch.fill(textColor);
  };

  addLabels(labels, keepList, { setContext, font }, "lake");
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
    .filter(([name]) => (drop ? keepList.includes(name) : true))
    .map(([name, [[pt]]]) => {
      return [name, pt];
    })
    .reduce((obj, [name, pt]) => {
      obj[name] = pt;
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
  addLabels(peaksObj, keepList, { setContext, font }, "mountain");
}

/**
 * internal data structures:
 * - Labels: [{labels:[{name, pt, keep, bbox, category}], drawEnv: function}]
 * - Collisions: [[string, string]]
 * functions:
 * - addLabels(labels: [{name, pt}], keepList: string[], drawEnv: function, category: string)
 * - drawLabels()
 * //- reportKeptCollisions()
 * //- reportUnkeptLabels(category: string?)
 *
 */

export const placeWithoutCollisionFactory = (sketch) => {
  let labels = [];
  let contexts = [];
  let collisions = [];
  const getRealBoundingBox = (pt, bbox) => {
    let { x, y, w, h } = bbox;
    if (sketch._renderer._textBaseline === "center") {
      y = pt[1] - h / 2;
    }
    return { x, y, w, h };
  };

  const checkCollisions = (bbox, name) => {
    for (const { bbox: box, name: text, keep } of labels) {
      if (!keep) continue;
      if (collision(bbox, box)) {
        collisions.push([text, name]);
        return true;
      }
    }
    return false;
  };

  return {
    addLabels: (givenLabels, keepList, { setContext, font }, category) => {
      if (!Array.isArray(givenLabels)) {
        givenLabels = Object.entries(givenLabels).map(([name, pt]) => ({
          name,
          pt,
        }));
      }

      sketch.push();
      setContext();
      const setContextId = contexts.length;
      contexts.push(setContext);
      const newLabels = givenLabels.map(({ name, pt }) => {
        const bbox = getRealBoundingBox(
          pt,
          font.textBounds(name, pt[0], pt[1])
        );
        const collides = checkCollisions(bbox, name);
        const keep = keepList.includes(name) || !collides;

        return { name, pt, keep, category, bbox, setContextId };
      });

      labels.push(...newLabels);
      sketch.pop();
    },
    drawLabels: () => {
      labels.forEach(({ setContextId, keep, name, pt }) => {
        sketch.push();
        contexts[setContextId]();
        if (keep) {
          sketch.text(name, pt[0], pt[1]);
        }
        sketch.pop();
      });
    },
    textBoxes: () => {
      return labels.filter(({ keep }) => keep);
    },
    // reportKeptCollisions: () => {
    //   return collisions;
    // },
    // reportUnkeptLabels: () => {
    // return labels.filter((label) => !label.keep);
    // },
  };
};

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
  { textSize, textColor, font },
  addLabels
) {
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
    let maxLength = 0;
    let maxIndex = 0;

    for (const [i, coordList] of coords.entries()) {
      if (coordList.length > maxLength) {
        maxIndex = i;
        maxLength = coordList.length;
      }
    }
    const mid = Math.floor(maxLength / 2);
    const pt = coords[maxIndex][mid];
    labels[name.split(" ").join("\n")] = pt;
  });
  const setContext = () => {
    sketch.stroke("white");
    sketch.textSize(textSize);
    sketch.textFont(font);
    sketch.fill(textColor);
  };

  addLabels(
    labels,
    keepList.map((name) => name.split(" ").join("\n")),
    { setContext, font },
    category
  );
}
