import { interfaceStates } from '../../store';

export const addVertexLayer = (map, store) => {
  const sourceId = 'topojoy-trails';
  const layerId = 'topojoy-trails-line';
  const vertexSourceId = 'topojoy-trails-vertices';
  const vertexLayerId = 'topojoy-trails-vertices-circle';

  const selectedTrails = store.selectedTrails;
  store.setSelectedtrailSegments(selectedTrails);

  const vertices = buildVerticesFromTrails(store.selectedtrailSegments);
  if (!map.getSource(vertexSourceId)) {
    map.addSource(vertexSourceId, {
      type: 'geojson',
      data: vertices
    });
    map.addLayer({
      id: vertexLayerId,
      type: 'circle',
      source: vertexSourceId,
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          5,
          ['boolean', ['feature-state', 'selected'], false],
          7,
          4
        ],
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffeb3b',
          ['boolean', ['feature-state', 'selected'], false],
          '#ffffff',
          '#e91e63'
        ]
      }
    });
  } else {
    map.getSource(vertexSourceId).setData(vertices);
  }
  // TODO: (break coords into 100 even sized segments, for easy clicking)
  if (!map.__topojoyVertexHandlersAttached) {
    map.__topojoyVertexHandlersAttached = true;
    let hoveredVertexId = null;
    map.on('mousemove', vertexLayerId, (e) => {
      const f = e.features && e.features[0];
      const newId = f?.id;
      if (hoveredVertexId !== null && hoveredVertexId !== newId) {
        map.setFeatureState(
          { source: vertexSourceId, id: hoveredVertexId },
          { hover: false }
        );
      }
      if (newId !== undefined && newId !== null) {
        map.setFeatureState(
          { source: vertexSourceId, id: newId },
          { hover: true }
        );
        hoveredVertexId = newId;
        map.getCanvas().style.cursor = 'pointer';
      }
    });

    map.on('mouseleave', vertexLayerId, () => {
      if (hoveredVertexId !== null) {
        map.setFeatureState(
          { source: vertexSourceId, id: hoveredVertexId },
          { hover: false }
        );
        hoveredVertexId = null;
      }
      map.getCanvas().style.cursor = '';
    });

    map.on('click', vertexLayerId, (e) => {
      const f = e.features && e.features[0];
      const fid = f?.id;
      if (fid === undefined || fid === null) return;
      const parentId = f?.properties?.parentId;
      const index = f?.properties?.index;
      if (parentId === undefined || parentId === null) {
        console.warn('parentId is undefined or null');
        return;
      }
      // highlight the selected vertex
      if (store.selectedVertices[fid]) {
        store.deleteSelectedVertex(fid);
        map.setFeatureState(
          { source: vertexSourceId, id: fid },
          { selected: false }
        );
      } else {
        console.log({ fid, parentId, index });

        store.addSelectedVertex(fid, parentId, index);
        map.setFeatureState(
          { source: vertexSourceId, id: fid },
          { selected: true }
        );
      }
    });
  }
};

// expects the selected trails, not the bbox trails
const buildVerticesFromTrails = (features) => {
  const vertexFeatures = [];
  let vid = 0;
  for (const [id, lf] of Object.entries(features)) {
    const coords = lf.geometry?.coordinates || [];
    for (let idx = 0; idx < coords.length; idx++) {
      const coord = coords[idx];

      vertexFeatures.push({
        type: 'Feature',
        id: vid,
        properties: { id: vid, parentId: id, index: idx },
        geometry: { type: 'Point', coordinates: coord }
      });
      vid++;
    }
  }
  return { type: 'FeatureCollection', features: vertexFeatures };
};

export const addSegmentLayer = (map, store) => {
  const sourceId = 'topojoy-trails';
  const layerId = 'topojoy-trails-line';
  const segmentSourceId = 'topojoy-trails-segments';
  const segmentLayerId = 'topojoy-trails-segments-line';

  const segments = {
    type: 'FeatureCollection',
    features: Object.entries(store.selectedtrailSegments).map(([id, f], i) => {
      return { ...f, id };
    })
  };
  if (!map.getSource(segmentSourceId)) {
    map.addSource(segmentSourceId, {
      type: 'geojson',
      data: segments
    });
    map.addLayer({
      id: segmentLayerId,
      type: 'line',
      source: segmentSourceId,
      paint: {
        // Highlight when selected or hovered using feature-state
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffffff',
          ['boolean', ['feature-state', 'selected'], false],
          '#ffeb3b',
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
      }
    });
  } else {
    map.getSource(segmentSourceId).setData(segments);
  }

  // select all segments by default
  for (const { id } of segments.features) {
    store.addSelectedtrailSegmentId(id);
    map.setFeatureState({ source: segmentSourceId, id }, { selected: true });
  }

  if (!map.__topojoySegmentsHandlersAttached) {
    map.__topojoySegmentsHandlersAttached = true;
    let hoveredId = null;
    map.on('mousemove', segmentLayerId, (e) => {
      const f = e.features && e.features[0];
      const newId = f?.id;
      if (hoveredId !== null && hoveredId !== newId) {
        map.setFeatureState(
          { source: segmentSourceId, id: hoveredId },
          { hover: false }
        );
      }
      if (newId !== undefined && newId !== null) {
        map.setFeatureState(
          { source: segmentSourceId, id: newId },
          { hover: true }
        );
        hoveredId = newId;
        map.getCanvas().style.cursor = 'pointer';
      }
    });

    map.on('mouseleave', segmentLayerId, () => {
      if (hoveredId !== null) {
        map.setFeatureState(
          { source: segmentSourceId, id: hoveredId },
          { hover: false }
        );
        hoveredId = null;
      }
      map.getCanvas().style.cursor = '';
    });

    map.on('click', segmentLayerId, (e) => {
      const f = e.features && e.features[0];
      const fid = f?.id;

      if (fid === undefined || fid === null) return;
      if (store.selectedtrailSegmentIds.has(fid)) {
        store.deleteSelectedtrailSegmentId(fid);
        map.setFeatureState(
          { source: segmentSourceId, id: fid },
          { selected: false }
        );
      } else {
        store.addSelectedtrailSegmentId(fid);
        map.setFeatureState(
          { source: segmentSourceId, id: fid },
          { selected: true }
        );
      }
    });
  }
};

export const removeVertexLayer = (map) => {
  try {
    if (!map) return;
    const vertexSourceId = 'topojoy-trails-vertices';
    const vertexLayerId = 'topojoy-trails-vertices-circle';

    // Remove layer then source
    if (map.getLayer(vertexLayerId)) map.removeLayer(vertexLayerId);
    if (map.getSource(vertexSourceId)) map.removeSource(vertexSourceId);

    // Reset flags so handlers can be attached again later
    map.__topojoyVertexHandlersAttached = false;
  } catch (e) {
    console.warn('Failed to remove vertex layer', e);
  }
};
