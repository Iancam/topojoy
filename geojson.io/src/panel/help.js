import { html as HelpContent } from '../../data/help.md';
// const ApiContent = require('../../API.md').default;

export default function () {
  const html = `${HelpContent}`;

  function render(selection) {
    selection.html('').append('div').attr('class', 'pad2 prose').html(html);
  }

  render.off = function () {};

  return render;
}
