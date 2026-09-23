import { darken, res } from "../map/colorUtils";
import { MapConfig } from "./schema";
import chroma from "chroma-js";
const p = {
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

  Lowland1: "#a8d5ba", // Light Green
  Lowland2: "#85bda6", // Mid Green
};

export const SawtoothConfig: MapConfig = {
  name: "Sawtooth",
  zoomLevel: 13,
  curve: {
    stepCount: 20,
    stepLength: 5,
    density: 1,
  },
  trail: {
    colorRange: [res(chroma(p.f4).mix("grey", 0.4)), p.f5],
    textColor: p.yellow,
    textSize: 3 * 8.001,
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    show: true,
  },
  river: {
    colorRange: [p.f7, p.f6],
    textColor: p.f7,
    textSize: 3 * 8.001,
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    streams: true,
    show: true,
  },
  mountain: {
    labelSize: 3 * 8.001,
    labelColor: "black",
    drop: false,
    iconSize: 4 * 8.001,
    iconColor: "black",
    keepList: [],
    show: true,
  },
  backgroundText: {
    font: "Courier",
    textSize: 3 * 8.001,
    alpha: 200,
    highContrast: false,
    contrast: 7.5,
    groups: [
      {
        text: "",
        bbox: [0, 0, 0, 0],
        elevationRange: [0.7, 1],
      },
    ],
  },

  colorPlan: [
    {
      height: 0.3,
      colors: [p.f1, p.f2],
    },
    {
      height: 0.7,
      colors: [res(chroma(p.f2).mix(p.JuniperBark6, 0.7)), p.f3],
    },
    { height: Infinity, colors: [p.white, p.white2, "pink", p.JuniperBark4] },
  ],
  background: p.darkness,
  crossHatch: false,
};
