import { marked } from 'marked';
import store, { interfaceStates } from '../store';
import { reaction } from 'mobx';
import {
  addSegmentLayer,
  addVertexLayer,
  removeVertexLayer
} from '../ui/draw/splitTrails';
// const ApiContent = require('../../API.md').default;

// user selects area using rect. tool √
// transition the help text to let user know they can select trails
// load trails into map
// let user select trails and draw trails √
// user clicks button to indicate they are done
// delete other trails
// let user select vertex from trails
// split the trail at the selected vertex
// user then selects the trail to keep
// delete the other trail
// allow the user to undo their action

const selectRectMD = `
## 1. Zoom to the area you want to remember

Use the search bar, then zoom and scroll to your specific area.

### Map size

I recommend keeping the map scale, found in the bottom right
corner, below 10km. Any larger and your map will be huge.

## 2. Select the area

Select the rectangle tool to the right of the map. Click and
release to place the first point, then click again to place 
the second point. **Don't click and drag. This moves the map.**

When you're finished selecting, click <button id="toSelectTrails" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Next</button>

`;

const selectTrailsMD = `
## 3. Select trails to highlight

- Click a trail to select/deselect it
- You can select multiple trails

Select the trails you want to highlight in the map. If you want to
select only part of a trail, you can make edits in the next step.

To see the name of a trail, zoom in close. If the trail has a name, it will
appear as a label.

When you're finished selecting, click <button id="toTrailVertices" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Next</button>
`;

const editTrailVerticesMD = `
## 4. Edit your selected trails

Click on the trail where you'd like to split.

You can click multiple times.

You can also go back to the previous step by clicking <button id="toSelectTrails" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Back</button>

When you're done, click <button id="toSelectSegments" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Next</button>

`;

const selectSegmentsMD = `
## 5. Select segments

Select the segments you want to keep.

go <button id="toTrailVertices" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Back</button>

When you're finished selecting, click <button id="toApp" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">Next</button>

`;

function setTrailsLayerInteraction(map, interactive) {
  try {
    const layerId = 'topojoy-trails-line';
    const sourceId = 'topojoy-trails';
    map.__topojoyTrailsInteractive = interactive;
    map.getCanvas().style.cursor = '';
    try {
      map.removeFeatureState({ source: sourceId, layer: layerId });
    } catch (e) {}
  } catch (e) {
    console.error(e);
  }
}

export default function (context) {
  const onToSelectTrailsVertices = () => {
    store.setInterfaceState(interfaceStates.VERTICES);
  };

  const onToSelectSegments = () => {
    store.setInterfaceState(interfaceStates.TRAIL_SECTIONS);
    removeVertexLayer(context.map);
    store.splitTrailsAtVertices();
    addSegmentLayer(context.map, store);
  };

  const onToSelectTrails = () => {
    store.setInterfaceState(interfaceStates.TRAILS);
    removeVertexLayer(context.map);
    setTrailsLayerInteraction(context.map, true);
  };

  let disposer = null;

  const onToApp = () => {
    const linestringFeatures = window.api.data
      .all()
      .map.features.filter((f) => f.geometry.type === 'LineString');
    // get rid of store reaction
    disposer && disposer();
    // put data in localStorage
    localStorage.setItem('topojoy:geojson.bbox', JSON.stringify(store.bbox));

    localStorage.setItem(
      'topojoy:geojson.selectedtrailSegments',
      JSON.stringify(store.getSelectedTrailSegments())
    );
    localStorage.setItem(
      'topojoy:geojson.drawnTrails',
      JSON.stringify({
        type: 'FeatureCollection',
        features: linestringFeatures
      })
    );
    // go to map
    window.location.href = '/app';
  };

  const StateToHtml = {
    [interfaceStates.BBOX]: [
      marked(selectRectMD),
      () => {
        document
          .querySelector('#toSelectTrails')
          .addEventListener('click', onToSelectTrails);
      },
      () => {
        document
          .querySelector('#toSelectTrails')
          .removeEventListener('click', onToSelectTrails);
      }
    ],
    [interfaceStates.TRAILS]: [
      marked(selectTrailsMD),
      () => {
        // select button where Id is toTrailVertices
        document
          .querySelector('#toTrailVertices')
          .addEventListener('click', onToSelectTrailsVertices);
      },
      () => {
        document
          .querySelector('#toTrailVertices')
          .removeEventListener('click', onToSelectTrailsVertices);
      }
    ],
    [interfaceStates.VERTICES]: [
      marked(editTrailVerticesMD),
      () => {
        addVertexLayer(context.map, store);
        setTrailsLayerInteraction(context.map, false);
        document
          .querySelector('#toSelectTrails')
          .addEventListener('click', onToSelectTrails);
        document
          .querySelector('#toSelectSegments')
          .addEventListener('click', onToSelectSegments);
      },
      () => {
        removeVertexLayer(context.map);

        document
          .querySelector('#toSelectTrails')
          .removeEventListener('click', onToSelectTrails);
        document
          .querySelector('#toSelectSegments')
          .removeEventListener('click', onToSelectSegments);
      }
    ],
    [interfaceStates.TRAIL_SECTIONS]: [
      marked(selectSegmentsMD),
      () => {
        document
          .querySelector('#toTrailVertices')
          .addEventListener('click', onToSelectTrailsVertices);
        document.querySelector('#toApp').addEventListener('click', onToApp);
      },
      () => {
        document.querySelector('#toApp').removeEventListener('click', onToApp);
      }
    ]
  };

  let renderHasBeenCalled = false;

  function render(selection) {
    const container = selection
      .html('')
      .append('div')
      .attr('class', 'pad2 prose');
    let onExit = null;
    const update = () => {
      if (onExit) {
        onExit();
        onExit = null;
      }
      console.log(store.interfaceState);
      const [html, onEnter, onExitFn] = StateToHtml[store.interfaceState];
      container.html(html);
      onEnter && onEnter();
      onExit = onExitFn;
    };
    update();
    if (!renderHasBeenCalled) {
      renderHasBeenCalled = true;
      disposer = reaction(
        () => store.interfaceState,
        () => {
          update();
        }
      );
    }
  }

  render.off = function () {};

  return render;
}
