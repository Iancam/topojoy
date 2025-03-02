import p5 from "p5";
import { processPixels } from "./processImage";
import {
  p,
  mixWeightedPlans,
  colorScaleToWeightedPlan,
  colorScales,
  colorAtFactory,
} from "./colorUtils";

import {
  tilenum_to_lonlat,
  getMetersPerPixelAtLatitude,
  times,
  shuffle,
} from "./libraries/utils";

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

export const sketch = (configFn) => (sketch) => {
  const MAP_NAME = "LHK";
  let copperplateLight;
  let courier;
  sketch.preload = function preload() {
    copperplateLight = sketch.loadFont("/assets/Copperplate Light.ttf");
    courier = sketch.loadFont("/assets/CourierPrime-Regular.ttf");
  };

  sketch.setup = async function setup() {
    // Load the output of the topojoy tool
    // https://github.com/Iancam/topojoy
    const response = await fetch("data/" + MAP_NAME + "Bounds.json");
    const bounds = await response.json();
    const {
      box: [x0, y0, x1, y1],
      latLngbox,
      width,
      height,
      zoom,
    } = bounds;

    const { topo, canvas } = await processImage(
      "data/" + MAP_NAME + ".png",
      [x0, y0],
      zoom
    );

    const basePixelSize = Math.sqrt(width * height);

    const config = configFn(basePixelSize, canvas);

    const geoJSON = await getGeoJSONFromOSM(latLngbox, {
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

    times(0.8 * curveCount, genCurve(topo)).forEach(colorAndDrawCurve(colorAt));
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

  /**
   * Process an image from a url. This function is used to pre-process each of the
   * map tiles that make up the map. The image is processed into a 3d array, where
   * each pixel is an array of [height, slope, aspect] as inferred from the image.
   * The image is also drawn onto a canvas element, which is returned as part of
   * the object.
   *
   * @param {String} url the url to download the image from
   * @param {Array} [tileX, tileY] the x and y coordinates of the tile in the
   *     mercator projection
   * @param {Number} zoom the zoom level of the tile
   * @returns {Promise<Object>} an object with two properties. The first is `topo`,
   *     a 3d array representing the height, slope, and aspect of each pixel in the
   *     image. The second is `canvas`, a canvas element that the image has been
   *     drawn onto.
   */
  async function processImage(url, [tileX, tileY], zoom) {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;

      image.onload = (ev) => {
        resolve(image);
      };
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height);
    const { lat } = tilenum_to_lonlat(tileX, tileY, zoom);
    const topo = processPixels(
      pixels,
      getMetersPerPixelAtLatitude(lat, 14),
      45,
      45,
      1
    );
    return { topo, canvas };
  }
};

p5.disableFriendlyErrors = true;

const mySketch = new p5(sketch);
