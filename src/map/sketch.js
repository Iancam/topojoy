import p5 from "p5";
import { processImage, stitchMapTiles, tilesForFeatures } from "./processImage";
import { colorAtFactory } from "./colorUtils";
import {
  mountainLayer,
  textsLayer,
  namedLines,
  makeCurve,
  drawCurve,
  lakesLabels,
  drawLakes,
} from "./layers";
import { labelManagerFactory } from "./labelManager";
import { drawLines } from "./paths";
import {
  getGeoJSONFromOSM,
  featuresToScreenCoords,
  getFeatures,
} from "./trails";
import { textSizeMultiplier, times } from "../lib/map/utils";
import { createWebGLFlowField } from "../contourExploration/terrainFlowField";
import { drawTitle } from "./title";
import chroma from "chroma-js";
import { drawLegend } from "./legend";
import _ from "lodash";
import { joyDivision } from "./joyDivision";
import { dxdy } from "./dxdy";
import { colorAndDrawCurve, genCurve } from "./original";
export const sketchFactory = (
  boundsGeojson,
  selectedTrails,
  config,
  callback,
) => {
  return {
    sketch: (sketch) => {
      let copperplateLight;
      let courier;
      let copperplateBold;
      sketch.preload = function preload() {
        copperplateBold = sketch.loadFont("/assets/Copperplate Bold.otf");
        copperplateLight = sketch.loadFont("/assets/Copperplate Light.ttf");
        courier = sketch.loadFont("/assets/CourierPrime-Regular.ttf");
      };

      sketch.setup = async function setup() {
        const { topo, canvas, bounds } = await processImage(
          boundsGeojson,
          config.zoomLevel,
          {
            joyDivision: "dxdy",
            contour: "slope",
            original: "slope",
            dxdy: "dxdy",
          }[config.eleVis],
        );
        // it feels wrong not enforcing immutable data, but
        // this is significantly simpler, and still easy to reason about
        const baseConfigTransforms = {
          backgroundTextBBox: (config) => {
            config.backgroundText.bbox =
              config.backgroundText.bbox &&
              config.backgroundText.bbox.reduce((a, b) => a + b)
                ? config.backgroundText.bbox
                : [0, 0, canvas.width, canvas.height];
          },
        };
        // console.log({
        //   mtn: config.mountain.keepList,
        //   river: config.river.keepList,
        // });
        Object.values(baseConfigTransforms).forEach((transform) => {
          transform(config);
        });
        config.textSizeMultiplier = textSizeMultiplier(
          canvas.width,
          canvas.height,
        );

        const geoJSON = await getGeoJSONFromOSM(bounds.latLngBox);

        const curvePixelCount =
          config.curve.stepCount * config.curve.stepLength;
        config.curveCount =
          (config.curve.density / curvePixelCount) *
          (canvas.width * canvas.height);
        const colorAt = colorAtFactory(config.colorPlan, topo);

        const OGCanvas = sketch.createCanvas(canvas.width, canvas.height);
        OGCanvas.style("z-index", -1);
        OGCanvas.style("position", "absolute");
        OGCanvas.style("top", 0);
        OGCanvas.style("left", 0);
        OGCanvas.style("pointer-events", "none");

        // --- Create offscreen layers ---
        const w = canvas.width;
        const h = canvas.height;
        const layers = {
          curvesBack: sketch.createGraphics(w, h),
          text: sketch.createGraphics(w, h),
          curvesFront: sketch.createGraphics(w, h),
          overlay: sketch.createGraphics(w, h),
        };

        // Reset default state on each layer to avoid p5 defaults (blue stroke, etc.)
        Object.values(layers).forEach((g) => {
          g.noStroke();
          g.noFill();
        });

        // Main canvas just holds the background fill
        sketch.background(config.background);

        const features = getFeatures(
          { box: bounds.box, zoom: config.zoomLevel },
          geoJSON,
        );
        const userSelectedTrails = selectedTrails.map(
          featuresToScreenCoords(config.zoomLevel, bounds.box, true),
        );

        const labelManager = labelManagerFactory(layers.overlay);

        if (config.eleVis === "contour") {
          // WARNING: this path is untested
          await contourCurvesPath(
            layers.curvesBack,
            boundsGeojson,
            config,
            colorAt,
            config.curveCount,
          );
        } else if (config.eleVis === "original") {
          const allCurves = times(
            config.curveCount,
            genCurve(sketch, config, topo),
          );
          const splitAt = Math.floor(allCurves.length * 0.8);
          allCurves
            .slice(0, splitAt)
            .forEach(colorAndDrawCurve(layers.curvesBack, colorAt));
          allCurves
            .slice(splitAt)
            .forEach(colorAndDrawCurve(layers.curvesFront, colorAt));
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
            layers,
          );
          if (config.legend?.enabled)
            drawLegend(layers.overlay, config, topo, colorAt);
        } else if (config.eleVis === "joyDivision") {
          joyDivision(layers.curvesBack, {}, topo, colorAt);
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
            layers,
          );
        } else if (config.eleVis === "dxdy") {
          dxdy(
            sketch,
            layers.curvesBack,
            layers.curvesFront,
            config,
            topo,
            colorAt,
          );
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
            layers,
          );
        } else if (config.eleVis === "JDDots") {
          JDDots();
        }

        // --- Recomposite helper: re-stamp all layers onto main canvas ---
        const recompose = () => {
          sketch.background(config.background);
          Object.values(layers).forEach((layer) => {
            sketch.image(layer, 0, 0);
          });
        };

        recompose();

        // --- Per-layer redraw functions for partial updates ---
        const redrawTextLayer = (newConfig) => {
          newConfig.textSizeMultiplier = config.textSizeMultiplier;
          // bbox is set once in setup() via baseConfigTransforms — raw form has [0,0,0,0]
          newConfig.backgroundText.bbox = config.backgroundText.bbox;
          layers.text.clear();
          layers.text.noStroke();
          layers.text.noFill();
          textsLayer(layers.text, topo, colorAt, labelManager.textBoxes(), {
            ...newConfig.backgroundText,
            textSize:
              newConfig.backgroundText.textSize * newConfig.textSizeMultiplier,
            backgroundColor: newConfig.background,
          });
          recompose();
        };

        const redrawOverlayLayer = (
          newConfig,
          newFeatures,
          newUserSelectedTrails,
        ) => {
          // textSizeMultiplier is computed once in setup() and never stored in the form
          newConfig.textSizeMultiplier = config.textSizeMultiplier;
          // keepLists are populated — always drop unlisted labels on a partial redraw

          const nCOnfig = { ...newConfig };
          nCOnfig.mountain.drop = true;
          nCOnfig.river.drop = true;
          nCOnfig.trail.drop = true;
          nCOnfig.lake.drop = true;

          layers.overlay.clear();
          layers.overlay.noStroke();
          layers.overlay.noFill();
          const newLabelManager = labelManagerFactory(layers.overlay);
          drawLayers(
            nCOnfig,
            bounds,
            topo,
            colorAt,
            newFeatures || features,
            newUserSelectedTrails || userSelectedTrails,
            newLabelManager,
            layers,
          );
          recompose();
        };

        // Expose layers via callback for future partial redraws
        callback(
          OGCanvas,
          sketch,
          labelManager.keepLists(),
          labelManager.collisions.object(),
          features,
          layers,
          { recompose, redrawTextLayer, redrawOverlayLayer },
        );
      };

      const placeLabelsWithoutCollision = (
        config,
        bounds,
        { mountains, rivers, trails, lakes },
        { addLabels },
        overlay,
      ) => {
        drawTitle(
          overlay,
          config.title.text,
          bounds.latLngBox,
          config.background,
          copperplateBold,
          addLabels,
        );
        mountainLayer(
          overlay,
          mountains,
          courier,
          {
            ...config.mountain,
            labelSize: config.mountain.labelSize * config.textSizeMultiplier,
          },
          addLabels,
        );

        namedLines(
          overlay,
          rivers,
          config.river.keepList || [],
          "river",
          {
            ...config.river,
            font: courier,
            textSize: config.river.textSize * config.textSizeMultiplier,
          },
          addLabels,
        );

        namedLines(
          overlay,
          trails,
          config.trail.keepList || [],
          "trail",
          {
            ...config.trail,
            font: courier,
            textSize: config.trail.textSize * config.textSizeMultiplier,
          },
          addLabels,
        );

        lakesLabels(
          overlay,
          lakes,
          config.lake.keepList || [],
          {
            font: courier,
            textSize: config.river.textSize * config.textSizeMultiplier,
            textColor: config.river.textColor,
            weight: config.river.weight,
          },
          addLabels,
        );
      };

      const drawLayers = (
        config,
        bounds,
        topo,
        colorAt,
        features,
        userSelectedTrails,
        labelManager,
        layers,
      ) => {
        placeLabelsWithoutCollision(
          config,
          bounds,
          features,
          labelManager,
          layers.overlay,
        );

        const keepLists = labelManager.keepLists();
        // labelManager.labels().forEach((label) => {
        //   layers.overlay.push();
        //   layers.overlay.noFill();
        //   layers.overlay.stroke(255, 0, 0);
        //   layers.overlay.strokeWeight(2);
        //   layers.overlay.rect(
        //     label.bbox.x,
        //     label.bbox.y,
        //     label.bbox.w,
        //     label.bbox.h,
        //   );
        //   layers.overlay.pop();
        // });
        drawLines(
          layers.overlay,
          topo,
          _.pick(features.rivers, keepLists.river),
          config.textSizeMultiplier,
          {
            ...config.river,
            style: "basic",
          },
        );
        drawLines(
          layers.overlay,
          topo,
          _.pick(features.trails, keepLists.trail),
          config.textSizeMultiplier,
          {
            ...config.trail,
            style: "basic",
          },
        );

        drawLines(
          layers.overlay,
          topo,
          userSelectedTrails,
          config.textSizeMultiplier * 2,
          {
            ...config.trail,
            colorRange: [
              config.trail.selectedTrailColor,
              config.trail.selectedTrailColor,
            ],
            style: "basic",
          },
        );
        drawLakes(layers.overlay, _.pick(features.lakes, keepLists.lake), {
          color: config.river.colorRange[0],
        });

        textsLayer(layers.text, topo, colorAt, labelManager.textBoxes(), {
          ...config.backgroundText,
          textSize: config.backgroundText.textSize * config.textSizeMultiplier,
          backgroundColor: config.background,
        });

        labelManager.drawLabels();
      };

      p5.disableFriendlyErrors = true;
    },
  };
};
