import { marked } from 'marked';
import store, { interfaceStates } from '../store';
import { reaction } from 'mobx';
import {
  addSegmentLayer,
  addVertexLayer,
  removeVertexLayer
} from '../ui/draw/splitTrails';
import { LS } from '../../../src/lib/utils';
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
`;

const selectTrailsMD = `
## 3. Select trails to highlight

- Click a trail to select/deselect it
- You can select multiple trails

Select the trails you want to highlight in the map. If you want to
select only part of a trail, you can make edits in the next step.

**To see the name of a trail, zoom in close.** If the trail has a name, it will
appear as a label.
`;

const editTrailVerticesMD = `
## 4. Trim unwanted sections

Do you only want part of a trail? Split it here.

**Click on a trail at the point where you want to cut it.** This divides
the trail into two separate segments — you'll choose which ones to keep
in the next step.

You can add multiple split points on the same trail, or across different trails.

If you're happy with all your trails as-is, just click **Next** to continue.
`;

const selectSegmentsMD = `
## 5. Deselect the parts you don't want

Each trail section is highlighted. **Click any section to remove it** from
your map.

Leave only the parts you want to keep highlighted.

When you're done, click **Hand off to Ian** or **Open App**.
`;

const handoffMD = `
If you don't want to select any trails, click **Hand off to Ian** or **Open App**.

