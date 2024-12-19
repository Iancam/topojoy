const featuresToScreenCoords =
  (zoom, box) =>
  ({ properties, geometry }) => {
    let { coordinates } = geometry;
    if (typeof coordinates[0] === "number") {
      coordinates = [coordinates];
    }
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

    return { ...properties, coords };
  };

// #### edit here to only include certain features ####
const isNamedTrail = ({ properties }) =>
  properties.type === "Trail" &&
  properties.surface === "dirt" &&
  properties.name;

const excludeList =
  (exclude) =>
  ({ properties: { name } }) =>
    !exclude.some((drop) => name.includes(drop));

const screenCoordListToObj = (obj, { name, coords }) => {
  obj[name] = obj[name] ? [...obj[name], ...coords] : coords;
  return obj;
};

function getTrails({ box, zoom }, geoJSON, exclude, include) {
  const trails = geoJSON.features
    .filter(
      ({ properties }) =>
        !properties.waterway && !(properties.natural === "peak")
    )
    // .filter(excludeList(exclude))
    .map(featuresToScreenCoords(zoom, box))
    .filter(({ coords }) => coords.length > 0);
  // .reduce(screenCoordListToObj, {});

  return trails;
}

function getWaterFeatures({ box, zoom }, geoJSON) {
  return geoJSON.features
    .filter(({ properties }) => properties.waterway)
    .map(featuresToScreenCoords(zoom, box))
    .reduce(screenCoordListToObj, {});
}

function getMountainFeatures({ box, zoom }, geoJSON) {
  return geoJSON.features
    .filter(({ properties }) => properties.natural === "peak")
    .map(featuresToScreenCoords(zoom, box))
    .reduce(screenCoordListToObj, {});
}

async function getGeoJSONFromShapefile(shapefilePath, { box, zoom }) {
  const shp = new ShpToGeoJson({
    remotePath: shapefilePath,
  });
  await shp.load();
  let geoJSON = shp.getGeoJson();
  return geoJSON;
}

async function getGeoJSONFromOSM(latLongBox) {
  const hiking = `
  way["highway"="trail"](${latLongBox.join(",")});
  way["highway"="path"](${latLongBox.join(",")});
  way["highway"="footway"](${latLongBox.join(",")});
  way["highway"="track"](${latLongBox.join(",")});
  nwr["route"="hiking"](${latLongBox.join(",")});
  `;

  const water = `
  way["waterway"="river"](${latLongBox.join(",")});
  // way["waterway"="stream"](${latLongBox.join(",")});
  // way["natural"="water"](${latLongBox.join(",")});
  `;
  const mountains = `
  node["natural"="peak"](${latLongBox.join(",")});
  node["natural"="mountain"](${latLongBox.join(",")});
  node["natural"="volcano"](${latLongBox.join(",")});
  node["natural"="ridge"](${latLongBox.join(",")});
  `;
  const query = `
  [out:json];
(
  ${hiking}
  ${water}
  ${mountains}
  
);
out body(${latLongBox.join(",")});
>;
out skel qt;
`;

  const osm = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    // The body contains the query
    // to understand the query language see "The Programmatic Query Language" on
    // https://wiki.openstreetmap.org/wiki/Overpass_API#The_Programmatic_Query_Language_(OverpassQL)
    body: "data=" + encodeURIComponent(query),
  })
    .then((data) => data.json())
    .catch((err) => console.log(err));

  const geoJSON = osmtogeojson(osm);
  return geoJSON;
}
