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

const sketch = (sketch) => {
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

    const config = {
      name: "LHK",
      curve: {
        stepCount: 20,
        stepLength: 5,
        countScalar: 0.5,
      },
      trail: {
        colorRange: [p.f4, p.f5],
        textColor: p.orange,
        textSize: 2 * basePixelSize,
        stepLength: 4,
        stepCount: 8,
        weight: 1.5,
        font: courier,
        show: true,
      },
      river: {
        colorRange: [p.f7, p.f6],
        stepLength: 4,
        stepCount: 8,
        weight: 1.5,
        streams: false,
        textColor: p.f7,
        textSize: 2 * basePixelSize,
        font: courier,
        show: true,
      },
      mountain: {
        labelSize: 2 * basePixelSize,
        labelColor: "yellow",
        iconSize: 4 * basePixelSize,
        iconColor: "black",
        keepList: [
          "Vestal Peak",
          "Jagged Mountain",
          "Sunlight Peak",
          "Arrow Peak",
          "Trinity Peaks",
          "Leviathan Peak",
          "Windom Peak",
          "Endlich Mesa",
          "Mount Oso",
          "Amherst Mountain",
        ],
        drop: true,
        show: true,
      },
      backgroundText: {
        font: "Courier",
        textSize: 2.5 * basePixelSize,
        bbox: [0, 0, canvas.width, canvas.height],
        alpha: 200,
        text: shuffle(texts.poemsPersonal.split("---")).join("\n"),
        elevationRange: [0.7, 1],
      },
      colorPlan: mixWeightedPlans(
        colorScaleToWeightedPlan(colorScales.mint, 10),
        [
          {
            colors: colorScales.sunset,
            weight: 1,
          },
        ]
      ),
      // colorPlan: [
      //   {
      //     height: 0.3,
      //     colors: [p.lhk5, p.lhk4],
      //   },
      //   {
      //     height: 0.7,
      //     colors: () =>
      //       weightedRandom(
      //         [p.lhk5, p.Lowland2, p.f3, brighten(p.f3, 2), p.lhk2],
      //         [10, 10, 10, 10, 1]
      //       ),
      //   },
      //   { height: Infinity, colors: [p.lhk2, p.lhk3, p.white] },
      // ],
      background: colorScales.mint[0],
      crossHatch: false,
    };

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

    sketch.createCanvas(canvas.width, canvas.height);
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
      config.river,
      textBoxes
    );
    textBoxes = namedLines(sketch, topo, trails, config.trail, textBoxes);
  };

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
        // document.getElementById("sketchy").appendChild(image);
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

let mySketch = new p5(sketch);
