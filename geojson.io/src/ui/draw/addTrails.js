import { getGeoJSONFromOSM, trailsFilter } from '../../../../src/map/trails.js';
import { tilesForFeatures } from '../../../../src/map/processImage.js';
import store, { interfaceStates } from '../../store.js';
import flash from '../flash.js';
import { select } from 'd3-selection';

export const addTrails = (rect, map, store) => {
  store.setBBox(rect);
  showNoninteractiveBBox(map, rect);

  // download all the trails within the bbox
  const { bounds } = tilesForFeatures(rect, 13);
  // caches result, so we get all features to save another download
  getGeoJSONFromOSM(bounds.latLngBox)
    .then((geoJSON) => {
      // load the trails into the map and the store
      _addTrails(geoJSON, map, store);
    })
    .catch((err) => {
      console.error('Failed to load trail data:', err);
      flash(
        select('body'),
        err.message || 'Failed to load trail data. Please try again later.'
      );
    });
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

/**
 * Removes shorter trails that are significantly overlapped by a longer trail.
 * Two trails "overlap significantly" when ≥70% of the shorter trail's vertices
 * each lie within ~15m of any vertex on the longer trail.
 * When one trail is completely contained in another (≥95% covered), only the
 * longer trail is kept.
 */
const OVERLAP_THRESHOLD = 0.7;
const PROXIMITY_DEG_SQ = 0.000135 * 0.000135; // ~15 m in degrees, squared

const minDistSqToTrail = (coord, coords) => {
  let min = Infinity;
  for (const c of coords) {
    const dx = coord[0] - c[0];
    const dy = coord[1] - c[1];
    const d = dx * dx + dy * dy;
    if (d < min) min = d;
  }
  return min;
};

const overlapFraction = (shorterCoords, longerCoords) => {
  if (!shorterCoords.length) return 0;
  let covered = 0;
  for (const coord of shorterCoords) {
    if (minDistSqToTrail(coord, longerCoords) <= PROXIMITY_DEG_SQ) covered++;
  }
  return covered / shorterCoords.length;
};

const deduplicateOverlappingTrails = (features) => {
  const removed = new Set();
  for (let i = 0; i < features.length; i++) {
    if (removed.has(i)) continue;
    const a = features[i];
    const aCoords = a.geometry?.coordinates || [];
    for (let j = i + 1; j < features.length; j++) {
      if (removed.has(j)) continue;
      const b = features[j];
      const bCoords = b.geometry?.coordinates || [];
      if (!aCoords.length || !bCoords.length) continue;

      const aIsLonger = aCoords.length >= bCoords.length;
      const longerCoords = aIsLonger ? aCoords : bCoords;
      const shorterCoords = aIsLonger ? bCoords : aCoords;
      const shorterIdx = aIsLonger ? j : i;

      const fraction = overlapFraction(shorterCoords, longerCoords);
      if (fraction >= OVERLAP_THRESHOLD) {
        removed.add(shorterIdx);
      }
    }
  }
  return features.filter((_, i) => !removed.has(i));
};

// expects the selected trailsFC, not all of the bbox trails

const _addTrails = (geoJSON, map, store) => {
  const sourceId = 'topojoy-trails';
  const layerId = 'topojoy-trails-line';
  const ensureLabelLayer = () => {
    const labelLayerId = 'topojoy-trails-label';
    // if (!map.getLayer(labelLayerId)) {
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: sourceId,
      minzoom: 9,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 250,
        // 'text-field': '{name}',
        'text-field': ['coalesce', ['get', 'name'], ['get', 'ref']],
        'text-size': 12,
        'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        'text-allow-overlap': false,
        'text-pitch-alignment': 'map'
      },
      paint: {
        'text-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#ffeb3b',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffffff',
          '#111827'
        ]
        // 'text-halo-color': '#000000',
        // 'text-halo-width': 1,
        // 'text-halo-blur': 0.25,
        // 'text-opacity': 0.95
      }
    });
    // }
  };

  // Filter to likely trails and ensure each feature has a stable id
  const lineFeatures = deduplicateOverlappingTrails(
    (geoJSON.features || []).filter(trailsFilter).map((f, i) => ({
      ...f,
      id: i
    }))
  );

  store.setBBoxTrails(lineFeatures);

  // add the trails to the map
  const trailsFC = {
    type: 'FeatureCollection',
    features: lineFeatures
  };

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(trailsFC);
    ensureLabelLayer();
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
    ensureLabelLayer();

    // Attach hover + click handlers once per map instance
    if (!map.__topojoyTrailsHandlersAttached) {
      map.__topojoyTrailsHandlersAttached = true;
      map.__topojoyTrailsInteractive = false;
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
          console.log('unselecting', fIndex);
          store.deleteSelectedTrailIndex(fIndex);
          map.setFeatureState(
            { source: sourceId, id: fIndex },
            { selected: false }
          );
        } else {
          console.log('selecting', fIndex);
          store.addSelectedTrailIndex(fIndex);
          map.setFeatureState(
            { source: sourceId, id: fIndex },
            { selected: true }
          );
        }
        // Optional: persist selection
      });
    }
  }
};
