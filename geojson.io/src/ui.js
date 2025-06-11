import buttons from './ui/mode_buttons';
// import file_bar from './ui/file_bar';
import dnd from './ui/dnd';
import // userUi = require('./ui/user'),
layer_switch from './ui/layer_switch';
import projection_switch from './ui/projection_switch';

export default ui;

function ui(context) {
  function init(selection) {
    const container = selection
      .append('div')
      .attr(
        'class',
        'ui-container grow flex-shrink-0 flex flex-col md:flex-row w-full relative overflow-x-hidden'
      );

    const map = container
      .append('div')
      .attr('id', 'map')
      .attr(
        'class',
        'map grow shrink-0 top-0 bottom-0 left-0 basis-0 transition-all duration-300'
      )
      .call(layer_switch(context))
      .call(projection_switch(context));

    // sidebar handle
    map
      .append('div')
      .attr(
        'class',
        'sidebar-handle absolute right-0 bottom-9 px-4 bg-white cursor-pointer hidden md:block z-10'
      )
      .attr('title', 'Toggle Sidebar')
      .on('click', () => {
        const collapsed = !d3.select('.map').classed('md:basis-full');
        d3.select('.map').classed('md:basis-0', !collapsed);
        d3.select('.map').classed('md:basis-full', collapsed);

        d3.select('.sidebar-handle-icon')
          .classed('fa-caret-left', collapsed)
          .classed('fa-caret-right', !collapsed);

        setTimeout(() => {
          context.map.resize();
        }, 300);
      })
      .append('i')
      .attr('class', 'sidebar-handle-icon fa-solid fa-caret-right');

    context.container = container;

    return container;
  }

  function render(selection) {
    const container = init(selection);

    const right = container
      .append('div')
      .attr(
        'class',
        'right flex flex-col overflow-x-hidden bottom-0 top-0 right-0 box-border bg-white relative grow-0 shrink-0 w-full md:w-2/5 md:max-w-md h-2/5 md:h-auto'
      );

    const top = right
      .append('div')
      .attr('class', 'top border-b border-solid border-gray-200');

    const pane = right.append('div').attr('class', 'pane group');

    // user ui, disabled for now
    // top
    //     .append('div')
    //     .attr('class', 'user fr pad1 deemphasize')
    //     .call(userUi(context));

    top
      .append('div')
      .attr('class', 'buttons flex')
      .call(buttons(context, pane));

    // container
    //   .append('div')
    //   .attr('class', 'file-bar hidden md:block')
    //   .call(file_bar(context));

    dnd(context);

    // initialize the map after the ui has been created to avoid flex container size issues
    context.map();
  }

  return {
    read: init,
    write: render
  };
}
