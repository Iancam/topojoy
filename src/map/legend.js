import { range } from "lodash";

export function drawLegend(sketch, config, colorAt) {
  const position = [sketch.width - 100, 100];

  const legendWidth = 100;
  const legendHeight = 100;

  const margin = 10;
  const padding = 5;

  sketch.fill("black");
  // draw a box with legend on the top center
  sketch.rect(position[0], position[1], legendWidth, legendHeight);

  sketch.fill("white");
  sketch.text("Legend", position[0] + legendWidth / 2, position[1] + margin);

  // do a section for elevation
  // show a vertical section from high to low
  // where the section is a series of lines broken up into
  // sections based on a random sampling from the color scheme
  // show the elevation values at the top and bottom

  range(0, 1, 0.01).forEach((i) => {
    const color = colorAt(i);
    sketch.stroke(color);
    sketch.line(
      position[0] + margin,
      position[1] + margin + i,
      position[0] + margin + legendWidth,
      position[1] + margin + i
    );
  });
  const elevationSectionHeight = legendHeight - margin - padding;
  sketch.text(
    "Elevation",
    position[0] + legendWidth / 2,
    position[1] + margin + padding
  );
}
