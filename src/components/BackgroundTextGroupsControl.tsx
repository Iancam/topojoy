import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, Plus, MousePointer2 } from "lucide-react";
import { DualRangeSlider } from "./ui/dual-range-slider";
import { useConfigForm } from "./configFormContext";

export type BackgroundTextGroup = {
  text: string;
  elevationRange: [number, number];
  bbox: [number, number, number, number];
  textSize?: number;
};

type Props = {
  form: any;
  onFormChange: (formUpdate: any) => void;
  sketchDims?: { width: number; height: number };
};

const EMPTY_GROUP: BackgroundTextGroup = {
  text: "",
  elevationRange: [0.7, 1],
  bbox: [0, 0, 0, 0],
  textSize: 14,
};

export const BackgroundTextGroupsControl: React.FC<Props> = ({
  form,
  onFormChange,
  sketchDims: providedSketchDims,
}) => {
  const { sketchDims: contextSketchDims } = useConfigForm();
  const sketchDims = providedSketchDims ?? contextSketchDims;
  const groups: BackgroundTextGroup[] = form["backgroundText.groups"] || [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [drawingState, setDrawingState] = useState<{
    index: number;
    start: { x: number; y: number } | null;
    current: { x: number; y: number } | null;
  } | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateGroups = (next: BackgroundTextGroup[]) => {
    onFormChange({ "backgroundText.groups": next });
  };

  const addGroup = () => {
    updateGroups([...groups, { ...EMPTY_GROUP }]);
  };

  const removeGroup = (index: number) => {
    const next = groups.filter((_, i) => i !== index);
    updateGroups(next);
    if (activeIndex === index) {
      setActiveIndex(null);
      setDrawingState(null);
    }
  };

  const updateGroup = (index: number, patch: Partial<BackgroundTextGroup>) => {
    const next = groups.map((g, i) => (i === index ? { ...g, ...patch } : g));
    updateGroups(next);
  };

  const getPreviewContainer = () => {
    return document.querySelector(
      '[data-map-preview="true"]',
    ) as HTMLElement | null;
  };

  const getPreviewImage = (container: HTMLElement) => {
    return (
      (container.querySelector("canvas") as HTMLElement | null) ||
      (container.querySelector("img") as HTMLElement | null)
    );
  };

  const startDraw = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeIndex === null) return;
    const container = getPreviewContainer();
    if (!container) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    console.log("startDraw", { x, y });
    setDrawingState({ index: activeIndex, start: { x, y }, current: { x, y } });
  };

  const moveDraw = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingState) return;
    const container = getPreviewContainer();
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    setDrawingState({ ...drawingState, current: { x, y } });
  };

  const endDraw = () => {
    if (!drawingState) return;
    const container = getPreviewContainer();
    if (!container) {
      setDrawingState(null);
      return;
    }
    const imgEl = getPreviewImage(container);

    const { start, current, index } = drawingState;
    if (!start || !current) {
      setDrawingState(null);
      return;
    }
    const group = groups[index];
    if (!group) return;

    // Determine the bbox relative to the rendered image. If no image has
    // rendered yet we fall back to the container dimensions.
    const referenceRect =
      imgEl?.getBoundingClientRect() || container.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const referenceLeft = referenceRect.left;
    const referenceTop = referenceRect.top;
    const referenceWidth = referenceRect.width;
    const referenceHeight = referenceRect.height;

    const rawX1 = Math.min(start.x, current.x) - referenceLeft;
    const rawY1 = Math.min(start.y, current.y) - referenceTop;
    const rawX2 = Math.max(start.x, current.x) - referenceLeft;
    const rawY2 = Math.max(start.y, current.y) - referenceTop;

    const x1 = Math.max(0, Math.min(rawX1, referenceWidth));
    const y1 = Math.max(0, Math.min(rawY1, referenceHeight));
    const x2 = Math.max(0, Math.min(rawX2, referenceWidth));
    const y2 = Math.max(0, Math.min(rawY2, referenceHeight));

    if (x2 > x1 && y2 > y1) {
      // The stored bbox should be in sketch pixel coordinates. The displayed
      // image may be scaled to fit the container, so scale back up.
      const scaleX =
        sketchDims && sketchDims.width > 0
          ? sketchDims.width / referenceWidth
          : 1;
      const scaleY =
        sketchDims && sketchDims.height > 0
          ? sketchDims.height / referenceHeight
          : 1;
      updateGroup(index, {
        bbox: [
          Math.round(x1 * scaleX),
          Math.round(y1 * scaleY),
          Math.round(x2 * scaleX),
          Math.round(y2 * scaleY),
        ],
      });
    }

    setDrawingState(null);
    setActiveIndex(null);
  };

  useEffect(() => {
    const onMouseUp = () => endDraw();
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [drawingState]);

  const rectStyle = (() => {
    if (!drawingState || !drawingState.start || !drawingState.current)
      return { left: 0, top: 0, width: 0, height: 0 };
    const { start, current } = drawingState;
    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    return {
      left,
      top,
      width,
      height,
    };
  })();

  const previewContainer = getPreviewContainer();
  return (
    <div ref={containerRef} className="relative">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Background Text Groups
          </span>
          <button
            type="button"
            onClick={addGroup}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3 w-3" />
            Add group
          </button>
        </div>

        {groups.length === 0 && (
          <p className="text-xs text-gray-400">
            No background text groups yet.
          </p>
        )}

        <div className="space-y-2">
          {groups.map((group, index) => (
            <div
              key={index}
              className={`rounded border p-2 space-y-2 ${
                activeIndex === index
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">
                  Group {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex(activeIndex === index ? null : index)
                    }
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                      activeIndex === index
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <MousePointer2 className="h-3 w-3" />
                    {activeIndex === index ? "Done drawing" : "Draw bbox"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                className="w-full border border-gray-300 rounded p-2 text-xs"
                rows={3}
                value={group.text}
                placeholder="Enter text to render in the background"
                onChange={(e) => updateGroup(index, { text: e.target.value })}
              />

              <div className="flex items-center gap-2 text-xs">
                <label className="text-gray-600">Text size</label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={group.textSize ?? ""}
                  placeholder="14"
                  onChange={(e) =>
                    updateGroup(index, {
                      textSize: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-20 border border-gray-300 rounded px-1 py-0.5"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Elevation Range
                </label>
                <DualRangeSlider
                  min={0}
                  max={1}
                  step={0.01}
                  value={group.elevationRange}
                  onValueChange={(val) =>
                    updateGroup(index, {
                      elevationRange: val as [number, number],
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {["x1", "y1", "x2", "y2"].map((label, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-gray-500 w-8">{label}</span>
                    <input
                      type="number"
                      value={group.bbox[i]}
                      onChange={(e) => {
                        const next = [...group.bbox] as [
                          number,
                          number,
                          number,
                          number,
                        ];
                        next[i] = Number(e.target.value);
                        updateGroup(index, { bbox: next });
                      }}
                      className="w-full border border-gray-300 rounded px-1 py-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeIndex !== null &&
        previewContainer &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-50 bg-blue-500/5 cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
          >
            {drawingState && rectStyle.width > 0 && rectStyle.height > 0 && (
              <div
                className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                  left: rectStyle.left,
                  top: rectStyle.top,
                  width: rectStyle.width,
                  height: rectStyle.height,
                }}
              />
            )}
          </div>,
          previewContainer,
        )}
    </div>
  );
};
