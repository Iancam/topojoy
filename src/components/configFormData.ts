import { Component } from "react";
import { ColorPlan } from "./ColorPlan";
import { ConfigSelect } from "./ConfigSelect";

export interface FormElements {
  [key: string]: [FormElementType, string, any, string];
}

export const formJourney: {
  title: string;
  description: string;
  formElements: (string | Function)[];
}[] = [
  {
    title: "Basics",
    description: `Add a title to the map, and choose a color scheme.`,
    formElements: ["title.text", ConfigSelect],
  },
  {
    title: "features",
    description: `Choose which features to show on the map.`,
    formElements: [
      "mountain.show",
      "river.show",
      "river.streams",
      "trail.show",
      "lakes.show",
    ],
  },
  {
    title: "Background Text",
    description: `Add text to be shown in the background like quotes,
     lyrics, or poetry. Choose the elevation band that the text will
      be visible in, and choose whether to display it in high contrast.`,
    formElements: [
      "backgroundText.text",
      "backgroundText.elevationRange",
      "backgroundText.highContrast",
    ],
  },
  {
    title: "Color Plan",
    description: `Modify the elevation bands associated with each color set in the color plan.`,
    formElements: [ColorPlan],
  },
  {
    title: "zoomLevel",
    description: `Choose the zoom level of the map. Probably best to choose from 13, 14, and 15.`,
    formElements: ["zoomLevel"],
  },
  {
    title: "Misc.",
    description: `Choose other options for the map.`,
    formElements: [
      "mountain.keepList",
      "mountain.drop",
      "curve.density",
      "crossHatch",
    ],
  },
];

export const basicFormElements: FormElements = {
  "lakes.show": ["boolean", "show/hide lakes", false, "Show Lakes"],
  "backgroundText.text": ["textarea", "the text in the background", "", "Text"],
  "backgroundText.elevationRange": [
    "range",
    "the elevations where the background text will be visible",
    [0.7, 1],
    "Elevation Range",
  ],
  "backgroundText.highContrast": [
    "boolean",
    "display background text in high contrast",
    false,
    "High Contrast",
  ],
  "title.text": ["text", "the text of the title", "", "Title"],

  "river.streams": ["boolean", "show/hide streams", false, "Show Streams"],
  "river.show": ["boolean", "show/hide rivers", true, "Show Rivers"],
  "mountain.show": ["boolean", "show/hide mountains", true, "Show Mountains"],
  "trail.show": ["boolean", "show/hide trails", true, "Show Trails"],
  "mountain.keepList": ["list", "mountains to show", [], "MountainKeep List"],
  "mountain.drop": [
    "boolean",
    "if checked, mountains not in the keepList will be dropped",
    false,
    "Remove Mountains Not in Keep List",
  ],

  "curve.density": [
    "number",
    "the density of the background curves",
    1,
    "Curve Density",
  ],
  zoomLevel: ["number", "the zoom level of the map", 13, "Zoom Level"],
} satisfies FormElements;

export const advancedFormElements: FormElements = {
  "trail.stepCount": [
    "number",
    "the length of each curve in the trail. Higher numbers make a thicker trail",
    8,
    "Trail Thickness",
  ],
  "river.stepCount": [
    "number",
    "the length of each curve in the rivers. Higher numbers make thicker rivers",
    8,
    "River Thickness",
  ],

  crossHatch: [
    "boolean",
    "display a crosshatch, as opposed to the standard elevation lines",
    false,
    "Crosshatch",
  ],
};

export const formElements = {
  ...basicFormElements,
  ...advancedFormElements,
};

export type FormElementType =
  | "number"
  | "boolean"
  | "list"
  | "range"
  | "slider"
  | "textarea"
  | "text";
