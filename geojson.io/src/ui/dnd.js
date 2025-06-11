import readDrop from '../lib/readfile.js';
import flash from './flash.js';
import zoomextent from '../lib/zoomextent.js';

export default function (context) {
  d3.select('body')
    .attr('dropzone', 'copy')
    .on(
      'drop.import',
      readDrop((err, gj, warning) => {
        if (err && err.message) {
          flash(context.container, err.message).classed('error', 'true');
        }
        if (gj && gj.features) {
          context.data.mergeFeatures(gj.features);
          if (warning) {
            flash(context.container, warning.message);
          } else {
            flash(
              context.container,
              'Imported ' + gj.features.length + ' features.'
            ).classed('success', 'true');
          }
          zoomextent(context);
        }
        d3.select('body').classed('dragover', false);
      })
    )
    .on('dragenter.import', over)
    .on('dragleave.import', exit)
    .on('dragover.import', over);

  function over() {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    d3.event.dataTransfer.dropEffect = 'copy';
    d3.select('body').classed('dragover', true);
  }

  function exit() {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    d3.event.dataTransfer.dropEffect = 'copy';
    d3.select('body').classed('dragover', false);
  }
}
