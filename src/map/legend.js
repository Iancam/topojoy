import { range } from "lodash";

export function drawLegend(sketch, config, topo, colorAt) {
  // const position = [0, 0];
  const textSizeMultiplier = config.textSizeMultiplier * 0.5;
  const legendWidth = 200 * textSizeMultiplier;
  const legendHeight = 300 * textSizeMultiplier;

  const margin = 20 * textSizeMultiplier;
  const padding = 10 * textSizeMultiplier;

  const canvasMargin = 20 * textSizeMultiplier;

  const position = [
    sketch.width - legendWidth - margin - canvasMargin,
    sketch.height - legendHeight - margin + canvasMargin,
  ];

  sketch.push();
  // sketch.translate(config.legend.position[0], config.legend.position[1]);
  sketch.textFont("Courier");
  sketch.fill("black");
  // draw a box with legend on the top center
  sketch.rect(position[0], position[1], legendWidth, legendHeight);

  // do a section for elevation
  // show a vertical section from high to low
  // where the section is a series of lines broken up into
  // sections based on a random sampling from the color scheme
  // show the elevation values at the top and bottom

  const eleHeight = 100 * textSizeMultiplier;
  const eleWidth = 50 * textSizeMultiplier;
  const eleX = position[0] + margin;
  const eleY = position[1] + margin + padding + 20;
  range(1, 0, -0.01).forEach((i) => {
    const color = colorAt(i);
    sketch.stroke(color);
    sketch.strokeWeight(1 * textSizeMultiplier);
    sketch.line(
      eleX,
      eleHeight + eleY - i * eleHeight,
      eleX + eleWidth,
      eleHeight + eleY - i * eleHeight
    );
  });

  sketch.textAlign(sketch.LEFT);
  sketch.fill("white");
  sketch.textSize(12 * textSizeMultiplier);
  sketch.text("Elevation (ft)", eleX, eleY - 12 * textSizeMultiplier);

  const ticks = [0, 0.5, 1];
  sketch.stroke(255, 140);
  sketch.strokeWeight(1 * textSizeMultiplier);
  sketch.textAlign(sketch.LEFT, sketch.CENTER);
  ticks.forEach((t) => {
    const y = eleY + (1 - t) * eleHeight;
    sketch.stroke(255, 140);
    sketch.line(
      eleX + eleWidth + 4 * textSizeMultiplier,
      y,
      eleX + eleWidth + 10 * textSizeMultiplier,
      y
    );
    const elev = Math.round((topo.min + t * (topo.max - topo.min)) * 3.28084);
    sketch.noStroke();
    sketch.fill(255);
    sketch.text(`${elev}`, eleX + eleWidth + 14 * textSizeMultiplier, y);
  });

  // sketch.fill("white");
  // sketch.text(
  //   `${Math.round(topo.max * 3.28084)}ft`,
  //   position[0] + eleWidth + margin + padding,
  //   eleY
  // );

  // sketch.text(
  //   `${Math.round(topo.min * 3.28084)}ft`,
  //   position[0] + eleWidth + margin + padding,
  //   eleY + eleHeight
  // );

  // separator line

  const sepLineHeight = eleHeight + eleY + margin;

  sketch.stroke("white");
  sketch.strokeWeight(1);
  sketch.alpha(128);
  sketch.line(
    position[0] + margin,
    sepLineHeight,
    position[0] + legendWidth - margin,
    sepLineHeight
  );

  // do a section for lineTypes
  const lineTypes = [
    { name: "Trail", color: config.trail.colorRange[0] },
    { name: "Selected Trail", color: config.trail.selectedTrailColor },
    { name: "Water", color: config.river.colorRange[0] },
  ];
  sketch.alpha(255);
  lineTypes.forEach((lineType, i) => {
    sketch.stroke(lineType.color);
    sketch.strokeWeight(2 * textSizeMultiplier);
    const y = sepLineHeight + margin + padding + i * 20 * textSizeMultiplier;
    sketch.line(position[0] + margin, y, position[0] + margin + eleWidth, y);
    sketch.noStroke();
    sketch.text(lineType.name, position[0] + margin + eleWidth + padding, y);
  });
  sketch.pop();
}
