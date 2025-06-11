import message from './message';

export default flash;

function flash(selection, txt) {
  'use strict';

  const msg = message(selection);

  if (txt) msg.select('.content').html(txt);

  setTimeout(() => {
    msg.transition().style('opacity', 0).remove();
  }, 5000);

  return msg;
}
