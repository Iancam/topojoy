import chroma from "chroma-js";
import {
  randomGaussian,
  getAngle,
  times,
  distance,
  windowForEach,
} from "../lib/map/utils";
import { res } from "./colorUtils";
import { drawCurve, makeCurve } from "./layers.ts";

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
  textSizeMultiplier,
  { colorRange, weight, curveLength, style }
) {
  const slopeScale = chroma.scale(colorRange);
  let Lines = Array.isArray(lines)
    ? lines.map(({ coords }) => coords)
    : Object.values(lines).flat();
  // lines will be an array of arrays of [x, y] coordinates

  if (style === "basic") {
    basicLines(sketch, Lines, slopeScale, textSizeMultiplier);
  } else if (style === "sketched") {
    sketchedLines(sketch, Lines, slopeScale, topo, curveLength, weight);
  } else if (style === "watercolor") {
    for (const line of Lines) {
      waterColorLine(sketch, line, slopeScale, textSizeMultiplier);
    }
  } else {
    sketchedLines(sketch, Lines, slopeScale, topo, curveLength, weight);
  }
}

const basicLines = function (sketch, lines, slopeScale, textSizeMultiplier) {
  sketch.push();
  sketch.noFill();
  sketch.stroke(...res(slopeScale(1 / 60)), 255);
  sketch.strokeWeight(2 * textSizeMultiplier);
  lines.forEach((coords) => {
    sketch.beginShape();

    coords.forEach(([x, y]) => {
      sketch.vertex(x, y);
    });
    sketch.endShape();
  });
  sketch.pop();
};

const waterColorLine = function (
  sketch,
  line,
  slopeScale,
  textSizeMultiplier,
  layers = 4
) {
  times(layers, () => {
    const deformedLine = deformLine(line, 2, 0.5 * textSizeMultiplier);
    sketch.stroke(...res(slopeScale(Math.abs(randomGaussian(0, 0.3)))), 150);

    windowForEach(deformedLine, 2, ([a, b], i) => {
      if (a.length !== 2 || b.length !== 2) console.error(a, b, i);
      if (!a || !b) return;
      const [x1, y1] = a;
      const [x2, y2] = b;
      sketch.line(x1, y1, x2, y2);
    });
  });
};

function sketchedLines(sketch, Lines, slopeScale, topo, curveLength, weight) {
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
