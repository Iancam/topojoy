export interface ColorPlan {
  height: number;
  colors: string | string[] | ((params: any) => string);
}

export interface Config {
  name: string;
  colorPlan: ColorPlan[];
  curve: {
    stepCount: number;
    stepLength: number;
    density: number;
  };
  trail: {
    stepCount: number;
    stepLength: number;
    colorRange: string[];
    textColor: string;
    textSize: number;
    weight: number;
    show: boolean;
  };
  river: {
    stepCount: number;
    stepLength: number;
    show: boolean;
    streams: boolean;
  };
  mountain: {
    keepList: string[];
    drop: boolean;
    show: boolean;
  };
  backgroundText: {
    text: string;
    bbox: number[];
    elevationRange: number[];
    font: string;
    textSize: number;
    alpha: number;
  };
  crossHatch: boolean;
}

export interface Configs {
  [key: string]: Config;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.js" {
  const content: any;
  export default content;
}

declare module "*.md" {
  export const html: string;
  const value: { html: string };
  export default value;
}
