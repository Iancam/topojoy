// color palette
const p = {
  orange: "#ed9228",
  aquamarine: "#7FFFD4",
  white: "#A8FFFF", //"#F2EBDC",
  bgBlue: "#004E63", //"#273240"
  fgBlue: "#008080",
  sienna: "#8C5332",
  darkness: "#273240",
  brown: "brown",
  siennaBright: "#BF805C",
  yellow: "#FCD94E",
  ochre: "#D38614",
  JuniperBark1: "#DFEBF2",
  JuniperBark2: "#D8E8F2",
  JuniperBark3: "#F2D9BB",
  JuniperBark4: "#BFA995",
  JuniperBark5: "#A69B8D",
  JuniperBark6: "#8C7764",
  JuniperBark7: "#6A6E73",
  JuniperBark8: "#594D43",
  JuniperBark9: "#59372A",
  JuniperBark10: "#0D0D0D",

  Lowland1: "#a8d5ba", // Light Green
  Lowland2: "#85bda6", // Mid Green
};
//   MidElev1: "#659cad", // Teal
//   MidElev2: "#4686a6", // Deep Blue
//   Highland1: "#5b5d7a", // Slate Blue
//   Highland2: "#423d59", // Dark Violet
//   Snow: "#ffffff", // Pure White
//   Rock: "#8b5e34", // Rock Brown
//   Soil: "#6f4a2f", // Dark Earth Brown
//   Shadow: "#3d3d3d", // Shadow Gray
// };

/**
 * A factory that returns a function which generates random heights for a pixel on a topographic map.
 *
 * The returned function takes no arguments and returns a random height that is
 * sampled from a Gaussian distribution with a mean determined by the percent
 * of the map's total height and a standard deviation determined by the
 * tightness of the distribution.
 * A higher percentOfHeight represents a lower elevation
 *
 * @param {max: number, magnitude: number} topo - The topographic data containing pixel information as well as summary info on the map.
 * @param {number} percentOfHeight - The mean height as a percent of the map's total height.
 * @param {number} gaussDistTightness - The standard deviation of the distribution as a multiple of the total height.
 * @returns {function(): number} - A function that generates a random height.
 */
const randsFactory = (topo) => (percentOfHeight, gaussDistTightness) => () =>
  randomGaussian(
    topo.max - percentOfHeight * topo.magnitude,
    topo.magnitude / gaussDistTightness
  );

const res = (c) => c._rgb.slice(0, 3);
const brighten = (c, v) => res(chroma(c).brighten(v));
const darken = (c, v) => res(chroma(c).darken(v));

/**
 * Determines the color for a specific pixel on a topographic map based on its height, slope, and aspect.
 * @param {Array<number>} coordinates - The x and y coordinates of the pixel.
 * @param {Object} topo - The topographic data containing pixel information as well as summary info on the map.
 * @param {Array<Array<number>>} topo.pixels - A 2D array where each element represents [height, slope, aspect] of a pixel.
 * @returns {string} - The color assigned to the pixel as a hexadecimal or named color.
 */
const colorAt = ([x, y], topo) => {
  const [height, slope, aspect] = topo.pixels[y][x];
  // const vert = Math.abs(aspect > 90 ? aspect - 180 : aspect) % 180;
  // const brightness = vert / 90;
  const randHeight = randsFactory(topo);
  /*
   * colorPlan is an array of tuples, where each tuple represents a "rule"
   * for determining the color of a pixel. The first element of the tuple
   * is a function that returns a height value, and the second element is the
   * color to use if the pixel's height is less than that value. Each rule is
   * applied in order, and the first rule that matches determines the color.
   * The rules are defined so that the color will change as the height increases.
   *
   * Confusingly, higher numbers to randHeight's first argument represent lower
   * elevations.
   *
   * To make your own colorPlan, begin with a rule for very low elevations, that
   * always returns Infinity.
   * Then, above it, add rules for elevations you want to highlight. I split mine
   * into low, middle, and high elevations. Begin with simple rules, like always
   * returning the same base color, then expand.
   *
   */
  const colorPlan = [
    // lower elevations
    [
      randHeight(0.7, 25),
      () => random([p.JuniperBark9, p.JuniperBark8, p.JuniperBark10]),
    ],
    //  middle elevations
    [
      randHeight(0.6, 10),
      () => res(chroma.scale([p.JuniperBark3, p.JuniperBark9])(aspect / 360)),
    ],
    [
      randHeight(0.3, 15),
      () =>
        darken(
          random([
            p.JuniperBark4,
            p.JuniperBark5,
            p.JuniperBark6,
            p.JuniperBark7,
          ]),
          0.5
        ),
    ],
    // higher elevations
    [
      () => Infinity,
      () => weightedRandom([p.JuniperBark1, p.JuniperBark3, "pink"], [5, 5, 1]),
    ],
  ];

  for (let [compHeight, clar] of colorPlan) {
    if (height < compHeight()) {
      const color = typeof clar === "function" ? clar() : clar;
      return color;
    }
  }
};
