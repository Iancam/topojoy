import chroma from "chroma-js";
import {
  randomGaussian,
  getAngle,
  times,
  distance,
  windowForEach,
} from "../libraries/utils";
import { res } from "./colorUtils";
import { drawCurve, makeCurve } from "./layers";

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

  if (style === "sketched") {
    sketchedLines(sketch, Lines, slopeScale, topo, curveLength, weight);
  } else if (style === "watercolor") {
    for (const line of Lines) {
      waterColorLine(sketch, line, slopeScale);
    }
  } else {
    sketchedLines(sketch, Lines, slopeScale, topo, curveLength, weight);
  }
}

const waterColorLine = function (sketch, line, slopeScale, layers = 4) {
  const segments = splitLineOnOutliers(line);
  times(layers, () => {
    segments.forEach((segment) => {
      const deformedLine = deformLine(segment);
      sketch.stroke(...res(slopeScale(Math.abs(randomGaussian(0, 0.3)))), 150);

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

const optimizePathOrder = function (points) {
  if (points.length <= 2) return points;

  // Start with the leftmost point as a simple heuristic
  let startIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] < points[startIdx][0]) startIdx = i;
  }

  const visited = new Set([startIdx]);
  const orderedPath = [points[startIdx]];
  let currentIdx = startIdx;

  // Look-ahead factor for better path optimization
  const LOOKAHEAD = 3;

  while (visited.size < points.length) {
    let bestNextIdx = -1;
    let bestScore = Infinity;

    // Consider all unvisited points
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;

      // Calculate base score (distance to current point)
      let score = distance(points[currentIdx], points[i]);

      // Look ahead to consider future path implications
      if (visited.size < points.length - LOOKAHEAD) {
        let lookAheadScore = 0;
        let lastPoint = points[i];
        let availablePoints = points.filter(
          (_, idx) => !visited.has(idx) && idx !== i
        );

        // Calculate scores for next few moves
        for (let j = 0; j < Math.min(LOOKAHEAD, availablePoints.length); j++) {
          let nearestDist = Math.min(
            ...availablePoints.map((p) => distance(lastPoint, p))
          );
          lookAheadScore += nearestDist;
          lastPoint = availablePoints.find(
            (p) => distance(lastPoint, p) === nearestDist
          );
          availablePoints = availablePoints.filter((p) => p !== lastPoint);
        }

        // Weight the look-ahead score less than the immediate distance
        score = score + lookAheadScore * 0.5;
      }

      if (score < bestScore) {
        bestScore = score;
        bestNextIdx = i;
      }
    }

    visited.add(bestNextIdx);
    orderedPath.push(points[bestNextIdx]);
    currentIdx = bestNextIdx;
  }

  return orderedPath;
};

const splitLineOnOutliers = function (line) {
  // First optimize the path order to minimize zigzagging
  const optimizedLine = optimizePathOrder(line);
  // calculate average distance between points
  const dists = windowForEach(optimizedLine, 2, ([a, b]) => distance(a, b));
  // remove outliers

  const mean = dists.reduce((sum, value) => sum + value, 0) / dists.length;
  const stdDev = Math.sqrt(
    dists.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      dists.length
  );
  const threshold = 4;
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
