import { getGeoJSONFromOSM } from '../../../../src/map/trails.js';
import { tilesForFeatures } from '../../../../src/map/processImage.js';
import store, { interfaceStates } from '../../store.js';

// from https://github.com/thegisdev/mapbox-gl-draw-rectangle-mode
const doubleClickZoom = {
  enable: (ctx) => {
    setTimeout(() => {
      // First check we've got a map and some context.
      if (
        !ctx.map ||
        !ctx.map.doubleClickZoom ||
        !ctx._ctx ||
        !ctx._ctx.store ||
        !ctx._ctx.store.getInitialConfigValue
      )
        return;
      // Now check initial state wasn't false (we leave it disabled if so)
      if (!ctx._ctx.store.getInitialConfigValue('doubleClickZoom')) return;
      ctx.map.doubleClickZoom.enable();
    }, 0);
  },
  disable(ctx) {
    setTimeout(() => {
      if (!ctx.map || !ctx.map.doubleClickZoom) return;
      // Always disable here, as it's necessary in some cases.
      ctx.map.doubleClickZoom.disable();
    }, 0);
  }
};

const DrawRectangle = {
  // When the mode starts this function will be called.
  onSetup: function () {
    const rectangle = this.newFeature({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[]]
      }
    });
    const rectBtn = document.querySelector(
      '.mapbox-gl-draw_ctrl-draw-btn.mapbox-gl-draw_rectangle'
    );
    rectBtn.classList.add('active');
    this.addFeature(rectangle);
    this.clearSelectedFeatures();
    doubleClickZoom.disable(this);
    this.updateUIClasses({ mouse: 'add' });
    this.setActionableState({
      trash: true
    });
    return {
      rectangle
    };
  },
  // support mobile taps
  onTap: function (state, e) {
    // emulate 'move mouse' to update feature coords
    if (state.startPoint) this.onMouseMove(state, e);
    // emulate onClick
    this.onClick(state, e);
  },
  // Whenever a user clicks on the map, Draw will call `onClick`
  onClick: function (state, e) {
    // if state.startPoint exist, means its second click
    // change to  simple_select mode
    if (
      state.startPoint &&
      state.startPoint[0] !== e.lngLat.lng &&
      state.startPoint[1] !== e.lngLat.lat
    ) {
      this.updateUIClasses({ mouse: 'pointer' });
      state.endPoint = [e.lngLat.lng, e.lngLat.lat];
      this.changeMode('simple_select', { featuresId: state.rectangle.id });
    }
    // on first click, save clicked point coords as starting for  rectangle
    const startPoint = [e.lngLat.lng, e.lngLat.lat];
    state.startPoint = startPoint;
  },
  onMouseMove: function (state, e) {
    // if startPoint, update the feature coordinates, using the bounding box concept
    // we are simply using the startingPoint coordinates and the current Mouse Position
    // coordinates to calculate the bounding box on the fly, which will be our rectangle
    if (state.startPoint) {
      state.rectangle.updateCoordinate(
        '0.0',
        state.startPoint[0],
        state.startPoint[1]
      ); // minX, minY - the starting point
      state.rectangle.updateCoordinate(
        '0.1',
        e.lngLat.lng,
        state.startPoint[1]
      ); // maxX, minY
      state.rectangle.updateCoordinate('0.2', e.lngLat.lng, e.lngLat.lat); // maxX, maxY
      state.rectangle.updateCoordinate(
        '0.3',
        state.startPoint[0],
        e.lngLat.lat
      ); // minX,maxY
      state.rectangle.updateCoordinate(
        '0.4',
        state.startPoint[0],
        state.startPoint[1]
      ); // minX,minY - ending point (equals to starting point)
    }
  },
  // Whenever a user clicks on a key while focused on the map, it will be sent here
  onKeyUp: function (state, e) {
    if (e.keyCode === 27) return this.changeMode('simple_select');
  },
  onStop: function (state) {
    doubleClickZoom.enable(this);
    this.updateUIClasses({ mouse: 'none' });
    this.activateUIButton();
    document
      .querySelector('.mapbox-gl-draw_ctrl-draw-btn.mapbox-gl-draw_rectangle')
      .classList.remove('active');
    // check to see if we've deleted this feature
    if (this.getFeature(state.rectangle.id) === undefined) return;

    // remove last added coordinate
    state.rectangle.removeCoordinate('0.4');
    if (state.rectangle.isValid()) {
      // this.map.fire('draw.create', {
      //   features: [state.rectangle.toGeoJSON()]
      // });
      store.setBBox(state.rectangle.toGeoJSON());

      this.deleteFeature([state.rectangle.id], { silent: true });
      this.changeMode('simple_select', {}, { silent: true });

      showNoninteractiveBBox(this.map, state.rectangle.toGeoJSON());

      // download all the trails within the bbox
      const { bounds } = tilesForFeatures(state.rectangle.toGeoJSON(), 13);
      // caches result, so we get all features to save another download
      getGeoJSONFromOSM(bounds.latLngbox, {
        streams: true,
        rivers: true,
        trails: true,
        peaks: true,
        lakes: true
      }).then((geoJSON) => {
        // load the trails into the map and the store

        addTrails(geoJSON, this.map, store);
      });
    } else {
      this.deleteFeature([state.rectangle.id], { silent: true });
      this.changeMode('simple_select', {}, { silent: true });
    }
  },
  toDisplayFeatures: function (state, geojson, display) {
    const isActivePolygon = geojson.properties.id === state.rectangle.id;
    geojson.properties.active = isActivePolygon ? 'true' : 'false';
    if (!isActivePolygon) return display(geojson);

    // Only render the rectangular polygon if it has the starting point
    if (!state.startPoint) return;
    return display(geojson);
  },
  onTrash: function (state) {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode('simple_select');
  }
};

