import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BackgroundTextGroupsControl } from "./BackgroundTextGroupsControl";
import { ConfigFormContext } from "./configFormContext";

jest.mock("./ui/dual-range-slider", () => ({ DualRangeSlider: () => null }));

const sketchDimensions = { width: 1600, height: 1200 };
const previewOffset = { left: 320, top: 60 };
const dragStartInPreview = { x: 50, y: 25 };
const dragEndInPreview = { x: 250, y: 175 };

const toClientCoordinates = ({ x, y }: { x: number; y: number }) => ({
  clientX: previewOffset.left + x,
  clientY: previewOffset.top + y,
});

afterEach(() => {
  cleanup();
  document.querySelector('[data-map-preview="true"]')?.remove();
});

it.each([
  {
    name: "quarter-size preview",
    previewDimensions: { width: 400, height: 300 },
    expectedSketchBounds: { left: 200, top: 100, right: 1000, bottom: 700 },
  },
  {
    name: "full-size preview",
    previewDimensions: sketchDimensions,
    expectedSketchBounds: { left: 50, top: 25, right: 250, bottom: 175 },
  },
])(
  "converts a selection on the $name to sketch coordinates",
  ({ previewDimensions, expectedSketchBounds }) => {
    const onFormChange = jest.fn();
    const preview = document.createElement("div");
    preview.dataset.mapPreview = "true";
    const canvas = document.createElement("canvas");
    preview.appendChild(canvas);
    document.body.appendChild(preview);
    canvas.getBoundingClientRect = () => ({
      ...previewOffset,
      ...previewDimensions,
      right: previewOffset.left + previewDimensions.width,
      bottom: previewOffset.top + previewDimensions.height,
      x: previewOffset.left,
      y: previewOffset.top,
      toJSON: () => ({}),
    });
    render(
      <ConfigFormContext.Provider
        value={{ sketchDims: sketchDimensions } as any}
      >
        <BackgroundTextGroupsControl
          form={{
            "backgroundText.groups": [
              { text: "Text", elevationRange: [0.7, 1], bbox: [0, 0, 0, 0] },
            ],
          }}
          onFormChange={onFormChange}
        />
      </ConfigFormContext.Provider>,
    );
    fireEvent.click(screen.getByText("Draw bbox"));
    const overlay = preview.lastElementChild!;
    fireEvent.mouseDown(overlay, toClientCoordinates(dragStartInPreview));
    fireEvent.mouseMove(overlay, toClientCoordinates(dragEndInPreview));
    fireEvent.mouseUp(overlay);
    const { left, top, right, bottom } = expectedSketchBounds;
    expect(onFormChange).toHaveBeenCalledWith({
      "backgroundText.groups": [
        expect.objectContaining({ bbox: [left, top, right, bottom] }),
      ],
    });
    preview.remove();
  },
);
