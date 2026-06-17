import { colorAndDrawCurve } from "./original";

// topo pixels structure [elevation, dx, dy, cosIncidence]
export const dxdy = (
  sketch,
  curvesBackLayer,
  curvesFrontLayer,
  config,
  topo,
  colorAt,
  dxdyTransform = "none",
) => {
  const transform = {
    none: (dx, dy) => [dx, dy],
    erosion: (dx, dy) => [-dy, dx],
    crossHatch: (dx, dy) => sketch.random([-dy, dx], [dx, dy]),
  }[dxdyTransform];
  const gradientMakeCurve = (length, step_length, topo, dxdyTransform) => {
    const [x, y] = [
      Math.floor(sketch.random(0, topo.width - 1)),
      Math.floor(sketch.random(0, topo.height - 1)),
    ];
    let curvePoints = [[x, y, topo.pixels[y][x][1], topo.pixels[y][x][2]]];
    let last = (array) => array[array.length - 1];
    for (let i = 0; i < length; i++) {
      const [x, y, dx, dy] = last(curvePoints);
      const [tdx, tdy] = dxdyTransform(dx, dy);
      let mag = Math.sqrt(tdx * tdx + tdy * tdy);
      const maxMag = 1.0;
      if (mag > maxMag) mag = maxMag;
      let [ndx, ndy] = [tdx / mag, tdy / mag];
      if (mag === 0) {
        ndx = 0;
        ndy = 0;
      }
      const [nx, ny] = [
        Math.floor(x + ndx * step_length),
        Math.floor(y + ndy * step_length),
      ];
      if (!topo.pixels[ny]?.[nx]) break;
      const [e2, dx2, dy2] = topo.pixels[ny][nx];
      curvePoints.push([nx, ny, dx2, dy2]);
    }
    return curvePoints;
  };

  // Pre-generate all curves, then split 80/20 across layers
  const totalCount = Math.floor(config.curveCount * 0.8);
  const allCurves = [];
  for (let i = 0; i < totalCount; i++) {
    allCurves.push(
      gradientMakeCurve(
        config.curve.stepCount,
        config.curve.stepLength,
        topo,
        transform,
      ),
    );
  }
  const splitAt = Math.floor(allCurves.length * 0.8);
  const drawBack = colorAndDrawCurve(curvesBackLayer, colorAt);
  const drawFront = colorAndDrawCurve(curvesFrontLayer, colorAt);
  allCurves.slice(0, splitAt).forEach(drawBack);
  allCurves.slice(splitAt).forEach(drawFront);
};
