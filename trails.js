const featuresToScreenCoords =
  (zoom, box) =>
  ({ properties, geometry: { coordinates } }) => {
    const imageCoords = coordinates
      .map((coord) => pointToTileFraction(...coord, zoom))
      .filter(([x, y]) => {
        const inBounds =
          x < box[2] + 1 && y < box[3] + 1 && x > box[0] && y > box[1];
        // if (inBounds) console.log(x, y, ...box);
        return inBounds;
      })
      .map(([x, y]) => [
        Math.floor(256 * (x - box[0])),
        Math.floor(256 * (y - box[1])),
      ]);
    const coords = _.uniqBy(imageCoords, JSON.stringify);

    return { name: properties.name, coords };
  };

// #### edit here to only include certain features ####
const isNamedTrail = ({ properties }) =>
  properties.type === "Trail" &&
  properties.surface === "dirt" &&
  properties.name !== "";

const exclude = [
  "Canyon",
  "Eileen",
  "Ute",
  "East Ute",
  "East Creek",
  "Cunningham",
  "Rincon",
  "Pole",
  "Horse Route",
  "View Trail",
  "Vis Trail",
  "Bear Creek",
  "Whitehead",
  "Piedra",
];
const excludeList = ({ properties: { name } }) =>
  !exclude.some((drop) => name.includes(drop));

const screenCoordListToObj = (obj, { name, coords }) => {
  obj[name] = obj[name] ? [...obj[name], ...coords] : coords;
  return obj;
};

async function getTrails(shapefilePath, { box, zoom }) {
  const shp = new ShpToGeoJson({
    remotePath: shapefilePath,
  });
  await shp.load();
  let geoJSON = shp.getGeoJson();

  const trails = geoJSON.features
    .filter(isNamedTrail)
    .filter(excludeList)
    .map(featuresToScreenCoords(zoom, box))
    .filter(({ coords }) => coords.length > 0)
    .reduce(screenCoordListToObj, {});

  return trails;
}
