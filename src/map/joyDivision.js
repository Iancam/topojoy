export const joyDivision = (sketch, config, topo, colorAt) => {
  const { spacing = 10, amplitude = 150, xRes = 5 } = config;
  const { width, height, magnitude, min, pixels } = topo;
  sketch.strokeWeight(2);
  sketch.noFill();

  for (let y = 0; y < height; y += spacing) {
    // Pre-compute displaced points for this row
    const pts = [];
    for (let x = 0; x < width; x += xRes) {
      const pixel = pixels[y]?.[x];
      if (!pixel) {
        pts.push(null);
        continue;
      }
      const [elev] = pixel;
      let hnorm = (elev - min) / magnitude;
      hnorm = Math.min(1, Math.max(0, hnorm));
      const eased = hnorm * hnorm * (3 - 2 * hnorm);
      pts.push({ x, Dy: y - amplitude * (eased - 0.5) });
    }

    // Draw segment by segment so each can have its own color
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (!a || !b) continue;
      const col = colorAt ? colorAt([a.x, y]) : "white";
      sketch.stroke(col);
      sketch.line(a.x, a.Dy, b.x, b.Dy);
    }
  }
};
