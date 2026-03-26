import { TextDecoder, TextEncoder } from "util";

// Required for React 18/19 act() support in Jest environments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (!global.TextEncoder) {
  // @ts-expect-error node util polyfill for jest/jsdom
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  // @ts-expect-error node util polyfill for jest/jsdom
  global.TextDecoder = TextDecoder;
}
