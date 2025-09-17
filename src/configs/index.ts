import { MapConfig } from "@/configs/schema";
import chroma from "chroma-js";
import { createConfig } from "./factory";
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

export const snowMesaConfig = createConfig({
  name: "Snow Mesa",
  background: p.darkness,
  trail: {
    colorRange: [p.f4, p.f5],
    textColor: p.orange,
  },
  river: {
    colorRange: [p.f7, p.f6],
    streams: false,
    textColor: p.f7,
  },
  mountain: {
    labelColor: "yellow",
  },
  colorPlan: [
    { height: 1 - 1.1, colors: [p.orange, p.aquamarine] },
    { height: 1 - 0.9, colors: p.sienna },
    { height: 1 - 0.8, colors: [p.orange, p.siennaBright, p.sienna] },

    { height: 1 - 0.65, colors: ["#53C1EB", p.fgBlue, p.darkness] },
    { height: 1 - 0.3, colors: chroma(p.fgBlue).darken(1).hex() },
    { height: 1 - 0.3, colors: p.white },

    { height: 1 - 0.1, colors: [p.white, p.siennaBright, p.aquamarine] },
    { height: 1 - 0.1, colors: [p.white, p.siennaBright, p.aquamarine] },
    {
      height: Infinity,
      colors: [p.white, p.siennaBright, p.aquamarine, "pink"],
    },
  ],
});

export const emeraldLakesConfig = createConfig({
  name: "Juniper Bark",
  background: p.JuniperBark8,
  trail: {
    colorRange: [p.JuniperBark9, p.ochre],
    textColor: p.orange,
  },
  river: {
    colorRange: [p.bgBlue, p.aquamarine],
    streams: false,
    textColor: p.f7,
  },
  mountain: {
    labelColor: "yellow",
  },
  colorPlan: [
    {
      height: 1 - 0.7,
      colors: [p.JuniperBark9, p.JuniperBark8, p.JuniperBark10],
    },

    {
      height: 1 - 0.6,
      colors: [p.JuniperBark7, p.JuniperBark6, p.JuniperBark5],
    },

    {
      height: 1 - 0.3,
      colors: [p.JuniperBark4, p.JuniperBark3, p.JuniperBark2],
    },

    {
      height: Infinity,
      colors: [p.JuniperBark1, p.JuniperBark2, "pink", p.JuniperBark4],
    },
  ],
});
