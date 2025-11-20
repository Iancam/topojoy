import { Component } from "react";
import { ColorPlan } from "./ColorPlan";
import { ConfigSelect } from "./ConfigSelect";
import type { MapConfig } from "@/configs/schema";

// Props passed to advanced form components (e.g., ColorPlan)
export interface AdvancedFormElementProps {
  config: string;
  configs: { [key: string]: MapConfig };
  renderFormElement: (props: any) => React.ReactNode;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFormChange: (key: string, value: any) => void;
  form: any;
}

export interface FormElements {
  [key: string]:
    | [FormElementType, string, any, string]
    | [FormElementType, string, any, string, { [key: string]: any }];
}

export const formJourney: {
  title: string;
  description: string;
  formElements: (string | React.ComponentType<any>)[];
  advanced?: (string | React.ComponentType<any>)[];
}[] = [
  {
    title: "Basics",
    description: `Add a title, choose a color scheme, set the curve density, and adjust the zoom level.`,
    formElements: [
      ConfigSelect,
      "filename",
      "title.text",
      "curve.density",
      "zoomLevel",
    ],
  },
  {
    title: "features",
    description: `Choose which features to show on the map.`,
    formElements: [
      "forceCollisionDetection",
      "mountain.keepList",
      "trail.keepList",
      "river.keepList",
      "lake.keepList",
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
    title: "Misc.",
    description: `Choose other options for the map.`,
    formElements: ["crossHatch", "legend.enabled"],
    advanced: [ColorPlan],
  },
];

export const basicFormElements: FormElements = {
  forceCollisionDetection: [
    "boolean",
    "force collision detection, overrides keepList",
    false,
    "Force Collision Detection",
  ],
  filename: ["text", "the unique 'filename' of the map", "", "Filename"],
  "legend.enabled": ["boolean", "show/hide legend", false, "Show Legend"],
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
  "mountain.keepList": ["list", "mountains to show", [], "Mountain Keep List"],
  "mountain.drop": [
    "boolean",
    "if checked, mountains not in the keepList will be dropped",
    false,
    "Remove Mountains Not in Keep List",
  ],
  "lake.keepList": ["list", "lakes to show", [], "Lake Keep List"],
  "lake.drop": [
    "boolean",
    "if checked, lakes not in the keepList will be dropped",
    false,
    "Remove Lakes Not in Keep List",
  ],
  "lake.show": ["boolean", "show/hide lakes", false, "Show Lakes"],
  "trail.keepList": ["list", "trails to show", [], "Trail Keep List"],
  "trail.drop": [
    "boolean",
    "if checked, trails not in the keepList will be dropped",
    false,
    "Remove Trails Not in Keep List",
  ],
  "river.keepList": ["list", "rivers to show", [], "River Keep List"],
  "river.drop": [
    "boolean",
    "if checked, rivers not in the keepList will be dropped",
    false,
    "Remove Rivers Not in Keep List",
  ],

  "curve.density": [
    "number",
    "the density of the background curves",
    1,
    "Curve Density",
  ],
  zoomLevel: [
    "number",
    "the zoom level of the map",
    13,
    "Zoom Level",
    { min: 12, max: 15 },
  ],
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
