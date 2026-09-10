/// <reference types="vite/client" />

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
  export const attributes: Record<string, any>;
  const value: { html: string; attributes: Record<string, any> };
  export default value;
}
