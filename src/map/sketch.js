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

        sketch.background(config.background);

        const features = getFeatures(
          { box: bounds.box, zoom: config.zoomLevel },
          geoJSON,
        );
        const userSelectedTrails = selectedTrails.map(
          featuresToScreenCoords(config.zoomLevel, bounds.box, true),
        );

        const labelManager = labelManagerFactory(sketch);
        if (config.eleVis === "contour") {
          // WARNING: this path is untested
          await contourCurvesPath(
            sketch,
            boundsGeojson,
            config,
            colorAt,
            config.curveCount,
          );
        } else if (config.eleVis === "original") {
          // const multiplier = config.backgroundText.highContrast ? 0.6 : 0.8;
          times(
            0.6 * config.curveCount,
            genCurve(sketch, config, topo),
          ).forEach(colorAndDrawCurve(sketch, colorAt));
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
          );
          if (config.legend?.enabled) drawLegend(sketch, config, topo, colorAt);
        } else if (config.eleVis === "joyDivision") {
          joyDivision(sketch, {}, topo);
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
          );
        } else if (config.eleVis === "dxdy") {
          dxdy(sketch, config, topo, colorAt);
          drawLayers(
            config,
            bounds,
            topo,
            colorAt,
            features,
            userSelectedTrails,
            labelManager,
          );
        } else if (config.eleVis === "JDDots") {
          JDDots();
        }
        callback(
          OGCanvas,
          sketch,
          labelManager.keepLists(),
          labelManager.collisions.object(),
          features,
        );
      };

      const placeLabelsWithoutCollision = (
        config,
        bounds,
        { mountains, rivers, trails, lakes },
        { addLabels },
      ) => {
        drawTitle(
          sketch,
          config.title.text,
          bounds.latLngBox,
          config.background,
          copperplateBold,
          addLabels,
        );
        mountainLayer(
          sketch,
          mountains,
          courier,
          {
            ...config.mountain,
            labelSize: config.mountain.labelSize * config.textSizeMultiplier,
          },
          addLabels,
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
          addLabels,
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
          addLabels,
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
      ) => {
        placeLabelsWithoutCollision(config, bounds, features, labelManager);
        // labelManager.labels().forEach(({ bbox }) => {
        //   sketch.rect(bbox.x, bbox.y, bbox.w, bbox.h);
        // });

        const keepLists = labelManager.keepLists();

        drawLines(
          sketch,
          topo,
          _.pick(features.rivers, keepLists.river),
          config.textSizeMultiplier,
          {
            ...config.river,
            style: "basic",
          },
        );
        drawLines(
          sketch,
          topo,
          _.pick(features.trails, keepLists.trail),
          config.textSizeMultiplier,
          {
            ...config.trail,
            style: "basic",
          },
        );

        drawLines(
          sketch,
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
        drawLakes(sketch, _.pick(features.lakes, keepLists.lake), {
          color: config.river.colorRange[0],
        });

        textsLayer(sketch, topo, colorAt, labelManager.textBoxes(), {
          ...config.backgroundText,
          textSize: config.backgroundText.textSize * config.textSizeMultiplier,
          backgroundColor: config.background,
        });
        times(0.2 * config.curveCount, genCurve(sketch, config, topo)).forEach(
          colorAndDrawCurve(sketch, colorAt),
        );

        labelManager.drawLabels();
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
        // makes curves less likely to be drawn on flat areas
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
          },
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
        curveCount,
      ) => {
        const { tiles, bounds } = tilesForFeatures(
          boundsGeojson,
          config.zoomLevel,
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
              points[points.length - 1][1],
            );

            sketch.endShape();
          }
        });

        // Restore original state
        sketch.randomSeed(originalSeed);
        sketch.pop();
      }

      // topo pixels structure [elevation, dx, dy, cosIncidence]
      const dxdy = (sketch, config, topo, colorAt, dxdyTransform = "none") => {
        const transform = {
          none: (dx, dy) => [dx, dy],
          erosion: (dx, dy) => [-dy, dx],
          crossHatch: (dx, dy) => sketch.random([-dy, dx], [dx, dy]),
        }[dxdyTransform];
        const gradientMakeCurve = (
          length,
          step_length,
          topo,
          dxdyTransform,
        ) => {
          const [x, y] = [
            Math.floor(sketch.random(0, topo.width - 1)),
            Math.floor(sketch.random(0, topo.height - 1)),
          ];
          let curvePoints = [
            [x, y, topo.pixels[y][x][1], topo.pixels[y][x][2]],
          ];
          let last = (array) => array[array.length - 1];
          for (let i = 0; i < length; i++) {
            // normalize dx, dy ?
            const [x, y, dx, dy] = last(curvePoints);
            const [tdx, tdy] = dxdyTransform(dx, dy);
            let mag = Math.sqrt(tdx * tdx + tdy * tdy);
            const maxMag = 1.0;
            if (mag > maxMag) mag = maxMag;
            let [ndx, ndy] = [tdx / mag, tdy / mag];
            if (mag === 0) {
              ndx = 0;
              ndy = 0;
            }

            const [nx, ny] = [
              Math.floor(x + ndx * step_length),
              Math.floor(y + ndy * step_length),
            ];
            if (!topo.pixels[ny]?.[nx]) break;
            const [e2, dx2, dy2] = topo.pixels[ny][nx];
            curvePoints.push([nx, ny, dx2, dy2]);
          }
          return curvePoints;
        };
        const fn = colorAndDrawCurve(sketch, colorAt);
        for (let i = 0; i < config.curveCount * 0.8; i++) {
          fn(
            gradientMakeCurve(
              config.curve.stepCount,
              config.curve.stepLength,
              topo,
              transform,
            ),
          );
        }
      };

      const joyDivision = (sketch, config, topo) => {
        const { spacing = 10, amplitude = 150, xRes = 5 } = config;
        const { width, height, magnitude, min, pixels } = topo;
        console.log(topo);
        sketch.stroke("white");
        sketch.strokeWeight(2);
        sketch.noFill();
        for (let y = 0; y < height; y += spacing) {
          sketch.beginShape();
          for (let x = 0; x < width; x += xRes) {
            let [elev, dx, dy, cosIncidence] = pixels[y][x];
            let hnorm = (elev - min) / magnitude; // normalized 0-1
            hnorm = Math.min(1, Math.max(0, hnorm));
            const eased = hnorm * hnorm * (3 - 2 * hnorm); // smoothstep(0,1,h)
            const Dy = y - amplitude * (eased - 0.5);
            // const Dx = x + dx * amplitude * (eased - 0.5);
            sketch.vertex(x, Dy);
          }
          sketch.endShape();
        }
      };
      p5.disableFriendlyErrors = true;
    },
  };
};
