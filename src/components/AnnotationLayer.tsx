import React, { useRef, useState, useEffect } from "react";

export type Annotation = {
  id: string;
  /** Normalised position: 0–1 relative to the image container */
  xRatio: number;
  yRatio: number;
  text: string;
  fontSize: number;
  color: string;
};

type Props = {
  annotations: Annotation[];
  annotationsMode: boolean;
  containerWidth: number;
  containerHeight: number;
  /** Display scale factor: containerWidth / referenceWidth. Defaults to 1. */
  scale?: number;
  onChange: (annotations: Annotation[]) => void;
};

export const AnnotationLayer: React.FC<Props> = ({
  annotations,
  annotationsMode,
  containerWidth,
  containerHeight,
  scale = 1,
  onChange,
}) => {
  console.log(annotationsMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleLayerClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!annotationsMode) return;
    // Ignore clicks that bubble up from text/input elements
    if ((e.target as SVGElement).closest("[data-annotation]")) return;

    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const id = `ann-${Date.now()}`;
    const newAnnotation: Annotation = {
      id,
      xRatio,
      yRatio,
      text: "Label",
      fontSize: 14,
      color: "#ffffff",
    };
    const next = [...annotations, newAnnotation];
    onChange(next);
    setEditingId(id);
  };

  const updateAnnotation = (id: string, patch: Partial<Annotation>) => {
    onChange(annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAnnotation = (id: string) => {
    onChange(annotations.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
  };

  if (!containerWidth || !containerHeight) return null;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: containerWidth,
        height: containerHeight,
        pointerEvents: annotationsMode ? "all" : "none",
        cursor: annotationsMode ? "crosshair" : "default",
        overflow: "visible",
        zIndex: 10,
      }}
      onClick={handleLayerClick}
    >
      {annotations.map((ann) => {
        const x = ann.xRatio * containerWidth;
        const y = ann.yRatio * containerHeight;
        const isEditing = editingId === ann.id;

        return (
          <g
            key={ann.id}
            data-annotation="true"
            transform={`translate(${x}, ${y})`}
            onClick={(e) => {
              e.stopPropagation();
              if (annotationsMode) setEditingId(ann.id);
            }}
          >
            {/* Drop shadow filter */}
            <defs>
              <filter
                id={`shadow-${ann.id}`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="1.5"
                  floodOpacity="0.5"
                />
              </filter>
            </defs>

            {/* Pin dot */}
            <circle
              cx={0}
              cy={0}
              r={4 * scale}
              fill={ann.color}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={1}
              style={{ cursor: annotationsMode ? "pointer" : "default" }}
            />

            {isEditing ? (
              // Inline foreign-object editor
              <foreignObject
                x={6 * scale}
                y={-((ann.fontSize * scale) / 2 + 4 * scale)}
                width={180 * scale}
                height={(ann.fontSize + 12) * scale}
                style={{ overflow: "visible" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "rgba(0,0,0,0.65)",
                    borderRadius: 4,
                    padding: "2px 4px",
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={ann.text}
                    onChange={(e) =>
                      updateAnnotation(ann.id, { text: e.target.value })
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape")
                        setEditingId(null);
                    }}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: ann.color,
                      fontSize: ann.fontSize * scale,
                      fontFamily: "'Courier New', Courier, monospace",
                      minWidth: 60 * scale,
                    }}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeAnnotation(ann.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f87171",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                    title="Remove annotation"
                  >
                    ×
                  </button>
                </div>
              </foreignObject>
            ) : (
              <text
                x={6 * scale}
                y={(ann.fontSize * scale) / 4}
                fontSize={ann.fontSize * scale}
                fill={ann.color}
                fontFamily="'Courier New', Courier, monospace"
                style={{
                  pointerEvents: annotationsMode ? "all" : "none",
                  cursor: annotationsMode ? "pointer" : "default",
                  userSelect: "none",
                  filter: `url(#shadow-${ann.id})`,
                }}
              >
                {ann.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
