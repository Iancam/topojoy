import { MapConfig } from "../schema";

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

const texts = {
  sangaha: `Giving, kind words, beneficial help,
    & consistency in the face of events,
    in line with what’s appropriate
    in each case, each case.
    These bonds of fellowship (function) in the world
    like the linchpin in a moving cart.
    Now, if these bonds of fellowship were lacking,
    a mother would not receive
    the honor & respect owed by her child,
    nor would a father receive
    what his child owes him.
    But because the wise show regard
    for these bonds of fellowship,
    they achieve greatness
    and are praised.`,
  mangala: `Many devas and human beings
give thought to protection,
desiring well-being.
Tell, then, the highest protection.
The Buddha:
Not consorting with fools,
consorting with the wise,
paying homage to those worthy of homage:
	This is the highest protection.

Living in a civilized land,
having made merit in the past,
directing oneself rightly:
	This is the highest protection.

Broad knowledge, skill,
well-mastered discipline,
well-spoken words:
	This is the highest protection.

Support for one's parents,
assistance to one's wife and children,
consistency in one's work:
	This is the highest protection.

Giving, living in rectitude,
assistance to one's relatives,
deeds that are blameless:
	This is the highest protection.

Avoiding, abstaining from evil;
refraining from intoxicants,
being heedful of the qualities of the mind:
	This is the highest protection.

Respect, humility,
contentment, gratitude,
hearing the Dhamma on timely occasions:
	This is the highest protection.

Patience, compliance,
seeing contemplatives,
discussing the Dhamma on timely occasions:
	This is the highest protection.

Austerity, celibacy,
seeing the Noble Truths,
realizing Unbinding:
	This is the highest protection.

A mind that, when touched
by the ways of the world,
is unshaken, sorrowless, dustless, at rest:
	This is the highest protection.

Everywhere undefeated
when acting in this way,
people go everywhere in well-being:
	This is their highest protection.`,

  netherlands: `High on this mountain
The clouds down below
I'm feeling so strong and alive
From this rocky perch
I'll continue to search
For the wind
And the snow
And the sky
I want a lover
I want some friends
And I want to live in the sun
And I want to do all the things that I
Never have done.
Sunny bright mornings
And pale moonlit nights
Keep me from feeling alone
Now, I'm learning to fly
And this freedom is like
Nothing that I've ever known
I've seen the bottom
And I've been on top
But mostly I've lived in between
And where do you go
When you get to the end of
Your dream?
Off in the nether lands
I heard a sound
Like the beating of heavenly wings
And deep in my brain
I can hear a refrain
Of my soul as she rises and sings
Anthems to glory and
Anthems to love and
Hymns filled with early delight
Like the songs that the darkness
Composes to worship the light.
Once in a vision
I came on some woods
And stood at a fork in the road
My choices were clear
Yet I froze with the fear
Of not knowing which way to go
One road was simple
Acceptance of life
The other road offered sweet peace
When I made my decision
My vision became my release.`,

  HalfMountain: `Now the wind is still
In a moment it will be raging
Now my soul is young
In a moment it will be aging.
And high above the pines
I wrote several lines
And left them in a bottle
For you to find.
Now the dream is rising
In a moment it will be past
This breath is my first
It will all too soon be my last.
And on a windy coast
I made several toasts
To you and me and the sea
And no one heard.
Now the wind is still
In a moment it will be raging
Now my soul is young
In a moment it will be aging.
And high above the pines
I wrote several lines
And left them in a bottle
For you to find.`,
};

const keepList = [
  "Mineral Mountain",
  "Baldy Cinco",
  "La Garita Peak",
  "San Luis Peak",
  "Snow Mesa",
  "Table Mountain",
  "Nelson Mountain",
];

export const SnowMesaConfig: MapConfig = {
  name: "Snow Mesa",
  curve: {
    stepCount: 20,
    stepLength: 5,
    countScalar: 0.5,
  },
  trail: {
    colorRange: [p.f4, p.f5],
    textColor: p.orange,
    textSize: 2 * 8.001,
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    show: true,
  },
  river: {
    colorRange: [p.f7, p.f6],
    stepLength: 4,
    stepCount: 8,
    weight: 1.5,
    streams: false,
    textColor: p.f7,
    textSize: 2 * 8.001,
    show: true,
  },
  mountain: {
    labelSize: 2 * 8.001,
    labelColor: "yellow",
    iconSize: 4 * 8.001,
    iconColor: "black",
    keepList: [],
    drop: true,
    show: true,
  },
  backgroundText: {
    font: "Courier",
    textSize: 2.5 * 8.001,
    bbox: [0, 0, 0, 0],
    alpha: 200,
    text: [texts.HalfMountain, texts.netherlands].join("\n"),
    elevationRange: [0.7, 1],
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
  background: p.darkness,
  crossHatch: false,
};
