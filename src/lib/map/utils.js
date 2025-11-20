// utils.js;

export function maxPrintSizeInches(widthPx, heightPx, minDPI = 250) {
  const widthIn = widthPx / minDPI;
  const heightIn = heightPx / minDPI;
  const diagonalIn = Math.hypot(widthIn, heightIn);
  return { widthIn, heightIn, diagonalIn, dpi: minDPI };
}

// points: Array of [x, y]. Can be open or closed (first != last).
// yDown: true if coordinates are in screen space where y increases downward.
export function ringOrientation(points, { yDown = true } = {}) {
  if (!Array.isArray(points) || points.length < 3) {
    return { orientation: "degenerate", clockwise: false, signedArea: 0 };
  }

  // Drop duplicate closing point if present
  const n =
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
      ? points.length - 1
      : points.length;

  let area2 = 0; // 2 * signed area (no 0.5 for speed)
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    area2 += x1 * y2 - x2 * y1;
  }

  // Convert to signed area; flip sign for y-down screens
  let signedArea = area2 / 2;
  if (yDown) signedArea = -signedArea;

  // In y-up math: signedArea > 0 => CCW, < 0 => CW.
  const orientation =
    signedArea > 0
      ? "counterclockwise"
      : signedArea < 0
        ? "clockwise"
        : "degenerate";
  const clockwise = orientation === "clockwise";

  return { orientation, clockwise, signedArea };
}

export function textSizeMultiplier(width, height) {
  const area = width * height;
  // 4 = tsm * area / 3670016;
  // 4/tsm = area / 3670016;
  // tsm = 4 * 3670016 / area;
  const tsm = (3 * Math.sqrt(3670016)) / Math.sqrt(area);
  return tsm;
}

// #### Tile Functions
export const tilenum_to_lonlat = function (x, y, zoom) {
  const n_tiles = Math.pow(2, zoom);
  const lon_rad = ((x / n_tiles) * 2 - 1) * Math.PI;
  const merc_lat = (1 - (y / n_tiles) * 2) * Math.PI;
  const lat_rad = Math.atan(Math.sinh(merc_lat));

  return { lon: (lon_rad * 180) / Math.PI, lat: (lat_rad * 180) / Math.PI };
};
export const lon2tile = (lon, zoom) =>
  Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
export const lat2tile = (lat, zoom) =>
  Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );

export function getMetersPerPixelAtLatitude(latitude, zoom) {
  const earthCircumference = 40075016.686; // meters
  const mapSize = 256 * Math.pow(2, zoom); // pixels
  const metersPerPixel =
    (earthCircumference * Math.cos((latitude * Math.PI) / 180)) / mapSize;
  return metersPerPixel;
}

export function pointToTileFraction(lon, lat, z) {
  var d2r = Math.PI / 180,
    r2d = 180 / Math.PI;
  var sin = Math.sin(lat * d2r),
    z2 = Math.pow(2, z),
    x = z2 * (lon / 360 + 0.5),
    y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI);

  // Wrap Tile X
  x = x % z2;
  if (x < 0) x = x + z2;
  return [x, y, z];
}

export function latLngToScreenPoint(bounds, location, zoom) {
  const [x0, y0] = bounds;
  const { lat, long } = location;
  let [x, y] = pointToTileFraction(lat, long, zoom);
  [x, y] = [x - x0, y - y0].map((v) => Math.floor(v * 256));
  return { x, y };
}

export function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

export function distance([x1, y1], [x2, y2]) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// #### Math Functions

export function shortestAngle(start, end) {
  return ((((end - start) % 360) + 540) % 360) - 180;
}
export function lerpAngle(start, end, ratio) {
  return start + ((shortestAngle(start, end) * ratio) % 360);
}
export const scaledH = (topo) => (height) =>
  (height - topo.min) / topo.magnitude;

export function times(num, func) {
  let ret = [];
  for (let i = 0; i < num; i++) {
    ret.push(func(i));
  }
  return ret;
}

export function dotProd(v1, v2) {
  let ret = 0;
  for (let i = 0; i < v1.length; i++) {
    ret += v1[i] * v2[i];
  }
  return ret;
}

export function magnitude(v) {
  let ret = 0;
  for (let i = 0; i < v.length; i++) {
    ret += v[i] * v[i];
  }
  return Math.sqrt(ret);
}

export function getAngle(v1, v2) {
  return (Math.atan2(v2[1] - v1[1], v2[0] - v1[0]) * 180) / Math.PI;
}

export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

export function aline(x, y, length, angle) {
  line(x, y, x + length * cos(angle), y + length * sin(angle));
}

export const vert = (angle) =>
  Math.min(...[90, -90].map((v) => Math.abs(angle - v)));

// #### Array Functions
export function windowForEach(array, windowSize, callback, step = 1) {
  let ret = [];
  for (let i = windowSize; i <= array.length; i += step) {
    ret.push(callback(array.slice(i - windowSize, i)));
  }
  return ret;
}

// #### Random functions
export function weightedRandom(items, weights) {
  let totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = Math.random() * totalWeight;
  let currentWeight = 0;

  for (let i = 0; i < items.length; i++) {
    currentWeight += weights[i];
    if (random < currentWeight) {
      return items[i];
    }
  }
}

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomChoiceWithoutReplacement(arr) {
  if (arr.length === 0) {
    return undefined; // Return undefined if the array is empty
  }

  const randomIndex = Math.floor(Math.random() * arr.length);
  const chosenItem = arr.splice(randomIndex, 1)[0]; // Remove the chosen item from the array
  return chosenItem;
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function randomGaussian(mean = 0, stdDev = 1) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

// #### Bounding box Functions
export function collision(rect1, rect2) {
  // Check if the rectangles are colliding
  if (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  ) {
    return true;
  } else {
    return false;
  }
}
