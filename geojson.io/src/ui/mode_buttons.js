import help from '../panel/help';

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
  };
}
