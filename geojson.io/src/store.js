import { observable, action, makeAutoObservable, computed } from 'mobx';
import { LS } from '../../src/lib/utils.ts';
import { clearOSMCache } from '../../src/map/trails.js';
// state to consider:
// interface state:
// selecting bbox
// selecting trails
// selecting vertices
// selecting trailSections
// editing
// bbox
// selected trails
// selected vertices
// selected trail sections
// undo, redo

export const interfaceStates = {
  BBOX: 'bbox',
  TRAILS: 'trails',
  VERTICES: 'vertices',
  TRAIL_SECTIONS: 'trail sections',
  EDITING: 'editing'
};

//

export class Store {
  interfaceState = interfaceStates.BBOX;
  bbox = null;
  bboxTrails = []; //
  selectedTrailIndices = new Set();
  selectedTrails = {}; // array of trail geometries
  selectedVertices = {};

  selectedtrailSegments = {};
  selectedtrailSegmentIds = new Set();
  constructor() {
    makeAutoObservable(this);
  }
  // @computed
  get selectedTrails() {
    return Object.values(this.selectedTrails);
  }
  setInterfaceState(state) {
    this.interfaceState = state;
  }
  setBBox(bbox) {
    this.bbox = bbox;
    localStorage.setItem(LS.IS_DEFAULT_KEEP_LIST_SET, 'false');
    localStorage.setItem(LS.GEOJSON_BBOX, JSON.stringify(bbox));
    localStorage.setItem(LS.FORM, JSON.stringify(null));
    // Clear cached OSM data whenever bbox changes
    clearOSMCache();
  }
  // changes selected trails from an object indexed on indices
  // from the bboxTrails
  //

  setBBoxTrails(trails) {
    this.bboxTrails = trails;
  }
  deleteSelectedTrailIndex(index) {
    this.selectedTrailIndices.delete(index);
    this.selectedTrails = this.selectedTrails.filter((f, i) => i !== index);
  }
  addSelectedTrailIndex(index) {
    this.selectedTrailIndices.add(index);
    this.selectedTrails[index] = this.bboxTrails[index];
  }

  /**
   * Splits a trail at a vertex.
   * adds the splitting vertex to the selected vertices set
   * @param {int} parentId the id of the trail to split, which is the index of the feature in the bboxTrails array
   * @param {int} index the index of the vertex to split at
   * @param {Store} store
   * @returns {boolean} true if the trail was split, false otherwise
   */
  splitTrailAtVertex(id, parentId, index) {
    delete this.selectedVertices[id];
    // find the trail with the given parentId
    const trail = this.selectedtrailSegments[parentId];
    // split the trail at the given index
    const coords = trail.geometry.coordinates;
    const aCoords = coords.slice(0, index);
    const bCoords = coords.slice(index);

    const maxId = Object.values(this.selectedtrailSegments).length;
    const idA = parentId;
    const idB = maxId;

    const baseProps = trail.properties || {};
    const fA = {
      type: 'Feature',
      id: idA,
      geometry: {
        type: 'LineString',
        coordinates: aCoords
      },
      properties: {
        ...baseProps,
        id: idA
      }
    };
    const fB = {
      type: 'Feature',
      id: idB,
      geometry: {
        type: 'LineString',
        coordinates: bCoords
      },
      properties: {
        ...baseProps,
        id: idB
      }
    };
    // update store, overwriting old trail, adding new ones, and updating selectedVertices.
    this.selectedtrailSegments[parentId] = fA;
    this.selectedtrailSegments[idB] = fB;

    // update selected vertices
    // don't handle the case where the splitting vertex is selected
    Object.entries(this.selectedVertices).forEach(([id, vertex]) => {
      if (vertex.parentId === parentId && vertex.index > index) {
        this.selectedVertices[id].parentId = idB;
        this.selectedVertices[id].index = vertex.index - index;
      }
    });

    return true;
  }

  addSelectedVertex(id, parentId, index) {
    this.selectedVertices[id] = { parentId, index, id };
  }

  splitTrailsAtVertices() {
    for (const [id, vertex] of Object.entries(this.selectedVertices)) {
      this.splitTrailAtVertex(id, vertex.parentId, vertex.index);
    }
    // this.selectedVertices = {};
  }

  deleteSelectedVertex(id) {
    delete this.selectedVertices[id];
  }
  /**
   *
   * @param {Object<Integer, Feature>} trails
   */
  setSelectedtrailSegments(trails) {
    this.selectedtrailSegments = trails;
  }

  deleteSelectedtrailSegmentId(id) {
    this.selectedtrailSegmentIds.delete(id);
    // delete this.selectedtrailSegments[id];
  }
  addSelectedtrailSegmentId(id) {
    this.selectedtrailSegmentIds.add(Number(id));
    // this.selectedtrailSegments[id] = this.bboxTrails[id];
  }
  getSelectedTrailSegments() {
    return Object.values(this.selectedtrailSegments).filter((f) =>
      this.selectedtrailSegmentIds.has(Number(f.id))
    );
  }

  /**
   * Clears all TopoJoy editor state related to bbox/trails selection.
   * Does not touch external map layers/sources; the UI button will handle that.
   */
  clearTopojoy() {
    this.interfaceState = interfaceStates.BBOX;
    this.bbox = null;
    this.bboxTrails = [];
    this.selectedTrailIndices = new Set();
    this.selectedTrails = {};
    this.selectedVertices = {};
    this.selectedtrailSegments = {};
    this.selectedtrailSegmentIds = new Set();
  }
}

export default new Store();
