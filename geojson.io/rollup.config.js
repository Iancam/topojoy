import resolve from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import replace from '@rollup/plugin-replace';
import markdown from '@jackfranklin/rollup-plugin-markdown';
import css from 'rollup-plugin-import-css';
import copy from 'rollup-plugin-copy';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const production = !process.env.ROLLUP_WATCH;

const globalPolyfill = `
var global = typeof window !== 'undefined' ? window : 
             typeof global !== 'undefined' ? global : 
             typeof self !== 'undefined' ? self : 
             typeof this !== 'undefined' ? this : 
             {};
`;

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'geojsonio',
    sourcemap: true,
    strict: false,
    globals: {
      d3: 'd3'
    },
    banner: globalPolyfill
  },
  external: ['d3'],
  plugins: [
    commonjs({
      include: ['./src/**/*', './node_modules/**/*'],
      transformMixedEsModules: true
    }),

    replace({
      'require.main === module': 'false', // jsonhint export quirk
      preventAssignment: true,
      global: 'window'
    }),

    resolve({
      browser: true,
      preferBuiltins: true
    }),

    json(),

    nodePolyfills(),

    markdown(),

    css({
      output: './dist/css/bundle.css',
      minify: production
    }),

    copy({
      targets: [
        {
          src: 'node_modules/@fortawesome/fontawesome-free/webfonts',
          dest: './dist'
        },
        {
          src: 'node_modules/@mapbox/maki/icons',
          dest: './dist'
        },
        {
          src: 'img/marker-chars/*.svg',
          dest: './dist/icons'
        }
      ]
    })
  ]
};
