import p5 from "p5";
import { processImage, processPixels } from "./processImage";
import {
  p,
  mixWeightedPlans,
  colorScaleToWeightedPlan,
  colorScales,
  colorAtFactory,
} from "./colorUtils";

import { texts } from "./backGroundText";

import {
  mountainLayer,
  textsLayer,
  namedLines,
  makeCurve,
  drawCurve,
  drawLines,
} from "./layers";
import {
  getTrails,
  getGeoJSONFromOSM,
  getMountainFeatures,
  getWaterFeatures,
} from "./trails";
import { times } from "./libraries/utils";

export const sketch =
  (boundsGeojson, zoom = 14, config) =>
  (sketch) => {
    const MAP_NAME = "LHK";
    let copperplateLight;
    let courier;
    sketch.preload = function preload() {
      copperplateLight = sketch.loadFont("/assets/Copperplate Light.ttf");
      courier = sketch.loadFont("/assets/CourierPrime-Regular.ttf");
    };

    sketch.setup = async function setup() {
      const { topo, canvas, bounds } = await processImage(boundsGeojson, zoom);

      // const baseTextSize = Math.sqrt(
      //   (canvas.width * canvas.height) / (256 * 256)
      // );

      // it feels wrong not enforcing immutable data, but
      // this is significantly simpler, and still easy to reason about
      const baseConfigTransforms = {
        backgroundTextBBox: (config) => {
          config.backgroundText.bbox = config.backgroundText.bbox.reduce(
            (a, b) => a + b
          )
            ? config.backgroundText.bbox
            : [0, 0, canvas.width, canvas.height];
        },
      };

      Object.values(baseConfigTransforms).forEach((transform) => {
        transform(config);
      });

      const geoJSON = await getGeoJSONFromOSM(bounds.latLngbox, {
        streams: config.river.streams,
        rivers: config.river.show,
        trails: config.trail.show,
        peaks: config.mountain.show,
      });

      const curvePixelCount = config.curve.stepCount * config.curve.stepLength;
      const curveCount =
        (config.curve.countScalar / curvePixelCount) *
        (canvas.width * canvas.height);
      const colorAt = colorAtFactory(config.colorPlan, topo);

      let cnv = sketch.createCanvas(canvas.width, canvas.height);
      cnv.style("z-index", -1);
      cnv.style("position", "absolute");
      cnv.style("top", 0);
      cnv.style("left", 0);

      sketch.background(config.background);

      const genCurve = (topo) => () => {
        const angleTransforms = [
          (aspect) => aspect + 180,
          (aspect) => aspect,
          (aspect) => aspect + 90,
          (aspect) => aspect - 90,
        ];

        return makeCurve(
          Math.floor(sketch.random(0, topo.width - 1)),
          Math.floor(sketch.random(0, topo.height - 1)),
          config.curve.stepCount,
          config.curve.stepLength,
          topo,
          {
            angleTransform: config.crossHatch
              ? sketch.random(angleTransforms)
              : sketch.random([angleTransforms[0], angleTransforms[1]]),
            // angleTransform: random([angleTransforms[3], angleTransforms[2]]),
            // angleTransform: random(angleTransforms), // make it gridlike
          }
        );
      };

      const mountains = getMountainFeatures(bounds, geoJSON);
      const waterFeatures = getWaterFeatures(bounds, geoJSON);
      const trails = getTrails(bounds, geoJSON);

      times(0.8 * curveCount, genCurve(topo)).forEach(
        colorAndDrawCurve(colorAt)
      );
      textsLayer(sketch, topo, colorAt, config.backgroundText);

      let textBoxes = [];
      drawLines(sketch, topo, waterFeatures, config.river, textBoxes);
      drawLines(sketch, topo, trails, config.trail, textBoxes);
      textBoxes = mountainLayer(
        sketch,
        mountains,
        courier,
        config.mountain,
        textBoxes
      );
      textBoxes = namedLines(
        sketch,
        topo,
        waterFeatures,
        { ...config.river, font: courier },
        textBoxes
      );
      textBoxes = namedLines(
        sketch,
        topo,
        trails,
        { ...config.trail, font: courier },
        textBoxes
      );
    };

    const colorAndDrawCurve = (colorAt) => (c) => {
      const col1 = colorAt(c[0]);
      const col = sketch.color(col1);
      col.setAlpha(128);
      sketch.stroke(col);
      drawCurve(sketch, c, 1.8);
    };
  };

p5.disableFriendlyErrors = true;