If you want to select trails, click **back**.
`;

function setTrailsLayerInteraction(map, interactive) {
  try {
    const layerId = 'topojoy-trails-line';
    const sourceId = 'topojoy-trails';
    map.__topojoyTrailsInteractive = interactive;
    map.getCanvas().style.cursor = '';
    map.removeFeatureState({ source: sourceId, layer: layerId });
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
    store.setSelectedtrailSegments(store.selectedTrails);
    store.splitTrailsAtVertices();
    addSegmentLayer(context.map, store);
  };

  const onToSelectTrails = () => {
    store.setInterfaceState(interfaceStates.TRAILS);
    removeVertexLayer(context.map);
    setTrailsLayerInteraction(context.map, true);
  };
  const onToHandoff = () => {
    store.setInterfaceState(interfaceStates.HANDOFF);
  };

  let disposer = null;

  const saveToLocalStorage = () => {
    const linestringFeatures = window.api.data
      .all()
      .map.features.filter((f) => f.geometry.type === 'LineString');
    disposer && disposer();
    localStorage.setItem(
      LS.GEOJSON_SELECTED_TRAIL_SEGMENTS,
      JSON.stringify(store.getSelectedTrailSegments())
    );
    localStorage.setItem(
      LS.GEOJSON_DRAWN_TRAILS,
      JSON.stringify({
        type: 'FeatureCollection',
        features: linestringFeatures
      })
    );
  };

  const onToApp = () => {
    saveToLocalStorage();
    window.location.href = '/app';
  };

  const onToSubmit = () => {
    saveToLocalStorage();
    window.location.href = '/submit';
  };

  const StateToHtml = {
    [interfaceStates.BBOX]: [marked(selectRectMD), () => {}, () => {}],
    [interfaceStates.TRAILS]: [
      marked(selectTrailsMD),
      () => {
        setTrailsLayerInteraction(context.map, true);
      },
      () => {}
    ],
    [interfaceStates.VERTICES]: [
      marked(editTrailVerticesMD),
      () => {
        addVertexLayer(context.map, store);
        setTrailsLayerInteraction(context.map, false);
      },
      () => {
        removeVertexLayer(context.map);
      }
    ],
    [interfaceStates.TRAIL_SECTIONS]: [
      marked(selectSegmentsMD),
      () => {},
      () => {}
    ],
    [interfaceStates.HANDOFF]: [marked(handoffMD), () => {}, () => {}]
  };

  let renderHasBeenCalled = false;

  function render(selection) {
    const container = selection
      .html('')
      .append('div')
      // Make the help panel a flex column so sticky footer behaves well
      .attr('class', 'pad2 prose flex flex-col')
      // Ensure the container forms the scroll context for sticky
      .style('min-height', '100%');
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

      // footer navigation (Back / Next)
      const footer = container
        .append('div')
        .attr(
          'class',
          'mt-4 pt-3 border-t border-gray-200 flex justify-between fixed bottom-0 bg-white'
        );
      // Redundant inline styles to guarantee sticky in case utility classes are unavailable
      // .style('position', 'fixed')
      // .style('bottom', '0')
      // .style('background', 'white');

      const backBtn = footer
        .append('button')
        .attr('id', 'help-back')
        .attr(
          'class',
          'bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1 px-4 rounded disabled:opacity-50'
        )
        .text('Back');

      const nextBtn = footer
        .append('button')
        .attr('id', 'help-next')
        .attr(
          'class',
          'bg-teal-500 hover:bg-teal-400 text-[#071e25] text-xs font-bold py-1 px-4 rounded'
        )
        .text('Next');

      const state = store.interfaceState;

      // configure buttons per state
      if (state === interfaceStates.BBOX) {
        backBtn.property('disabled', true);
        nextBtn.on('click', onToSelectTrails);
        if (store.bbox) {
          nextBtn.property('disabled', false);
          nextBtn.attr(
            'class',
            'bg-teal-500 hover:bg-teal-400 text-[#071e25] text-xs font-bold py-1 px-4 rounded'
          );
        } else {
          nextBtn
            .property('disabled', true)
            .attr(
              'class',
              'bg-gray-200 text-gray-800 text-xs font-bold py-1 px-4 rounded disabled:opacity-50'
            );
        }
      } else if (state === interfaceStates.TRAILS) {
        backBtn.on('click', () =>
          store.setInterfaceState(interfaceStates.BBOX)
        );
        nextBtn.on('click', () => {
          if (store.selectedTrailIndices.size === 0) {
            // No trails selected — nothing to trim, skip straight to segments.
            onToHandoff();
          } else {
            store.setInterfaceState(interfaceStates.VERTICES);
          }
        });
      } else if (state === interfaceStates.VERTICES) {
        backBtn.on('click', onToSelectTrails);
        nextBtn.on('click', onToSelectSegments);
      } else if (state === interfaceStates.HANDOFF) {
        backBtn.on('click', () =>
          store.setInterfaceState(interfaceStates.TRAILS)
        );
        nextBtn
          .text('Hand off to Ian →')
          .attr(
            'class',
            'bg-teal-500 hover:bg-teal-400 text-[#071e25] text-xs font-bold py-1 px-4 rounded'
          )
          .on('click', onToSubmit);
        footer
          .append('button')
          .attr('id', 'help-open-app')
          .attr(
            'class',
            'bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1 px-4 rounded ml-2'
          )
          .text('Open App')
          .on('click', onToApp);
        // Add secondary Open App link
      } else if (state === interfaceStates.TRAIL_SECTIONS) {
        backBtn.on('click', () => {
          store.setInterfaceState(interfaceStates.VERTICES);
        });

        footer
          .append('button')
          .attr('id', 'help-open-app')
          .attr(
            'class',
            'bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1 px-4 rounded ml-2'
          )
          .text('Open App')
          .on('click', onToApp);
        // Replace nextBtn with the primary hand-off CTA
        nextBtn
          .text('Hand off to Ian →')
          .attr(
            'class',
            'bg-teal-500 hover:bg-teal-400 text-[#071e25] text-xs font-bold py-1 px-4 rounded'
          )
          .on('click', onToSubmit);
        // Add secondary Open App link
      }
    };
    update();
    if (!renderHasBeenCalled) {
      renderHasBeenCalled = true;
      disposer = reaction(
        () => [store.interfaceState, store.bbox],
        () => {
          update();
        }
      );
    }
  }

  render.off = function () {};

  return render;
}
