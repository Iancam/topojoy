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
  getTrails,
  getGeoJSONFromOSM,
  getMountainFeatures,
  getWaterFeatures,
  getLakes,
  getUserSelectedTrails,
} from "./trails";
import { times } from "../libraries/utils";
import { createWebGLFlowField } from "../contourExploration/terrainFlowField";
import { drawTitle } from "./title";
import chroma from "chroma-js";
export const sketchFactory = (
  boundsGeojson,
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
            config.backgroundText.bbox = config.backgroundText.bbox.reduce(
              (a, b) => a + b
            )
              ? config.backgroundText.bbox
              : [0, 0, canvas.width, canvas.height];
          },
        };

        Object.values(baseConfigTransforms).forEach((transform) => {
          transform(config);
        });
        const textSizeMultiplier = Math.pow(2, config.zoomLevel - 13);

        const geoJSON = await getGeoJSONFromOSM(bounds.latLngbox, {
          streams: config.river.streams,
          rivers: config.river.show,
          trails: config.trail.show,
          peaks: config.mountain.show,
          lakes: config.lake.show,
        });

        const curvePixelCount =
          config.curve.stepCount * config.curve.stepLength;
        const curveCount =
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

        const mountains = getMountainFeatures(bounds, geoJSON);
        const waterFeatures = getWaterFeatures(bounds, geoJSON);
        const trails = getTrails(bounds, geoJSON);
        const lakes = getLakes(bounds, geoJSON);
        const userSelectedTrails = getUserSelectedTrails(bounds);

        const genCurve = (topo) => () => {
          const angleTransforms = [
            (aspect) => aspect + 180,
            (aspect) => aspect,
            (aspect) => aspect + 90,
            (aspect) => aspect - 90,
          ];

          return makeCurve(
            Math.floor(sketch.random(0, topo.width - 1)),
            Math.floor(sketch.random(0, topo.height - 1)),
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
        const colorAndDrawCurve = (colorAt) => (c) => {
          const col1 = colorAt(c[0]);
          const col = sketch.color(col1);
          col.setAlpha(128);
          sketch.stroke(col);

          drawCurve(sketch, c, 1.8);
        };

        const { addLabels, drawLabels, textBoxes } =
          placeWithoutCollisionFactory(sketch);

        const placeLabelsWithoutCollision = () => {
          let drawText = true;
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
              labelSize: config.mountain.labelSize * textSizeMultiplier,
            },
            addLabels
          );

          namedLines(
            sketch,
            waterFeatures,
            config.river.keepList || [],
            "river",
            {
              ...config.river,
              font: courier,
              textSize: config.river.textSize * textSizeMultiplier,
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
              textSize: config.trail.textSize * textSizeMultiplier,
            },
            addLabels
          );

          lakesLabels(
            sketch,
            lakes,
            config.lake.keepList || [],
            {
              font: courier,
              textSize: config.river.textSize * textSizeMultiplier,
              textColor: config.river.textColor,
              weight: config.river.weight,
            },
            addLabels
          );
        };
        const drawLayers = () => {
          if (!config.backgroundText.highContrast)
            textsLayer(sketch, topo, colorAt, textBoxes(), {
              ...config.backgroundText,
              backgroundColor: config.background,
              textSize: config.backgroundText.textSize * textSizeMultiplier,
            });
          drawLines(sketch, topo, waterFeatures, textSizeMultiplier, {
            ...config.river,
            style: "watercolor",
          });
          drawLines(sketch, topo, trails, textSizeMultiplier, {
            ...config.trail,
            style: "watercolor",
          });

          drawLines(sketch, topo, userSelectedTrails, textSizeMultiplier, {
            ...config.trail,
            colorRange: [
              chroma("#e91e63").brighten(0.5).hex(),
              chroma("#e91e63").darken(0.5).hex(),
            ],
            style: "watercolor",
          });
          drawLakes(sketch, lakes, { color: config.river.colorRange[0] });

          placeLabelsWithoutCollision();
          if (config.backgroundText.highContrast) {
            textsLayer(sketch, topo, colorAt, textBoxes(), {
              ...config.backgroundText,
              textSize: config.backgroundText.textSize * textSizeMultiplier,
              backgroundColor: config.background,
            });
            times(0.2 * curveCount, genCurve(topo)).forEach(
              colorAndDrawCurve(colorAt)
            );
          }

          drawLabels();
        };

        if (contourLines) {
          const { tiles, bounds } = tilesForFeatures(
            boundsGeojson,
            config.zoomLevel
          );
          const webglCanvas = await stitchMapTiles(
            tiles,
            bounds.width,
            256,
            256
          );

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
        } else {
          const multiplier = config.backgroundText.highContrast ? 0.6 : 0.8;
          times(multiplier * curveCount, genCurve(topo)).forEach(
            colorAndDrawCurve(colorAt)
          );

          drawLayers();
        }
        callback(OGCanvas, sketch);
      };
    },
  };
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
