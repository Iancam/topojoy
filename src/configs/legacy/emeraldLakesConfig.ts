import { darken, res } from "../../map/colorUtils";
import { weightedRandom } from "../../lib/map/utils";
import chroma from "chroma-js";
import { MapConfig } from "../schema";

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

  lhk1: "#730217",
  lhk2: "#D9ADD6",
  lhk3: "#8F6CD9",
  lhk4: "#BFAA69",
  lhk5: "#678096",

  Lowland1: "#a8d5ba", // Light Green
  Lowland2: "#85bda6", // Mid Green
};

const colorScales = {
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

const mountainKeepList = [
  "Vestal Peak",
  "Jagged Mountain",
  "Sunlight Peak",
  "Arrow Peak",
  "Trinity Peaks",
  "Leviathan Peak",
  "Windom Peak",
  "Endlich Mesa",
  "Mount Oso",
  "Amherst Mountain",
];

export const EmeraldLakesConfig: MapConfig = {
  name: "Juniper Bark",
  zoomLevel: 13,
  curve: {
    stepCount: 20,
    stepLength: 5,
    density: 0.5,
  },
  trail: {
    colorRange: [p.JuniperBark9, p.ochre],
    textColor: p.orange,
    textSize: 2 * 10,
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    show: true,
  },
  river: {
    colorRange: [p.bgBlue, p.aquamarine],
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    streams: false,
    textColor: p.f7,
    textSize: 2 * 10,
    show: true,
  },
  mountain: {
    labelSize: 2 * 10,
    labelColor: "yellow",
    iconSize: 4 * 10,
    iconColor: "black",
    keepList: [],
    drop: true,
    show: true,
  },
  backgroundText: {
    font: "Courier",
    textSize: 2.5 * 10,
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
    // lower elevations
    {
      height: 1 - 0.7,
      colors: [p.JuniperBark9, p.JuniperBark8, p.JuniperBark10],
    },
    //  middle elevations
    {
      height: 1 - 0.6,
      colors: () =>
        res(chroma.scale([p.JuniperBark3, p.JuniperBark9])(Math.random())),
    },
    {
      height: 1 - 0.3,
      colors: darken(
        [p.JuniperBark4, p.JuniperBark5, p.JuniperBark6, p.JuniperBark7],
        0.5,
      ),
    },
    // higher elevations
    {
      height: Infinity,
      colors: () =>
        weightedRandom([p.JuniperBark1, p.JuniperBark3, "pink"], [5, 5, 1]),
    },
  ],
  background: p.JuniperBark8,
  crossHatch: false,
};
