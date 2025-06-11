import { plugin as Markdown, Mode } from 'vite-plugin-markdown';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [Markdown({ mode: [Mode.HTML] })],
  define: {
    global: 'window'
  }
  // assetsInclude: ['**/*.md']
});
