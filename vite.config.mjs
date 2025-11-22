import path from "path";
import tailwindcss from "@tailwindcss/vite";
import copy from "rollup-plugin-copy";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { plugin as md } from "vite-plugin-markdown";
import { reactRouter } from "@react-router/dev/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "::1",
      "3ca39b6aa3f8.ngrok-free.app",
      "overintense-semicapitalistically-roberta.ngrok-free.dev",
      "devserver-staging--topojoy.netlify.app",
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        geojson: path.resolve(__dirname, "geojson.io/index.html"),
      },
      external: ["d3"],
      output: {
        name: "app",
        globals: {
          d3: "d3",
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    md({ mode: "html" }),
    copy({
      targets: [
        {
          src: path.resolve(__dirname, "assets/Copperplate Light.ttf"),
          dest: path.resolve(__dirname, "dist/assets"),
        },
        {
          src: path.resolve(__dirname, "assets/CourierPrime-Regular.ttf"),
          dest: path.resolve(__dirname, "dist/assets"),
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
