import { marked } from 'marked';
// const ApiContent = require('../../API.md').default;

const helpMD = `
## 1. Zoom to the area you want to remember

Use the search bar in the top right corner to find the general area you're looking for. Then, zoom and scroll to your specific area.

### Map size

Maps look best when they're rendered at a constant, high zoom level to capture detail. I recommend keeping the map scale, found in the bottom right corner, below 10km. Any larger and your map will be huge.

## 2. Select the area

Select the rectangle tool to the right of the map. Then, select the rectangular area that will become your map.

**Don't click and drag. This moves the map. Instead, click and release to place the first point, then click again to place the second point.**

When you've made your selection,

<a href="/app.html" class="link-to-app"><strong>Click here</strong></a>
`;

export default function () {
  const html = marked(helpMD);

  function render(selection) {
    selection.html('').append('div').attr('class', 'pad2 prose').html(html);
  }

  render.off = function () {};

  return render;
}
