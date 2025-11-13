import _ from "lodash";
import { pointToTileFraction } from "../lib/map/utils";
import osmtogeojson from "osmtogeojson";
import { LS } from "../lib/utils";
// IndexedDB helper functions for caching OSM queries
const DB_NAME = "topojoy-cache";
const STORE_NAME = "osmCache";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB unavailable, falling back to network");
    return null;
  }
}

async function idbPut(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB unavailable, cache not saved");
  }
}

// Clear the OSM cache stored in IndexedDB
export async function clearOSMCache() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB unavailable, cannot clear cache");
  }
}

export const featuresToScreenCoords = (zoom, box) => (feature) => {
  const processCoords = function (coordinates) {
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
    return coords;
  };

  const { properties, geometry } = feature;
  let { coordinates } = geometry;
  if (typeof coordinates[0] === "number") {
    coordinates = [coordinates];
  }
  // handle the case where polygon has more than one ring
  let coords;
  if (geometry.type === "Polygon") {
    if (coordinates.length !== 1) {
      console.log(
        `Polygon named ${properties.name}, id ${properties.id} has more than one ring`
      );
    }
    coords = coordinates.map(processCoords);
  } else {
    coords = processCoords(coordinates);
  }
  return { ...properties, coords };
};

// TODO: this is likely the cause of my error
const screenCoordListToObj = (obj, { name, coords }) => {
  if (obj[name]) {
    obj[name].push(coords);
  } else {
    obj[name] = [coords];
  }
  return obj;
};

export function getUserSelectedTrailsLatLng() {
  const userSelectedTrails = JSON.parse(
    localStorage.getItem(LS.GEOJSON_SELECTED_TRAIL_SEGMENTS) || "[]"
  );
  const userDrawnTrails = JSON.parse(
    localStorage.getItem(LS.GEOJSON_DRAWN_TRAILS)
  ).features;
  // merge userSelectedTrails and userDrawnTrails
  const merged = [...userSelectedTrails, ...userDrawnTrails];

  return merged;
}

export function getUserSelectedTrails({ zoom, box }) {
  const merged = getUserSelectedTrailsLatLng();

  const features = merged.map(featuresToScreenCoords(zoom, box, true));

  return features;
}

export function getTrails({ box, zoom }, geoJSON) {
  const trails = geoJSON.features
    .filter(
      ({ properties, geometry }) =>
        !properties.waterway &&
        !(properties.natural === "peak") &&
        !(properties.natural === "water") &&
        geometry.type === "LineString"
    )
    // .map(makeDenser)
    .map(featuresToScreenCoords(zoom, box))
    .filter(({ coords }) => coords.length > 0)
    .reduce(screenCoordListToObj, {});
  return trails;
}

export function getRivers({ box, zoom }, geoJSON) {
  return (
    geoJSON.features
      .filter(({ properties }) => properties.waterway)
      // .map(makeDenser)
      .map(featuresToScreenCoords(zoom, box))
      .reduce(screenCoordListToObj, {})
  );
}

export function getLakes({ box, zoom }, geoJSON) {
  return geoJSON.features
    .filter(({ properties, geometry }) => {
      if (geometry.type === "Polygon") {
        if (geometry.coordinates.length !== 1) {
          console.warn(
            `Polygon named ${properties.name}, id ${properties.id} has more than one ring`
          );
        }
        return true;
      }
      return false;
    })
    .map(featuresToScreenCoords(zoom, box))
    .reduce((acc, { name, coords }) => {
      acc[name] = coords;
      return acc;
    }, {});
}

export function getMountainFeatures({ box, zoom }, geoJSON) {
  return geoJSON.features
    .filter(
      ({ properties }) => properties.natural === "peak" && properties.name
    )
    .map(featuresToScreenCoords(zoom, box))
    .reduce(screenCoordListToObj, {});
}

// takes a covertile bbox and zoom level and returns a geoJSON object
export function getFeatures({ box, zoom }, geoJSON) {
  return {
    trails: getTrails({ box, zoom }, geoJSON),
    rivers: getRivers({ box, zoom }, geoJSON),
    lakes: getLakes({ box, zoom }, geoJSON),
    mountains: getMountainFeatures({ box, zoom }, geoJSON),
  };
}

export async function getGeoJSONFromOSM(latLongBox) {
  const hiking = `
  way["highway"="trail"](${latLongBox.join(",")});
  way["highway"="path"](${latLongBox.join(",")});
  way["highway"="footway"](${latLongBox.join(",")});
  way["highway"="track"](${latLongBox.join(",")});
  nwr["route"="hiking"](${latLongBox.join(",")});
  `;

  const rivers = `
    way["waterway"="river"](${latLongBox.join(",")});
    way["waterway"="stream"](${latLongBox.join(",")});
    way[natural=water](${latLongBox.join(",")});
`;
  const lakes = `
    way[water=lake](${latLongBox.join(",")});
    way[natural=lake](${latLongBox.join(",")});`;
  const mountains = `
    node["natural"="peak"](${latLongBox.join(",")});
  // node["natural"="mountain"](${latLongBox.join(",")});
  // node["natural"="volcano"](${latLongBox.join(",")});
  // node["natural"="ridge"](${latLongBox.join(",")});
  `;
  const query = `
  [out:json];
(
  ${hiking}
  ${rivers}
  ${lakes}
  ${mountains}
  
);
out body(${latLongBox.join(",")});
>;
out skel qt;
`;
  // Try IndexedDB cache first
  const cached = await idbGet(query);
  if (cached) {
    console.log("using IndexedDB cache");
    return cached;
  }

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

  // Save to IndexedDB cache (best-effort)
  idbPut(query, geoJSON)
    .then(() => {
      console.log("saved to IndexedDB cache");
    })
    .catch(() => {
      console.log("unable to save cache");
    });

  return geoJSON;
}
