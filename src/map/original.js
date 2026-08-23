import { drawCurve, makeCurve } from "./layers";

export const genCurve = (sketch, config, topo) => () => {
  const angleTransforms = [
    (aspect) => aspect + 180,
    (aspect) => aspect,
    (aspect) => aspect + 90,
    (aspect) => aspect - 90,
  ];
  const x = Math.floor(sketch.random(0, topo.width - 1));
  const y = Math.floor(sketch.random(0, topo.height - 1));
  const [elevation, slope, aspect, cosIncidence] = topo.pixels[y][x];
  const random = sketch.random();
  // makes curves less likely to be drawn on flat areas
  if (slope / 70 < random) {
    return null;
  }
  return makeCurve(
    x,
    y,
    config.curve.stepCount,
    config.curve.stepLength,
    topo,
    {
      angleTransform: config.crossHatch
        ? sketch.random(angleTransforms)
        : sketch.random([angleTransforms[0], angleTransforms[1]]),
      // angleTransform: random([angleTransforms[3], angleTransforms[2]]),
      // angleTransform: random(angleTransforms), // make it gridlike
    },
  );
};
export const colorAndDrawCurve = (sketch, colorAt) => (curve) => {
  if (!curve) return;
  console.log(curve);
  const col1 = colorAt(curve[0]);
  const col = sketch.color(col1);
  col.setAlpha(128);
  sketch.stroke(col);

  drawCurve(sketch, curve, 1.8);
};
