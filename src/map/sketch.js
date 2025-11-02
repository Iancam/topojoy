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
  placeWithoutCollisionFactory,
} from "./layers";
import { drawLines } from "./paths";
import {
  getGeoJSONFromOSM,
  featuresToScreenCoords,
  getFeatures,
} from "./trails";
import { times } from "../lib/map/utils";
import { createWebGLFlowField } from "../contourExploration/terrainFlowField";
import { drawTitle } from "./title";
import chroma from "chroma-js";
import { drawLegend } from "./legend";
export const sketchFactory = (
  boundsGeojson,
  selectedTrails,
  config,
  callback,
  options = {}
) => {
  chroma;
  const { contourLines = false } = options;
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
          config.zoomLevel
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

        Object.values(baseConfigTransforms).forEach((transform) => {
          transform(config);
        });
        config.textSizeMultiplier = Math.pow(2, config.zoomLevel - 13);
        // config.legend = {
        //   ...config.legend,
        //   position: ,
        // };
        const geoJSON = await getGeoJSONFromOSM(bounds.latLngbox);

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

        sketch.background(config.background);

        const features = getFeatures(
          { box: bounds.box, zoom: config.zoomLevel },
          geoJSON
        );
        const userSelectedTrails = selectedTrails.map(
          featuresToScreenCoords(config.zoomLevel, bounds.box, true)
        );

        const collisionHandler = placeWithoutCollisionFactory(sketch);

        if (contourLines) {
          // WARNING: this path is untested
          await contourCurvesPath(
            sketch,
            boundsGeojson,
            config,
            colorAt,
            curveCount
          );
        } else {
          const multiplier = config.backgroundText.highContrast ? 0.6 : 0.8;
          times(
            multiplier * config.curveCount,
            genCurve(sketch, config, topo)
          ).forEach(colorAndDrawCurve(sketch, colorAt));

          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            collisionHandler
          );
          drawLegend(sketch, config, topo, colorAt);
        }
        callback(OGCanvas, sketch);
      };

      const placeLabelsWithoutCollision = (
        config,
        bounds,
        { mountains, rivers, trails, lakes },
        { addLabels }
      ) => {
        drawTitle(
          sketch,
          config.title.text,
          bounds.latLngbox,
          config.background,
          copperplateBold,
          addLabels
        );
        mountainLayer(
          sketch,
          mountains,
          courier,
          {
            ...config.mountain,
            labelSize: config.mountain.labelSize * config.textSizeMultiplier,
          },
          addLabels
        );

        namedLines(
          sketch,
          rivers,
          config.river.keepList || [],
          "river",
          {
            ...config.river,
            font: courier,
            textSize: config.river.textSize * config.textSizeMultiplier,
          },
          addLabels
        );

        namedLines(
          sketch,
          trails,
          config.trail.keepList || [],
          "trail",
          {
            ...config.trail,
            font: courier,
            textSize: config.trail.textSize * config.textSizeMultiplier,
          },
          addLabels
        );

        lakesLabels(
          sketch,
          lakes,
          config.lake.keepList || [],
          {
            font: courier,
            textSize: config.river.textSize * config.textSizeMultiplier,
            textColor: config.river.textColor,
            weight: config.river.weight,
          },
          addLabels
        );
      };

      const drawLayers = (
        config,
        bounds,
        topo,
        colorAt,
        features,
        userSelectedTrails,
        collisionHandler
      ) => {
        if (!config.backgroundText.highContrast)
          textsLayer(sketch, topo, colorAt, collisionHandler.textBoxes(), {
            ...config.backgroundText,
            backgroundColor: config.background,
            textSize:
              config.backgroundText.textSize * config.textSizeMultiplier,
          });
        drawLines(sketch, topo, features.rivers, config.textSizeMultiplier, {
          ...config.river,
          style: "basic",
        });
        drawLines(sketch, topo, features.trails, config.textSizeMultiplier, {
          ...config.trail,
          style: "basic",
        });

        drawLines(sketch, topo, userSelectedTrails, config.textSizeMultiplier, {
          ...config.trail,
          colorRange: [
            config.trail.selectedTrailColor,
            config.trail.selectedTrailColor,
          ],
          style: "basic",
        });
        drawLakes(sketch, features.lakes, {
          color: config.river.colorRange[0],
        });

        placeLabelsWithoutCollision(config, bounds, features, collisionHandler);
        if (config.backgroundText.highContrast) {
          textsLayer(sketch, topo, colorAt, collisionHandler.textBoxes(), {
            ...config.backgroundText,
            textSize:
              config.backgroundText.textSize * config.textSizeMultiplier,
            backgroundColor: config.background,
          });
          times(0.2 * config.curveCount, genCurve(topo)).forEach(
            colorAndDrawCurve(colorAt)
          );
        }

        collisionHandler.drawLabels();
      };

      const genCurve = (sketch, config, topo) => () => {
        const angleTransforms = [
          (aspect) => aspect + 180,
          (aspect) => aspect,
          (aspect) => aspect + 90,
          (aspect) => aspect - 90,
        ];
        const x = Math.floor(sketch.random(0, topo.width - 1));
        const y = Math.floor(sketch.random(0, topo.height - 1));
        const [elevation, slope, aspect, cosIncidence] = topo.pixels[y][x];
        const random = sketch.random();
        if (slope / 70 < random) {
          return null;
        }
        return makeCurve(
          x,
          y,
          config.curve.stepCount,
          config.curve.stepLength,
          topo,
          {
            angleTransform: config.crossHatch
              ? sketch.random(angleTransforms)
              : sketch.random([angleTransforms[0], angleTransforms[1]]),
            // angleTransform: random([angleTransforms[3], angleTransforms[2]]),
            // angleTransform: random(angleTransforms), // make it gridlike
          }
        );
      };
      const colorAndDrawCurve = (sketch, colorAt) => (c) => {
        if (!c) return;
        const col1 = colorAt(c[0]);
        const col = sketch.color(col1);
        col.setAlpha(128);
        sketch.stroke(col);

        drawCurve(sketch, c, 1.8);
      };

      const contourCurvesPath = async (
        sketch,
        boundsGeojson,
        config,
        colorAt,
        curveCount
      ) => {
        const { tiles, bounds } = tilesForFeatures(
          boundsGeojson,
          config.zoomLevel
        );
        const webglCanvas = await stitchMapTiles(tiles, bounds.width, 256, 256);

        const canvasDataUrl = webglCanvas.toDataURL("image/png");
        sketch.loadImage(canvasDataUrl, (img) => {
          console.log("canvas converted to p5.image");
          const flowField = createWebGLFlowField(sketch, img, {
            smoothingFactor: 1,
            mode: "contour",
          });
          drawContourCurves(sketch, flowField, colorAt, {
            numCurves: curveCount * 0.5,
            lineLength: 30,
            strokeWeight: 1.5,
            stepSize: 1,
            jitter: 0,
          });

          drawLayers();
        });
      };

      /**
       * Draw artistic curves that follow the flow field contours
       * @param {p5} sketch - p5.js instance
       * @param {Object} flowField - Flow field object with getAngle method
       * @param {Function} colorFn - Function to map height to color
       * @param {Object} options - Drawing options
       */
      function drawContourCurves(sketch, flowField, colorFn, options = {}) {
        const {
          numCurves = 200,
          lineLength = 100,
          stepSize = 1,
          strokeWeight = 1.8,
          jitter = 0.3,

          randomSeed = null,
        } = options;

        // Set random seed if provided
        const originalSeed = sketch.random(10000);
        if (randomSeed !== null) {
          sketch.randomSeed(randomSeed);
        }

        // Save original stroke settings
        sketch.push();
        sketch.noFill();

        // Generate starting points
        const startPoints = [];
        for (let i = 0; i < numCurves; i++) {
          startPoints.push({
            x: sketch.random(sketch.width),
            y: sketch.random(sketch.height),
          });
        }

        // Draw each curve
        startPoints.forEach((start) => {
          // Create points array for this curve
          const points = [];
          let x = start.x;
          let y = start.y;

          // Follow flow field to generate curve points
          for (let i = 0; i < lineLength; i++) {
            // Add current point
            points.push([x, y]);

            // Get flow direction at this point
            const angle = flowField.getAngle(x, y);
            const jitterAmount = sketch.random(-jitter, jitter);

            // Move along flow direction
            x += Math.cos(angle + jitterAmount) * stepSize;
            y += Math.sin(angle + jitterAmount) * stepSize;

            // Stop if we go out of bounds
            if (x < 0 || x >= sketch.width || y < 0 || y >= sketch.height) {
              break;
            }
          }

          // Only draw if we have enough points
          if (points.length >= 3) {
            // Sample height at the middle of the curve for color
            const midPoint = points[Math.floor(points.length / 2)];
            // const normalizedHeight = flowField.getMagnitude(midPoint[0], midPoint[1]);

            // Get color based on height
            const col = colorFn(midPoint.map((v) => Math.floor(v)));
            sketch.stroke(col);
            sketch.strokeWeight(strokeWeight);

            // Draw the curve with p5's curve function for smoothness
            sketch.beginShape();

            // Add first point twice for proper curve start
            sketch.curveVertex(points[0][0], points[0][1]);

            // Add all points
            points.forEach((p) => {
              sketch.curveVertex(p[0], p[1]);
            });

            // Add last point twice for proper curve end
            sketch.curveVertex(
              points[points.length - 1][0],
              points[points.length - 1][1]
            );

            sketch.endShape();
          }
        });

        // Restore original state
        sketch.randomSeed(originalSeed);
        sketch.pop();
      }
      p5.disableFriendlyErrors = true;
    },
  };
};
