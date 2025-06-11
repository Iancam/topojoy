import cover from "@iancam/tile-cover";
import { tileToBBOX } from "@mapbox/tilebelt";
import { times } from "./libraries/utils";
import { getMetersPerPixelAtLatitude } from "./libraries/utils";

const N_SLICES = 4;

function initGPU() {
  try {
    return new window.GPU.GPU();
  } catch (e) {
    return new GPU();
  }
}

const gpu = initGPU();
const toHeights = gpu
  .createKernel(function hmap(data, width) {
    const { x, y } = this.thread;
    const start = y * (width * 4) + x * 4;
    const [R, G, B, A] = [
      data[start],
      data[start + 1],
      data[start + 2],
      data[start + 3],
    ];
    const h = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
    return h;
  })
  // .setPipeline(true)
  .setDynamicOutput(true);

const slope = gpu
  .createKernel(function (hArray, metersPerPixel, sunAz, sunEl, vert) {
    const { x, y } = this.thread;
    const height = hArray[y][x];

    const eleN = vert * hArray[y][x - 1];
    const eleS = vert * hArray[y][x + 1];
    const eleE = vert * hArray[y + 1][x];
    const eleW = vert * hArray[y - 1][x];
    const d = 3 * metersPerPixel;
    const dzdx = (eleE - eleW) / d;
    const dzdy = (eleN - eleS) / d;
    const slope = Math.atan(Math.sqrt(dzdx ** 2 + dzdy ** 2)) * (180 / Math.PI);
    const aspect =
      d !== 0 // counterclockwise from east
        ? (Math.atan2(dzdy, dzdx) * (180 / Math.PI) + 180) % 360
        : (90 * (d > 0 ? 1 : -1) + 180) % 360;

    const El = (Math.PI / 180) * sunEl;
    const Az = (Math.PI / 180) * sunAz;

    const cosIncidence =
      Math.sin(El) * Math.cos(slope) +
      Math.cos(El) * Math.sin(slope) * Math.cos(Az - aspect);

    const shade = 255 * cosIncidence;
    return [height, slope, aspect, cosIncidence];
  })
  .setDynamicOutput(true);

/**
 * Takes an image and pixel distance and returns a map of height, slope and
 * aspect values for each pixel, as well as the minimum, maximum, and range of
 * those values across the image.
 * @param {width, height, data} image
 * @param {number} metersPerPixel meters per pixel
 * @param {number} sunAz sun azimuth
 * @param {number} sunEl sun elevation
 * @param {number} vert vertical exaggeration
 * @returns {
 *  min: number,
 *  max:number,
 *  magnitude: number,
 *  pixels: number[],
 *  width: number,
 *  height: number
 * } heightmap
 */
export function processPixels(image, metersPerPixel, sunAz, sunEl, vert) {
  const { width, height, data } = image;
  const step = height / N_SLICES;
  const numChannels = 4;
  const slices = times(N_SLICES, (i) =>
    data.slice(
      i * step * width * numChannels,
      (i + 1) * step * width * N_SLICES
    )
  ).map((data) => {
    const htex = toHeights.setOutput([width, step])(data, width);

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < htex.length; i++) {
      for (let j = 0; j < htex[i].length; j++) {
        let h = htex[i][j];
        let backTrack = 0;
        // fix negative heights: for whatever reason, these occur sometimes
        while (h < 0) {
          h = getHeight(data, width, i, j + backTrack);
          backTrack++;
        }
        htex[i][j] = h;
        if (h < min) min = h;
        if (h > max) max = h;
      }
    }

    const pixels = slope.setOutput([width, step])(
      htex,
      metersPerPixel,
      sunAz,
      sunEl,
      vert
    );

    // calculate min and max, and store heights

    // const pixels = slopeCPU(data, width, metersPerPixel, sunAz, sunEl, vert);

    return {
      min,
      max,
      magnitude: max - min,
      pixels,
      width,
      height,
    };
  });

  const min = Math.min(...slices.map(({ min }) => min));
  const max = Math.max(...slices.map(({ max }) => max));

  return {
    min,
    max,
    magnitude: max - min,
    pixels: [].concat(...slices.map(({ pixels }) => pixels)),
    width,
    height,
  };
}

function getPixel(pixels, width, x, y) {
  return [
    pixels[y * width + x * 4],
    pixels[y * width + x * 4 + 1],
    pixels[y * width + x * 4 + 2],
    pixels[y * width + x * 4 + 3],
  ];
}

function getHeight(data, width, y, x) {
  const [R, G, B, A] = getPixel(data, width, x, y);
  const h = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
  return h;
}
// ########## END GPU ##########

