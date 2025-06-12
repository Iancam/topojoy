import { marked } from 'marked';
// const ApiContent = require('../../API.md').default;

const helpMD = `
## 1. Zoom to the area you want to remember

Use the search bar, then zoom and scroll to your specific area.

### Map size

I recommend keeping the map scale, found in the bottom right
corner, below 10km. Any larger and your map will be huge.

## 2. Select the area

Select the rectangle tool to the right of the map. Click and
release to place the first point, then click again to place 
the second point. **Don't click and drag. This moves the map.**

When you've made your selection, <a href="/app.html" class="link-to-app" style="font-size: 1.5rem;"><strong>Click here</strong></a>
`;

export default function () {
  const html = marked(helpMD);

  function render(selection) {
    selection.html('').append('div').attr('class', 'pad2 prose').html(html);
  }

  render.off = function () {};

  return render;
}
