function textsLayer(
  topo,
  textSize,
  text,
  bbox = undefined,
  margin = 40,
  heightRange = [0.3, 0.7]
) {
  /**
   * Determines whether a word should be placed at a given position. Allows wrapping
   * around terrain. Checks that the height at the word is within heightRange,
   * and that the x position is not too close to the right edge of the image.
   * @param {Object} topo - The topographic data containing pixel information as well as summary info on the map.
   * @param {number} x - The x coordinate of the word.
   * @param {number} y - The y coordinate of the word.
   * @param {number} wordWidth - The width of the word.
   * @returns {boolean} - Whether the word is visible or not.
   */
  const predicate = (topo, x, y, wordWidth) => {
    const translate = (percentOfHeight) =>
      topo.max - percentOfHeight * topo.magnitude;
    const pix1 = topo.pixels[y]?.[x];
    const pix2 = topo.pixels[y]?.[Math.floor(x + wordWidth)];
    if (x + wordWidth + margin > topo.width) return false;
    if (!pix1 || !pix2) return false;
    const [h1] = pix1;
    const [h2] = pix2;

    const [hmax, hmin] = heightRange.map(translate);
    return h1 < hmax && h1 > hmin && h2 < hmax && h2 > hmin;
  };
  textFont("Courier");
  textAlign(CENTER, CENTER);

  const alpha = 200;
  fillText(topo, text, alpha, textSize, predicate, bbox);
}

function fillText(
  topo,
  inpText,
  alpha,
  size,
  predicate = () => true,
  bbox = [0, 0, width, height],
  margin = 40
) {
  textSize(size);
  noStroke();
  let words = inpText.split(/\s/).reverse();
  let y = bbox[1] + margin;
  let x = bbox[0] + margin;
  let word = words.pop() + " ";
  let wordWidth;
  while (word && y < bbox[3] - margin) {
    wordWidth = Math.ceil(textWidth(word + " "));
    [x, y] = [Math.floor(x), Math.round(y)];
    if (!predicate(topo, x, y, wordWidth)) {
      word.split("").forEach((char) => {
        const pixel = topo.pixels[y][x];
        if (!pixel) return;
        const [h, s, aspect, shade] = pixel;
        const vert = Math.abs(aspect > 90 ? aspect - 180 : aspect) % 180;
        const brightness = vert / 90;
        const col = color(
          res(chroma(colorAt([x, y], topo)).mix("black", shade))
        );
        col.setAlpha(alpha);
        fill(col);
        push();
        const jitter = random(-s * 0.01, s * 0.01);
        translate(x + jitter, y + jitter);
        rotate(radians(aspect / 45));
        text(char, 0, 0);
        pop();
        const charLen = textWidth(char);
        x += Math.ceil(charLen);
      });
      // text(word, x, y);
      word = words.length ? words.pop() + " " : undefined;
    } else x += wordWidth;
    if (x > bbox[2] - margin - wordWidth) {
      y += size;
      x = bbox[0] + margin;
    }
  }
}

function mountainLayer(
  peaks,
  font,
  labelSize,
  mountainLabelColor,
  keepList = [],
  drop = false
) {
  const peaksObj = Object.entries(peaks)
    .filter(([name]) => (drop ? keepList.includes(name) : true))
    .map(([name, [pt]]) => {
      return [name, pt];
    })
    .reduce((obj, [name, pt]) => {
      obj[name] = pt;
      return obj;
    }, {});

  textSize(labelSize);
  textAlign(CENTER, CENTER);
  fill(mountainLabelColor);
  textFont("Courier");
  textStyle(BOLD);
  Object.values(peaks).forEach(([pt]) => {
    text("\u{26F0}", pt[0], pt[1]);
  });

  textFont(font);
  noStroke();

  textStyle(NORMAL);
  placeWithoutCollision(peaksObj, font, keepList);
}

/**
 * Draws labels at their specified points, avoiding collisions with previous labels that have been drawn.
 * @param {Object} labels - A dictionary of labels with their corresponding points.
 * @param {Object} font - p5.Font object used to calculate bounding box of text
 * @param {Array<string>} keepList - List of labels to always keep, even if they collide with other labels.
 * @returns {void}
 */
const placeWithoutCollision = (labels, font, keepList) => {
  let bboxes = [];
  for (const name of keepList || []) {
    const bbox = font.textBounds(name, labels[name][0], labels[name][1]);
    bboxes.push(bbox);
    text(name, labels[name][0], labels[name][1]);
  }

  Object.entries(labels).forEach(([name, pt]) => {
    const bbox = font.textBounds(name, pt[0], pt[1]);
    let skip = false;
    for (const box of bboxes) {
      if (collision(bbox, box)) {
        skip = true;
        break;
      }
    }

    if (!skip) {
      bboxes.push(bbox);
      text(name, pt[0], pt[1]);
    }
  });
};

/**
 * Given a topology `topo`, a collection of coordinates `lines` and
 * a color palette `lineColors`, this function renders the lines on
 * the canvas.  The lines are rendered in a gradient of colors,
 * depending on the slope of the terrain at each point.
 *
 * @param {Object} topo - A topology object, as returned by `processImage`.
 * @param {Array<Object>|Object} lines - A collection of coordinates, where
 *     each element is either an object with a `coords` key containing an
 *     array of xy coordinates, or a plain array of xy coordinates.
 * @param {Array<string>} lineColors - An array of colors to use for the
 *     gradient.  The colors should be in the format `#rrggbb`.
 * @returns {void}
 */
function drawLines(topo, lines, lineColors, weight = 1.5) {
  const slopeScale = chroma.scale(lineColors);
  let Lines = Array.isArray(lines)
    ? lines.map(({ coords }) => coords)
    : Object.values(lines);

  Lines.forEach((coords) => {
    coords.forEach(([x, y], i) => {
      if (x > topo.width || y > topo.height) return;
      const [, slope] = topo.pixels[y][x];
      stroke(...res(slopeScale(slope / 60)), 255);

      drawCurve(
        makeCurve(x, y, abs(randomGaussian(8, 3)), 4, topo, {
          angleTransform: (() => {
            let counter = i;
            return (a) => getAngle([x, y], coords[counter++] || [0, 0]);
          })(),
        }),
        weight
      );
    });
  });
}

/**
 * Given a topology `topo`, and a collection of trail coordinates `trails`
 * this function renders the trails on
 * the canvas.  The trails are rendered in a gradient of colors, depending
 * on the slope of the terrain at each point.  The names of the trails
 * are also rendered in the middle of the trail.
 *
 * @param {Object} topo - A topology object, as returned by `processImage`.
 * @param {Object} trails - A collection of trail coordinates, where each
 *     key is the name of the trail and each value is a list of xy
 *     coordinates.
 */
function trailsLayer(topo, trails, ts, textColor, trailColors, keepList = []) {
  // ## TRAIL LINES ##
  drawLines(topo, trails, trailColors, 3);
  strokeWeight(1);
  // ## TRAIL NAMES ##
  textSize(ts);
  textFont(courier);
  fill(textColor);
  let names = [];
  let labels = {};
  trails.forEach(({ name, coords }) => {
    if (!name) return;
    if (names.includes(name)) return;
    names.push(name);

    const mid = floor(coords.length / 2);
    const pt = coords[mid];
    labels[name.split(" ").join("\n")] = pt;
  });

  placeWithoutCollision(
    labels,
    courier,
    keepList.map((name) => name.split(" ").join("\n"))
  );
}
