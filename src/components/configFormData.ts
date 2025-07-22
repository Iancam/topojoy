export interface FormElements {
  [key: string]: [FormElementType, string, any];
}

export const basicFormElements: FormElements = {
  "backgroundText.text": ["textarea", "the text in the background", ""],
  "backgroundText.elevationRange": [
    "range",
    "the elevations where the background text will be visible",
    [0.7, 1],
  ],
  "backgroundText.highContrast": [
    "boolean",
    "display background text in high contrast",
    false,
  ],
  "curve.density": ["number", "the density of the background curves", 1],
  "mountain.keepList": ["list", "mountains to show", []],
  "mountain.drop": [
    "boolean",
    "if checked, mountains not in the keepList will be dropped",
    false,
  ],
  "title.text": ["text", "the text of the title", ""],

  zoomLevel: ["number", "the zoom level of the map", 13],
} satisfies FormElements;

export const advancedFormElements: FormElements = {
  "trail.stepCount": [
    "number",
    "the length of each curve in the trail. Higher numbers make a thicker trail",
    8,
  ],
  "trail.show": ["boolean", "show/hide trails", true],
  "river.stepCount": [
    "number",
    "the length of each curve in the rivers. Higher numbers make thicker rivers",
    8,
  ],
  "river.streams": ["boolean", "show/hide streams", false],
  "river.show": ["boolean", "show/hide rivers", true],
  "mountain.show": ["boolean", "show/hide mountains", true],
  crossHatch: [
    "boolean",
    "display a crosshatch, as opposed to the standard elevation lines",
    false,
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