// ########## BEGIN Loading Map##########
const tileToUrl = ([x, y, zoom]) => {
  const MBX_TOKEN =
    "pk.eyJ1IjoibXJpYW5jYW1wYmVsbCIsImEiOiJja2k5bzR1cTAwaGd4MzRueHAxMHlxbmtwIn0.RqasAuFr0-Bea2MiohpzDQ";
  return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x}/${y}.pngraw?access_token=${MBX_TOKEN}`;
};

/**
 * Finds the tiles and bounding box of a set of features at a given zoom level.
 * @param {Object} features - GeoJSON feature set.
 * @param {number} zoom - Zoom level to calculate tiles and bounding box at.
 * @returns {Object} An object with two properties: tiles and bounds.
 *   tiles is an array of [x, y, zoom] coordinates of the tiles that cover the features.
 *   bounds is an object with three properties: box, width, and height.
 *     box is an array of [x0, y0, x1, y1] coordinates of the bounding box of the tiles.
 *     width and height are the dimensions of the bounding box.
 */
export function tilesForFeatures(feature, zoom) {
  const limits = { min_zoom: zoom, max_zoom: zoom };
  const coverTiles = cover
    .tiles(feature.geometry, limits)
    .sort(([a1, a2], [b1, b2]) => a1 + a2 * 0.0001 - (b1 + b2 * 0.0001));
  const min = Math.min;
  const max = Math.max;
  const bounds = coverTiles.reduce(
    ([x0, y0, x1, y1], [x, y]) => {
      return [min(x0, x), min(y0, y), max(x1, x), max(y1, y)];
    },
    [Infinity, Infinity, -Infinity, -Infinity]
  );

  let tiles = [];
  const [x0, y0, x1, y1] = bounds;
  for (let i = x0; i <= x1; i++) {
    for (let j = y0; j <= y1; j++) {
      tiles.push([i, j, zoom]);
    }
  }
  const latLngBox = coverTiles
    .map(([x, y]) => tileToBBOX([x, y, zoom]))
    .reduce(
      ([west, south, east, north], [west1, south1, east1, north1]) => [
        min(west, west1),
        min(south, south1),
        max(east, east1),
        max(north, north1),
      ],
      [Infinity, Infinity, -Infinity, -Infinity]
    );

  const [west, south, east, north] = latLngBox;
  return {
    tiles,
    bounds: {
      box: bounds,
      latLngbox: [south, west, north, east],
      width: 1 + bounds[2] - bounds[0],
      height: 1 + bounds[3] - bounds[1],
      zoom,
    },
  };
}

/**
 * Stitches an array of map tiles into a single large image
 * @param {Array} tiles - Array of objects with information about each tile
 * @param {number} gridWidth - Number of tiles per row in the grid
 * @param {number} tileWidth - Width of each tile in pixels
 * @param {number} tileHeight - Height of each tile in pixels
 * @returns {Promise<Canvas>} - A promise that resolves to a canvas of the stitched image
 */
export function stitchMapTiles(tiles, gridWidth, tileWidth, tileHeight) {
  return new Promise((resolve, reject) => {
    const gridHeight = Math.ceil(tiles.length / gridWidth);
    const totalWidth = gridWidth * tileWidth;
    const totalHeight = gridHeight * tileHeight;

    const canvas = document.createElement("canvas");
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");
    let loadedTiles = 0;
    const totalTiles = tiles.length;

    tiles
      .sort(([x1, y1], [x2, y2]) => {
        return y1 - y2 || x1 - x2;
      })
      .forEach((tile, index) => {
        const row = Math.floor(index / gridWidth);
        const col = index % gridWidth;
        const x = col * tileWidth;
        const y = row * tileHeight;

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          ctx.drawImage(img, x, y, tileWidth, tileHeight);
          ctx.textBaseline = "top";

          ctx.fillText(tile[0] + "," + tile[1] + "," + tile[2], x, y);
          loadedTiles++;

          if (loadedTiles === totalTiles) {
            resolve(canvas);
          }
        };
        img.src = tileToUrl(tile);
      });
  });
}

/**
 * Process an image from geojson feature. This function is used to pre-process each of the
 * map tiles that make up the map. The image is processed into a 3d array, where
 * each pixel is an array of [height, slope, aspect] as inferred from the image.
 * The image is also drawn onto a canvas element, which is returned as part of
 * the object.
 *
 * @param {Object} features the geojson features to process
 * @param {Number} zoom the zoom level of the tile
 * @returns {Promise<Object>} an object with two properties. The first is `topo`,
 *     a 3d array representing the height, slope, and aspect of each pixel in the
 *     image. The second is `canvas`, a canvas element that the image has been
 *     drawn onto.
 */
export async function processImage(feature, zoom) {
  const { tiles, bounds } = tilesForFeatures(feature, zoom);
  const canvas = await stitchMapTiles(tiles, bounds.width, 256, 256);
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const lat = feature.geometry.coordinates[0][0][1];

  const topo = processPixels(
    pixels,
    getMetersPerPixelAtLatitude(lat, zoom),
    45,
    45,
    1
  );

  return { topo, canvas, bounds };
}
