p5.disableFriendlyErrors = true;

const MAP_NAME = "sawtooth";
let copperplateLight;
let courier;
function preload() {
  copperplateLight = loadFont("/assets/Copperplate Light.ttf");
  courier = loadFont("/assets/CourierPrime-Regular.ttf");
}

async function setup() {
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
    curve: {
      stepCount: 20,
      stepLength: 5,
      countScalar: 1,
    },
    trail: {
      colorRange: [p.JuniperBark9, p.ochre],
      textColor: p.yellow,
      textSize: 3 * basePixelSize,
      stepLength: 4,
      stepCount: 8,
      weight: 1.5,
    },
    river: {
      colorRange: [p.bgBlue, p.aquamarine],
      stepLength: 4,
      stepCount: 8,
      weight: 1.5,
      streams: true,
    },
    backgroundText: {
      font: "Courier",
      textSize: 3 * basePixelSize,
      bbox: [
        (1 / 7) * canvas.width,
        (1 / 7) * canvas.height,
        (6 / 7) * canvas.width,
        (6 / 7) * canvas.height,
      ],
      text: shuffle(texts.poems.split("---")).join("\n"),
      elevationRange: [0.7, 1],
    },
    mountain: {
      labelSize: 3 * basePixelSize,
      labelColor: "black",
      iconSize: 3 * basePixelSize,
      iconColor: "black",
      keepList: [],
      // [
      //   "Vestal Peak",
      //   "Jagged Mountain",
      //   "Sunlight Peak",
      //   "Arrow Peak",
      //   "Trinity Peaks",
      //   "Leviathan Peak",
      //   "Windom Peak",
      //   "Endlich Mesa",
      //   "Mount Oso",
      // ],
    },
    colorPlan: [
      {
        height: 0.3,
        colors: [p.JuniperBark9, p.JuniperBark8, p.JuniperBark10],
      },
      { height: 0.4, colors: [p.JuniperBark3, p.JuniperBark9] },
      {
        height: 0.7,
        colors: [
          p.JuniperBark4,
          p.JuniperBark5,
          p.JuniperBark6,
          p.JuniperBark7,
        ],
      },
      { height: Infinity, colors: [p.JuniperBark1, p.JuniperBark3, "pink"] },
    ],
    background: p.JuniperBark8,
    crossHatch: false,
  };

  const geoJSON = await getGeoJSONFromOSM(latLngbox, {
    streams: config.river.streams,
  });

  const curvePixelCount = config.curve.stepCount * config.curve.stepLength;
  const curveCount =
    (config.curve.countScalar / curvePixelCount) *
    (canvas.width * canvas.height);
  const colorAt = colorAtFactory(config.colorPlan, topo);

  createCanvas(canvas.width, canvas.height);
  background(config.background);

  const genCurve = (topo) => () => {
    const angleTransforms = [
      (aspect) => aspect + 180,
      (aspect) => aspect,
      (aspect) => aspect + 90,
      (aspect) => aspect - 90,
    ];

    return makeCurve(
      floor(random(0, topo.width - 1)),
      floor(random(0, topo.height - 1)),
      config.curve.stepCount,
      config.curve.stepLength,
      topo,
      {
        angleTransform: config.crossHatch
          ? random(angleTransforms)
          : random([angleTransforms[0], angleTransforms[1]]),
        // angleTransform: random([angleTransforms[3], angleTransforms[2]]),
        // angleTransform: random(angleTransforms), // make it gridlike
      }
    );
  };

  const mountains = getMountainFeatures(bounds, geoJSON);
  const waterFeatures = getWaterFeatures(bounds, geoJSON);
  const trails = getTrails(bounds, geoJSON);

  times(0.8 * curveCount, genCurve(topo)).forEach(colorAndDrawCurve(colorAt));
  textsLayer(topo, colorAt, config.backgroundText);
  trailsLayer(topo, trails, config.trail);

  drawLines(topo, waterFeatures, config.river);

  mountainLayer(mountains, courier, config.mountain);
}

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
function makeCurve(
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
    const aspect = radians(
      lerpAngle(
        lastAspect,
        options.angleTransform(aspect1, [height, slope, aspect1]),
        0.9
      )
    );
    if (!aspect1) {
      break;
    }
    const x_step = heightScalar * step_length * cos(aspect);
    const y_step = heightScalar * step_length * sin(aspect);
    x = floor(x + x_step);
    y = floor(y + y_step);
    curvePoints.push([x, y, degrees(aspect)]);
  }
  return curvePoints;
}

function drawCurve(curve, weight) {
  noFill();
  strokeWeight(weight);
  beginShape();
  curve.forEach(([x, y]) => curveVertex(x, y));
  endShape();
}

const colorAndDrawCurve = (colorAt) => (c) => {
  const col = color(colorAt(c[0]));
  col.setAlpha(128);
  stroke(col);
  drawCurve(c, 1.8);
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
