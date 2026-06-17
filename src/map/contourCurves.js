export const contourCurvesPath = async (
  sketch,
  boundsGeojson,
  config,
  colorAt,
  curveCount,
) => {
  const { tiles, bounds } = tilesForFeatures(boundsGeojson, config.zoomLevel);
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