const showNoninteractiveBBox = (map, bboxFeature) => {
  const bboxSourceId = 'topojoy-bbox';
  const bboxLayerId = 'topojoy-bbox-outline';

  if (!map.getSource(bboxSourceId)) {
    map.addSource(bboxSourceId, { type: 'geojson', data: bboxFeature });
    map.addLayer({
      id: bboxLayerId,
      type: 'line',
      source: bboxSourceId,
      paint: {
        'line-color': '#4b5563', // slate-600
        'line-width': 2,
        'line-dasharray': [2, 2]
      },
      layout: { 'line-cap': 'butt', 'line-join': 'miter' }
    }); // optionally insert below the trails line layer
  } else {
    map.getSource(bboxSourceId).setData(bboxFeature);
  }
};

// expects the selected trailsFC, not all of the bbox trails

const addTrails = (geoJSON, map, store) => {
  const sourceId = 'topojoy-trails';
  const layerId = 'topojoy-trails-line';

  // what to do when trails overlap?

  // Filter to likely trails and ensure each feature has a stable id
  const lineFeatures = (geoJSON.features || [])
    .filter(
      (f) =>
        f.geometry?.type === 'LineString' &&
        (f.properties?.highway === 'path' ||
          f.properties?.highway === 'footway' ||
          f.properties?.highway === 'track' ||
          f.properties?.highway === 'trail' ||
          f.properties?.route === 'hiking')
    )
    .map((f, i) => ({
      ...f,
      id: i
    }));

  // TODO: constrain trails so that they fit on the selected portion of the map
  // (cut off coords outside of bbox area)

  store.setBBoxTrails(lineFeatures);

  // add the trails to the map
  const trailsFC = {
    type: 'FeatureCollection',
    features: lineFeatures
  };

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(trailsFC);
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data: trailsFC
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        // Highlight when selected or hovered using feature-state
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#ffeb3b',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffffff',
          '#e91e63'
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          4,
          ['boolean', ['feature-state', 'hover'], false],
          3,
          2
        ],
        'line-opacity': 0.95
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    });

    // Attach hover + click handlers once per map instance
    if (!map.__topojoyTrailsHandlersAttached) {
      map.__topojoyTrailsHandlersAttached = true;
      map.__topojoyTrailsInteractive = true;
      let hoveredId = null;
      map.on('mousemove', layerId, (e) => {
        if (!map.__topojoyTrailsInteractive) return;
        const f = e.features && e.features[0];
        const newId = f?.id;
        if (hoveredId !== null && hoveredId !== newId) {
          map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false }
          );
        }
        if (newId !== undefined && newId !== null) {
          map.setFeatureState({ source: sourceId, id: newId }, { hover: true });
          hoveredId = newId;
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', layerId, () => {
        if (!map.__topojoyTrailsInteractive) return;
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false }
          );
          hoveredId = null;
        }
        map.getCanvas().style.cursor = '';
      });

      map.on('click', layerId, (e) => {
        if (!map.__topojoyTrailsInteractive) return;
        const f = e.features && e.features[0];
        const fIndex = f?.id;
        if (fIndex === undefined || fIndex === null) return;
        if (store.selectedTrailIndices.has(fIndex)) {
          store.deleteSelectedTrailIndex(fIndex);
          map.setFeatureState(
            { source: sourceId, id: fIndex },
            { selected: false }
          );
        } else {
          store.addSelectedTrailIndex(fIndex);
          map.setFeatureState(
            { source: sourceId, id: fIndex },
            { selected: true }
          );
        }
        // Optional: persist selection
        // localStorage.setItem('topojoy:selectedTrails', JSON.stringify([...selectedIds]));
      });
    }
  }
};

export default DrawRectangle;
