import help from '../panel/help';
import flash from './flash';
import store from '../store';

export default function (context, pane) {
  return function (selection) {
    let mode = null;

    const buttonData = [
      // {
      //   icon: 'code',
      //   title: ' JSON',
      //   alt: 'JSON Source',
      //   behavior: json
      // },
      // {
      //   icon: 'table',
      //   title: ' Table',
      //   alt: 'Edit feature properties in a table',
      //   behavior: table
      // },
      {
        icon: 'question',
        title: ' Help',
        alt: 'Help',
        behavior: help
      },
      {
        icon: 'trash',
        title: ' Clear Data',
        alt: 'Clear TopoJoy selection and overlays',
        behavior: clearTopojoyBehavior
      }
    ];

    const buttons = selection.selectAll('button').data(buttonData, (d) => {
      return d.icon;
    });

    const enter = buttons
      .enter()
      .append('button')
      .attr('class', 'grow')
      .attr('title', (d) => {
        return d.alt;
      })
      .on('click', function (event, d) {
        buttonClick.call(this, d);
      });
    enter.append('i').attr('class', (d) => {
      return `fa-solid fa-${d.icon}`;
    });
    enter.append('span').text((d) => {
      return d.title;
    });

    // d3.select(buttons.node()).dispatch('click');

    buttonClick(buttonData[0]);

    function buttonClick(d) {
      buttons.classed('active', (_) => {
        return d.icon === _.icon;
      });
      if (mode) mode.off();
      console.log(d);
      mode = d.behavior(context);
      pane.call(mode);
    }

    // Behavior: clears TopoJoy bbox/trails and overlays, then returns a no-op mode
    function clearTopojoyBehavior(context) {
      try {
        // 1) Reset in-memory editor state
        store.clearTopojoy();

        // 2) Remove bbox overlay if present
        const bboxSourceId = 'topojoy-bbox';
        const bboxLayerId = 'topojoy-bbox-outline';
        if (context.map.getLayer && context.map.getLayer(bboxLayerId)) {
          context.map.removeLayer(bboxLayerId);
        }
        if (context.map.getSource && context.map.getSource(bboxSourceId)) {
          context.map.removeSource(bboxSourceId);
        }

        // 3) Remove trails overlay if present
        const sourceId = 'topojoy-trails';
        const layerId = 'topojoy-trails-line';
        if (context.map.getLayer && context.map.getLayer(layerId)) {
          context.map.removeLayer(layerId);
        }
        if (context.map.getSource && context.map.getSource(sourceId)) {
          context.map.removeSource(sourceId);
        }

        // 4) Clear persisted bbox from storage (used on recovery)
        if (context.storage?.remove) {
          store.setBBox(null);
        }

        // 5) Notify
        if (context.container) {
          flash(context.container, 'Cleared TopoJoy data.');
        }
      } catch (e) {
        console.error('Failed to clear TopoJoy data', e);
      }

      // return a no-op mode so pane.call() is safe
      function noopMode(selection) {}
      noopMode.off = () => {};
      return noopMode;
    }
  };
}
