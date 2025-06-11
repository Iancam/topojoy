/**
 * Create a WebGL accelerated version of the terrain flow field
 * This version computes the entire field using fragment shaders
 * @param {p5} p5 - p5.js instance
 * @param {p5.Graphics | p5.Image | Canvas} heightTexture - height texture
 * @param {Object} options - options
 */
export function createWebGLFlowField(p5, canvas, options = {}) {
  // Define shader code for gradient calculation
  const vertexShader = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  
  void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    gl_Position = positionVec4;
  }
  `;

  const fragmentShader = `
  precision highp float;
  
  uniform sampler2D uTerrainMap;
  uniform vec2 uResolution;
  uniform float uSmoothingFactor;
  uniform bool uContourMode;
  
  varying vec2 vTexCoord;
  
  float decodeElevation(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    
    // Apply Mapbox encoding formula
    // -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
  return -10000.0 + ((r * 256.0 * 256.0 + g * 256.0 + b) * 0.1);
  }

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    
    // Sobel operator for gradient calculation
    vec3 center = texture2D(uTerrainMap, vTexCoord).rgb;
    vec3 tl = texture2D(uTerrainMap, vTexCoord + vec2(-texelSize.x, -texelSize.y)).rgb;
    vec3 t  = texture2D(uTerrainMap, vTexCoord + vec2(0.0, -texelSize.y)).rgb;
    vec3 tr = texture2D(uTerrainMap, vTexCoord + vec2(texelSize.x, -texelSize.y)).rgb;
    vec3 l  = texture2D(uTerrainMap, vTexCoord + vec2(-texelSize.x, 0.0)).rgb;
    vec3 r  = texture2D(uTerrainMap, vTexCoord + vec2(texelSize.x, 0.0)).rgb;
    vec3 bl = texture2D(uTerrainMap, vTexCoord + vec2(-texelSize.x, texelSize.y)).rgb;
    vec3 b  = texture2D(uTerrainMap, vTexCoord + vec2(0.0, texelSize.y)).rgb;
    vec3 br = texture2D(uTerrainMap, vTexCoord + vec2(texelSize.x, texelSize.y)).rgb;
  
    float h_center = decodeElevation(center);
    float h_tl = decodeElevation(tl);
    float h_t = decodeElevation(t);
    float h_tr = decodeElevation(tr);
    float h_l = decodeElevation(l);
    float h_r = decodeElevation(r);
    float h_bl = decodeElevation(bl);
    float h_b = decodeElevation(b);
    float h_br = decodeElevation(br);
    
    // X and Y gradients
    float gx = (-1.0 * h_tl + 1.0 * h_tr + -2.0 * h_l + 2.0 * h_r + -1.0 * h_bl + 1.0 * h_br) / (8.0 * uSmoothingFactor);
    float gy = (-1.0 * h_tl + -2.0 * h_t + -1.0 * h_tr + 1.0 * h_bl + 2.0 * h_b + 1.0 * h_br) / (8.0 * uSmoothingFactor);
    
    // Calculate angle and magnitude
    float angle;
    if (uContourMode) {
      // Follow contour lines (perpendicular to gradient)
      angle = atan(-gx, gy);
    } else {
      // Follow gradient direction
      angle = atan(gy, gx);
    }
    
    float magnitude = sqrt(gx*gx + gy*gy);
    
    // Map angle to RGB color (store in r,g channels)
    // Map magnitude to alpha
    gl_FragColor = vec4(
      (cos(angle) + 1.0) / 2.0,  // Map angle from [-π,π] to [0,1]
      (sin(angle) + 1.0) / 2.0,  // Map angle from [-π,π] to [0,1]
      magnitude,                     // Magnitude in g channel
      1.0                            // Full alpha
    );
  }
  `;

  const { smoothingFactor = 1, mode = "contour" } = options;

  // Create shader and output buffer
  const shader = p5.createShader(vertexShader, fragmentShader);
  const flowFieldTexture = p5.createGraphics(
    canvas.width,
    canvas.height,
    p5.WEBGL
  );

  // Render gradient field to texture
  flowFieldTexture.shader(shader);
  shader.setUniform("uTerrainMap", canvas);
  shader.setUniform("uResolution", [canvas.width, canvas.height]);
  shader.setUniform("uSmoothingFactor", smoothingFactor);
  shader.setUniform("uContourMode", mode === "contour");

  flowFieldTexture.rect(0, 0, canvas.width, canvas.height);

  // Create result texture
  const resultTexture = flowFieldTexture.get();

  // Precompute angle and magnitude arrays for faster CPU access
  const angles = new Array(canvas.height);
  const magnitudes = new Array(canvas.height);

  resultTexture.loadPixels();
  for (let y = 0; y < canvas.height; y++) {
    angles[y] = new Array(canvas.width);
    magnitudes[y] = new Array(canvas.width);

    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      // Convert from [0,1] back to [-π,π]
      const cosComponent = resultTexture.pixels[idx] * 2 - 1;
      const sinComponent = resultTexture.pixels[idx + 1] * 2 - 1;
      angles[y][x] = Math.atan2(sinComponent, cosComponent);
      magnitudes[y][x] = resultTexture.pixels[idx + 2] / 255;
    }
  }

  return {
    width: canvas.width,
    height: canvas.height,
    angles,
    magnitudes,
    resultTexture,
    getAngle: (x, y) => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, canvas.width - 1);
      const y1 = Math.min(y0 + 1, canvas.height - 1);

      const sx = x - x0;
      const sy = y - y0;

      function lerpAngle(a, b, t) {
        while (a < -Math.PI) a += 2 * Math.PI;
        while (a > Math.PI) a -= 2 * Math.PI;
        while (b < -Math.PI) b += 2 * Math.PI;
        while (b > Math.PI) b -= 2 * Math.PI;

        let diff = b - a;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;

        return a + diff * t;
      }

      const a00 = angles[y0][x0];
      const a10 = angles[y0][x1];
      const a01 = angles[y1][x0];
      const a11 = angles[y1][x1];

      const a0 = lerpAngle(a00, a10, sx);
      const a1 = lerpAngle(a01, a11, sx);
      return lerpAngle(a0, a1, sy);
    },

    getMagnitude: (x, y) => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, canvas.width - 1);
      const y1 = Math.min(y0 + 1, canvas.height - 1);

      const sx = x - x0;
      const sy = y - y0;

      const m00 = magnitudes[y0][x0];
      const m10 = magnitudes[y0][x1];
      const m01 = magnitudes[y1][x0];
      const m11 = magnitudes[y1][x1];

      const m0 = m00 * (1 - sx) + m10 * sx;
      const m1 = m01 * (1 - sx) + m11 * sx;

      return m0 * (1 - sy) + m1 * sy;
    },
  };
}
