import { defineConfig } from 'vite';
import css from 'rollup-plugin-import-css';
import copy from 'rollup-plugin-copy';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import tailwindcss from '@tailwindcss/vite';

const globalPolyfill = `
var global = typeof window !== 'undefined' ? window : 
             typeof global !== 'undefined' ? global : 
             typeof self !== 'undefined' ? self : 
             typeof this !== 'undefined' ? this : 
             {};
`;

export default defineConfig({
  plugins: [
    tailwindcss({
      config: './tailwind.config.cjs'
    })
  ],
  define: {
    global: 'window'
  },
  rollupOptions: {
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
          },
          {
            src: 'src/lib/d3.js',
            dest: './dist/lib'
          }
        ]
      })
      // css({ output: 'dist/css/bundle.css', minify: true })
    ]
  }
});
