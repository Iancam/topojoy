import escape from 'escape-html';
import geojsonRandom from 'geojson-random';
import geojsonExtent from '@mapbox/geojson-extent';
import geojsonFlatten from 'geojson-flatten';
import polyline from '@mapbox/polyline';
import wkx from 'wkx';
import Buffer from 'buffer';
import zoomextent from './zoomextent';

export const addUserLayer = function (context, _url, _name) {
  const url = escape(_url),
    name = escape(_name);

  // reset the control if a user-layer was added before
  d3.select('.user-layer-button').remove();

  function addUserSourceAndLayer() {
    // if the source and layer aren't present, add them
    context.map.setStyle({
      name: 'user-layer',
      version: 8,
      sources: {
        'user-layer': {
          type: 'raster',
          tiles: [url],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'user-layer',
          type: 'raster',
          source: 'user-layer',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    });

    // make this layer's button active
    d3.select('.layer-switch .active').classed('active', false);
    d3.select('.user-layer-button').classed('active', true);

    context.data.set({
      mapStyleLoaded: true
    });
  }

  // append a button to the existing style selection UI
  d3.select('.layer-switch')
    .append('button')
    .attr('class', 'pad0x user-layer-button')
    .on('click', addUserSourceAndLayer)
    .text(name);

  addUserSourceAndLayer();
};

export { zoomextent };

export const clear = function (context) {
  context.data.clear();
};

export const random = function (context, count, type) {
  context.data.mergeFeatures(geojsonRandom(count, type).features, 'meta');
};

export const bboxify = function (context) {
  context.data.set({ map: geojsonExtent.bboxify(context.data.get('map')) });
};

export const flatten = function (context) {
  context.data.set({ map: geojsonFlatten(context.data.get('map')) });
};

const polyline7 = function (context) {
  const input = prompt('Enter your polyline');
  try {
    const decoded = polyline.toGeoJSON(input);
    context.data.set({ map: decoded });
  } catch (e) {
    alert('Sorry, we were unable to decode that polyline');
  }
};

export { polyline7 as polyline };

export const polyline6 = function (context) {
  const input = prompt('Enter your polyline');
  try {
    const decoded = polyline.toGeoJSON(input, 6);
    context.data.set({ map: decoded });
  } catch (e) {
    alert('Sorry, we were unable to decode that polyline');
  }
};

export const wkxBase64 = function (context) {
  const input = prompt('Enter your Base64 encoded WKB/EWKB');
  try {
    const decoded = wkx.Geometry.parse(Buffer.from(input, 'base64'));
    context.data.set({ map: decoded.toGeoJSON() });
    zoomextent(context);
  } catch (e) {
    console.error(e);
    alert('Sorry, we were unable to decode that Base64 encoded WKX data');
  }
};

export const wkxHex = function (context) {
  const input = prompt('Enter your Hex encoded WKB/EWKB');
  try {
    const decoded = wkx.Geometry.parse(Buffer.from(input, 'hex'));
    context.data.set({ map: decoded.toGeoJSON() });
    zoomextent(context);
  } catch (e) {
    console.error(e);
    alert('Sorry, we were unable to decode that Hex encoded WKX data');
  }
};

export const wkxString = function (context) {
  const input = prompt('Enter your WKT/EWKT String');
  try {
    const decoded = wkx.Geometry.parse(input);
    context.data.set({ map: decoded.toGeoJSON() });
    zoomextent(context);
  } catch (e) {
    console.error(e);
    alert('Sorry, we were unable to decode that WKT data');
  }
};
