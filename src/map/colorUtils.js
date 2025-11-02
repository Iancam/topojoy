import chroma from "chroma-js";
import _ from "lodash";
import {
  randomChoice,
  randomGaussian,
  times,
  weightedRandom,
} from "../lib/map/utils";
export function luminanceContrastRatio(color1, color2) {
  const luminance1 = chroma(color1).luminance();
  const luminance2 = chroma(color2).luminance();

  const brighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (brighter + 0.05) / (darker + 0.05);
}

function hueDistance(color1, color2) {
  const hue1 = chroma(color1).lch()[2];
  const hue2 = chroma(color2).lch()[2];

  let diff = Math.abs(hue1 - hue2);
  // Consider the shorter arc around the color wheel
  if (diff > 180) {
    diff = 360 - diff;
  }

  return diff;
}

export function contrastingLuminance(color, minRatio) {
  const luminance = chroma(color).luminance();

  if (luminance > 0.5) {
    const brighter = luminance;
    // minRatio = (brighter+.05)/(darker+.05)
    // darker+ .05 = brighter + .05/minRatio
    // darker = (brighter + .05)/minRatio - .05
    const darker = Math.max(0, (brighter + 0.05) / minRatio - 0.05);
    return chroma(color).set("hsl.l", darker).hex();
  } else {
    // minRatio = (brighter+.05)/(darker+.05)
    // brighter = minRatio * (darker + .05) - .05
    const darker = luminance;
    const brighter = Math.min(1, minRatio * (darker + 0.05) - 0.05);
    return chroma(color).set("hsl.l", brighter).hex();
  }
}

export function complement(color) {
  return chroma(color)
    .set("hsl.h", (chroma(color).get("hsl.h") + 180) % 360)
    .hex();
}

// color palette
export const p = {
  orange: "#ed9228",
  aquamarine: "#7FFFD4",
  bgBlue: "#004E63", //"#273240"
  fgBlue: "#008080",
  sienna: "#8C5332",
  darkness: "#273240",
  brown: "brown",
  siennaBright: "#BF805C",
  yellow: "#FCD94E",
  ochre: "#D38614",

  white: "#A8FFFF", //"#F2EBDC",
  white2: "#DFEBF2",
  f1: "#014040",
  f2: "#02735E",
  f3: "#03A678",
  f4: "#F27405",
  f5: "#731702",
  f6: "#2323FF",
  f7: "#04D9FF",
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

  lhk1: "#730217",
  lhk2: "#D9ADD6",
  lhk3: "#8F6CD9",
  lhk4: "#BFAA69",
  lhk5: "#678096",

  Lowland1: "#a8d5ba", // Light Green
  Lowland2: "#85bda6", // Mid Green
};

export const colorScales = {
  mint: [
    "#e4f1e1",
    "#b4d9cc",
    "#89c0b6",
    "#63a6a0",
    "#448c8a",
    "#287274",
    "#0d585f",
  ].reverse(),
  sunset: [
    "#fcde9c",
    "#faa476",
    "#f0746e",
    "#e34f6f",
    "#dc3977",
    "#b9257a",
    "#7c1d6f",
  ].reverse(),
  burg: [
    "#ffc6c4",
    "#f4a3a8",
    "#e38191",
    "#cc607d",
    "#ad466c",
    "#8b3058",
    "#672044",
  ].reverse(),
};

export const colorScaleToWeightedPlan = (scale, weight = 1, spread = 25) => {
  if (!scale) throw new Error("Missing color scale");
  if (scale.length === 0) throw new Error("Empty color scale");
  const heightStep = 1 / scale.length;

  return scale.map((color, i) => {
    return {
      height: (i + 1) * heightStep === 1 ? Infinity : (i + 1) * heightStep,
      colors: [color],
      weight,
      spread,
    };
  });
};

/**
 * Plans are composable. Each rule has weight and a set of colors.
 * Colors can be functions, allowing composition of rules
 *
 */
export function mixWeightedPlans(plan1, plan2, weight = 1) {
  const mergeWeightedRules = ([rule1, rule2]) => {
    const w1 = rule1.weight / rule1.colors.length;
    const rule1ColorWeights = times(rule1.colors.length, () => w1);
    const w2 = rule2.weight / rule2.colors.length;
    const rule2ColorWeights = times(rule2.colors.length, () => w2);

    return {
      height: rule1.height || rule2.height,
      spread: rule1.spread || rule2.spread,
      weight,
      colors: () => {
        const color = weightedRandom(
          rule1.colors.concat(rule2.colors),
          rule1ColorWeights.concat(rule2ColorWeights)
        );
        if (typeof color === "function") return color();
        return color;
      },
    };
  };

  if (plan2.length === 1) {
    const plan2Expanded = times(plan1.length, () => plan2[0]);
    return _.zip(plan1, plan2Expanded).map(mergeWeightedRules);
  }

  if (plan1.length !== plan2.length)
    throw new Error("Plans must be the same length");
  return _.zip(plan1, plan2).map(mergeWeightedRules);
}

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
    topo.min + percentOfHeight * topo.magnitude,
    topo.magnitude / gaussDistTightness
  );

export const res = (c) => c._rgb.slice(0, 3);
export const brighten = (c, v) => {
  if (Array.isArray(c)) {
    return c.map((c) => res(chroma(c).brighten(v)));
  }
  return res(chroma(c).brighten(v));
};
export const darken = (c, v) => {
  if (Array.isArray(c)) {
    return c.map((c) => res(chroma(c).darken(v)));
  }
  return res(chroma(c).darken(v));
};

/**
 * Determines the color for a specific pixel on a topographic map based on its height, slope, and aspect.
 * @param {Array<number>} coordinates - The x and y coordinates of the pixel.
 * @param {Object} topo - The topographic data containing pixel information as well as summary info on the map.
 * @param {Array<Array<number>>} topo.pixels - A 2D array where each element represents [height, slope, aspect] of a pixel.
 * @returns {string} - The color assigned to the pixel as a hexadecimal or named color.
 */
export const colorAtFactory = (colorPlanData, topo) => {
  const randHeight = randsFactory(topo);
  const colorPlan = colorPlanData.map(({ height, spread, colors }) => {
    spread = spread || 25;
    const colorFunc = Array.isArray(colors)
      ? () => randomChoice(colors)
      : colors;
    // else if (typeof colors === "function")
    return [
      height === Infinity ? () => Infinity : randHeight(height, spread),
      colorFunc,
    ];
  });
  /**
   * takes a point or value between 0 and 1 and returns the color for that point
   */
  return (point) => {
    let height;
    if (typeof point === "number") {
      height = point * topo.magnitude + topo.min;
    } else {
      const [x, y] = point;
      // height, slope, aspect, shade
      [height] = topo.pixels[y][x];
    }
    for (let [compHeight, clar] of colorPlan) {
      const cmpHeight = compHeight();
      if (height < cmpHeight) {
        const color = typeof clar === "function" ? clar() : clar;
        if (!color) {
          console.log("no color found", { clar, height, color, cmpHeight });
        }
        return color;
      }
    }
    console.log("no color found", { height, colorPlan });
  };
};
